/**
 * JSON 错误诊断与容错解析
 * 使用 jsonc-parser（VS Code 同款）进行错误诊断和部分 AST 构建
 */
import {
  parse as parseJsonc,
  getLocation,
  createScanner,
  visit,
  parseTree,
} from "jsonc-parser";

// 本地常量替代 jsonc-parser 的 const enum（兼容 verbatimModuleSyntax / erasableSyntaxOnly）
const ScanError = {
  None: 0,
  UnexpectedEndOfComment: 1,
  UnexpectedEndOfString: 2,
  UnexpectedEndOfNumber: 3,
  InvalidUnicode: 4,
  InvalidEscapeCharacter: 5,
  InvalidCharacter: 6,
} as const;

const ParseErrorCode = {
  InvalidSymbol: 1,
  InvalidNumberFormat: 2,
  PropertyNameExpected: 3,
  ValueExpected: 4,
  ColonExpected: 5,
  CommaExpected: 6,
  CloseBraceExpected: 7,
  CloseBracketExpected: 8,
  EndOfFileExpected: 9,
  InvalidCommentToken: 10,
  UnexpectedEndOfComment: 11,
  UnexpectedEndOfString: 12,
  UnexpectedEndOfNumber: 13,
  InvalidUnicode: 14,
  InvalidEscapeCharacter: 15,
  InvalidCharacter: 16,
} as const;

export interface JsonDiagnosticError {
  position: number;
  length: number;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  type: string;
  message: string;
  suggestion: string;
  severity: "error" | "warning";
}

export interface JsonFix {
  position: number;
  length: number;
  replacement: string;
  description: string;
}

export interface LenientParseResult {
  success: boolean;
  parsed?: unknown;
  errors: JsonDiagnosticError[];
  fixes: JsonFix[];
  fixedText?: string;
}

// ScanError 到诊断类型的映射
const scanErrorInfo: Record<number, { type: string; message: string; suggestion: string }> = {
  [ScanError.UnexpectedEndOfComment]: {
    type: "unexpected_end_of_comment",
    message: "注释未正确结束",
    suggestion: "添加 */ 结束块注释",
  },
  [ScanError.UnexpectedEndOfString]: {
    type: "unexpected_end_of_string",
    message: "字符串未闭合",
    suggestion: '在字符串末尾添加匹配的双引号 "',
  },
  [ScanError.UnexpectedEndOfNumber]: {
    type: "unexpected_end_of_number",
    message: "数字不完整",
    suggestion: "补全数字",
  },
  [ScanError.InvalidUnicode]: {
    type: "invalid_unicode",
    message: "Unicode 转义序列无效",
    suggestion: "使用 \\uXXXX 格式，X 为十六进制数字",
  },
  [ScanError.InvalidEscapeCharacter]: {
    type: "invalid_escape_character",
    message: "包含无效的转义字符",
    suggestion: '使用合法转义: \\", \\, \/, \\b, \\f, \\n, \\r, \\t',
  },
  [ScanError.InvalidCharacter]: {
    type: "invalid_character",
    message: "存在无效的字符",
    suggestion: "删除非法字符",
  },
};

// ParseErrorCode 到诊断类型的映射（使用数字 key，避免常量名不匹配问题）
// jsonc-parser 实际值：1=InvalidSymbol, 2=InvalidNumberFormat, 3=PropertyNameExpected,
// 4=ValueExpected, 5=ColonExpected, 6=CommaExpected, 7=CloseBraceExpected,
// 8=CloseBracketExpected, 9=EndOfFileExpected, 10=InvalidCommentToken,
// 11=UnexpectedEndOfComment, 12=UnexpectedEndOfString, 13=UnexpectedEndOfNumber,
// 14=InvalidUnicode, 15=InvalidEscapeCharacter, 16=InvalidCharacter
const parseErrorInfo: Record<number, { type: string; message: string; suggestion: string }> = {
  [ParseErrorCode.InvalidSymbol]: {
    type: "invalid_symbol",
    message: "存在无效的符号",
    suggestion: "检查该位置的语法是否符合 JSON 规范",
  },
  [ParseErrorCode.InvalidNumberFormat]: {
    type: "invalid_number",
    message: "数字格式无效",
    suggestion: "检查数字格式，确保符合 JSON 数字规范",
  },
  [ParseErrorCode.PropertyNameExpected]: {
    type: "property_name_unquoted",
    message: "属性名缺少双引号或格式错误",
    suggestion: "为属性名添加双引号",
  },
  [ParseErrorCode.ValueExpected]: {
    type: "value_expected",
    message: "此处缺少值",
    suggestion: "添加正确的 JSON 值（字符串、数字、对象、数组、布尔值或 null）",
  },
  [ParseErrorCode.ColonExpected]: {
    type: "colon_expected",
    message: "缺少冒号",
    suggestion: "在属性名和值之间添加冒号 :",
  },
  [ParseErrorCode.CommaExpected]: {
    type: "comma_expected",
    message: "缺少逗号",
    suggestion: "在元素之间添加逗号 ,",
  },
  [ParseErrorCode.CloseBraceExpected]: {
    type: "close_brace_expected",
    message: "缺少右大括号",
    suggestion: "添加 } 结束对象",
  },
  [ParseErrorCode.CloseBracketExpected]: {
    type: "close_bracket_expected",
    message: "缺少右中括号",
    suggestion: "添加 ] 结束数组",
  },
  [ParseErrorCode.EndOfFileExpected]: {
    type: "end_of_file_expected",
    message: "多余的内容",
    suggestion: "删除 JSON 末尾多余的内容",
  },
  [ParseErrorCode.InvalidCommentToken]: {
    type: "invalid_comment",
    message: "JSON 不支持注释",
    suggestion: "删除注释内容",
  },
  [ParseErrorCode.UnexpectedEndOfComment]: {
    type: "unexpected_end_of_comment",
    message: "注释未正确结束",
    suggestion: "添加 */ 结束块注释",
  },
  [ParseErrorCode.UnexpectedEndOfString]: {
    type: "unexpected_end_of_string",
    message: "字符串未闭合",
    suggestion: '在字符串末尾添加匹配的双引号 "',
  },
  [ParseErrorCode.UnexpectedEndOfNumber]: {
    type: "unexpected_end_of_number",
    message: "数字不完整",
    suggestion: "补全数字",
  },
  [ParseErrorCode.InvalidUnicode]: {
    type: "invalid_unicode",
    message: "Unicode 转义序列无效",
    suggestion: "使用 \\uXXXX 格式",
  },
  [ParseErrorCode.InvalidEscapeCharacter]: {
    type: "invalid_escape_character",
    message: "包含无效的转义字符",
    suggestion: '使用合法转义: \\", \\, \/, \\b, \\f, \\n, \\r, \\t',
  },
  [ParseErrorCode.InvalidCharacter]: {
    type: "invalid_character",
    message: "存在无效的字符",
    suggestion: "删除非法字符",
  },
  // 尾随逗号（由 scanner / visit 在特定模式下报告，此处兜底）
  17: {
    type: "trailing_comma",
    message: "不允许尾随逗号",
    suggestion: "删除最后一个元素后的逗号",
  },
};

// 计算行/列信息
const getLineColumn = (text: string, position: number): { line: number; column: number } => {
  const upTo = text.slice(0, position);
  const lines = upTo.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

const offsetRangeToLineColumn = (
  text: string,
  offset: number,
  length: number,
): { line: number; column: number; endLine: number; endColumn: number } => {
  const start = getLineColumn(text, offset);
  const end = getLineColumn(text, offset + length);
  return { ...start, endLine: end.line, endColumn: end.column };
};

/**
 * 使用 createScanner 扫描错误
 */
const scanForErrors = (text: string): JsonDiagnosticError[] => {
  const errors: JsonDiagnosticError[] = [];
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return errors;

  const scanner = createScanner(str);

  let tokenOffset: number;
  let tokenLength: number;
  let token: number;

  // 遍历所有 token，收集错误
  // SyntaxKind.EOF = 17，循环到 EOF 为止
  while (true) {
    token = scanner.scan();
    if (token === 17) break; // EOF

    tokenOffset = scanner.getTokenOffset();
    tokenLength = scanner.getTokenLength();

    const scanError = scanner.getTokenError();
    if (scanError !== ScanError.None) {
      const info = scanErrorInfo[scanError] || {
        type: "scan_error",
        message: "扫描错误",
        suggestion: "检查该位置",
      };
      const range = offsetRangeToLineColumn(str, tokenOffset, tokenLength || 1);
      errors.push({
        position: tokenOffset,
        length: tokenLength || 1,
        line: range.line,
        column: range.column,
        endLine: range.endLine,
        endColumn: range.endColumn,
        type: info.type,
        message: info.message,
        suggestion: info.suggestion,
        severity: "error",
      });
    }
  }

  return errors;
};

/**
 * 使用 parseTree 检测错误
 */
const parseTreeForErrors = (text: string): JsonDiagnosticError[] => {
  const errors: JsonDiagnosticError[] = [];
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return errors;

  // visit 函数接收原始文本字符串作为第一个参数
  visit(str, {
    onError: (error, offset, length) => {
      const info = parseErrorInfo[error] || {
        type: "parse_error",
        message: `解析错误 (code: ${error})`,
        suggestion: "检查该位置的 JSON 语法",
      };
      const range = offsetRangeToLineColumn(str, offset, length || 1);
      errors.push({
        position: offset,
        length: length || 1,
        line: range.line,
        column: range.column,
        endLine: range.endLine,
        endColumn: range.endColumn,
        type: info.type,
        message: info.message,
        suggestion: info.suggestion,
        severity: "error",
      });
    },
  });

  return errors;
};

/**
 * 检测不被 jsonc-parser 直接捕获的特殊错误（单引号、NaN、Infinity等）
 */
const detectSpecialErrors = (text: string): JsonDiagnosticError[] => {
  const errors: JsonDiagnosticError[] = [];
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return errors;

  // 构建字符串区域索引，用于排除字符串内部
  const stringRanges: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === '"') {
      const start = i;
      i++;
      while (i < str.length) {
        if (str[i] === "\\") { i += 2; continue; }
        if (str[i] === '"') { i++; break; }
        if (str[i] === "\n") break;
        i++;
      }
      stringRanges.push({ start, end: i });
    } else {
      i++;
    }
  }

  const isInString = (pos: number): boolean => {
    for (const r of stringRanges) {
      if (pos >= r.start && pos < r.end) return true;
    }
    return false;
  };

  // 检测单引号字符串
  const singleQuoteRe = /'((?:[^'\\\n]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = singleQuoteRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, m[0].length);
    errors.push({
      position: m.index,
      length: m[0].length,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "single_quotes",
      message: "使用了单引号，JSON 标准只接受双引号",
      suggestion: `将单引号改为双引号`,
      severity: "error",
    });
  }

  // 检测注释 // 和 /* */（排除字符串内部）
  const lineCommentRe = /\/\/[^\n]*/g;
  while ((m = lineCommentRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, m[0].length);
    errors.push({
      position: m.index,
      length: m[0].length,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "comment",
      message: "JSON 不支持单行注释",
      suggestion: "删除注释内容",
      severity: "error",
    });
  }

  const blockCommentRe = /\/\*[\s\S]*?\*\//g;
  while ((m = blockCommentRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, m[0].length);
    errors.push({
      position: m.index,
      length: m[0].length,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "comment",
      message: "JSON 不支持块注释",
      suggestion: "删除 /* ... */ 注释",
      severity: "error",
    });
  }

  // 检测 NaN
  const nanRe = /\bNaN\b/g;
  while ((m = nanRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, 3);
    errors.push({
      position: m.index,
      length: 3,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "nan_or_infinity",
      message: "JSON 不支持 NaN",
      suggestion: "将 NaN 替换为 null",
      severity: "error",
    });
  }

  // 检测 Infinity
  const infRe = /(?<![-\w])Infinity\b/g;
  while ((m = infRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, 8);
    errors.push({
      position: m.index,
      length: 8,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "nan_or_infinity",
      message: "JSON 不支持 Infinity",
      suggestion: "将 Infinity 替换为 null",
      severity: "error",
    });
  }

  // 检测 -Infinity
  const negInfRe = /-Infinity\b/g;
  while ((m = negInfRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    const range = offsetRangeToLineColumn(str, m.index, 9);
    errors.push({
      position: m.index,
      length: 9,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      type: "nan_or_infinity",
      message: "JSON 不支持 -Infinity",
      suggestion: "将 -Infinity 替换为 null",
      severity: "error",
    });
  }

  return errors;
};

/**
 * 诊断 JSON 错误
 */
export const diagnoseJson = (text: string): JsonDiagnosticError[] => {
  const errors: JsonDiagnosticError[] = [];

  // 确保 text 是字符串
  const str = typeof text === "string" ? text : String(text ?? "");

  if (!str.trim()) return errors;

  // 1. 使用 parseTree 检测结构错误
  const treeErrors = parseTreeForErrors(str);
  errors.push(...treeErrors);

  // 2. 使用 scanner 检测扫描错误
  const scanErrors = scanForErrors(str);
  errors.push(...scanErrors);

  // 3. 检测特殊错误（单引号、注释、NaN等）
  const specialErrors = detectSpecialErrors(str);
  errors.push(...specialErrors);

  // 去重（同一位置同一类型只保留一个）
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.position}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * 容错解析：使用 jsonc-parser 的 parse 构建部分树
 */
export const tolerantParseToTree = (text: string): {
  value: unknown | undefined;
} => {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return { value: undefined };

  // 使用 jsonc-parser 的 parse（容错解析，即使有错误也返回部分结果）
  const value = parseJsonc(str);
  return { value };
};

// 字段区域类型
export type JsonFieldRegion = {
  path: string;          // 父路径（如 "$" 或 "$.malformed object"）
  startOffset: number;   // 该字段起始位置（包含 { 或 , 后面的空白）
  endOffset: number;     // 该字段结束位置（逗号或大括号前）
  keyStart: number;      // key 名起始（精确）
  keyEnd: number;        // key 名结束
  keyName: string;       // 提取到的 key 名（可能带空格、可能无引号）
  valueText: string;     // 提取到的 value 原始文本
  valueStart: number;    // value 在源文本中的起始位置
};

/**
 * 扫描 JSON 文本，识别所有字段（key:value）的区域位置
 * 用于后续给解析节点和错误节点分配真实文本偏移
 */
export const scanJsonFieldRegions = (text: string): JsonFieldRegion[] => {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return [];

  const regions: JsonFieldRegion[] = [];
  type StackFrame = {
    kind: "object" | "array";
    path: string;
    currentKey: string | null;
    keyStart: number;
    keyEnd: number;
    fieldStart: number;
    valueStart: number;
  };
  const stack: StackFrame[] = [];
  let inString = false;
  let inStringChar = "";
  let escapeNext = false;

  const beginObjectAt = (pos: number) => {
    let parentPath: string;
    if (stack.length === 0) {
      parentPath = "$";
    } else {
      const top = stack[stack.length - 1];
      parentPath = top.path;
      if (top.kind === "object" && top.currentKey !== null) {
        parentPath = `${top.path}.${top.currentKey}`;
      }
    }
    stack.push({
      kind: "object",
      path: parentPath,
      currentKey: null,
      keyStart: -1,
      keyEnd: -1,
      fieldStart: pos + 1,
      valueStart: -1,
    });
  };

  const beginArrayAt = (pos: number) => {
    let parentPath: string;
    if (stack.length === 0) {
      parentPath = "$";
    } else {
      const top = stack[stack.length - 1];
      parentPath = top.path;
      if (top.kind === "object" && top.currentKey !== null) {
        parentPath = `${top.path}.${top.currentKey}`;
      }
    }
    stack.push({
      kind: "array",
      path: parentPath,
      currentKey: null,
      keyStart: -1,
      keyEnd: -1,
      fieldStart: pos + 1,
      valueStart: -1,
    });
  };

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === "\\") {
        // 只对有效的 JSON 转义序列设置 escapeNext
        // 有效转义: \" \\ \/ \b \f \n \r \t \u
        const next = str[i + 1];
        if (next === '"' || next === '\\' || next === '/' ||
            next === 'b' || next === 'f' || next === 'n' ||
            next === 'r' || next === 't' || next === 'u') {
          escapeNext = true;
        }
        // 否则反斜杠作为普通字符，不跳过后面的字符
        continue;
      }
      if (ch === inStringChar) { inString = false; inStringChar = ""; }
      continue;
    }

    // 跳过注释（非字符串状态下）
    if (ch === '/' && i + 1 < str.length) {
      if (str[i + 1] === '/') {
        // 单行注释：跳过直到换行或 EOF
        const commentStart = i;
        while (i < str.length && str[i] !== '\n') i++;
        // 更新 fieldStart：如果当前在 object 中且还没找到 key，把字段起点挪到注释之后
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.kind === "object" && top.currentKey === null && top.fieldStart <= commentStart) {
            top.fieldStart = i + 1;
          }
        }
        continue;
      } else if (str[i + 1] === '*') {
        // 块注释：跳过直到 */
        const commentStart = i;
        i += 2;
        while (i < str.length - 1 && !(str[i] === '*' && str[i + 1] === '/')) i++;
        i++; // 跳过 '/'
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.kind === "object" && top.currentKey === null && top.fieldStart <= commentStart) {
            top.fieldStart = i + 1;
          }
        }
        continue;
      }
    }

    // 如果当前在 object 中且已有 currentKey/valueStart，遇到新的字符串/标识符意味着新字段开始
    // 先结束当前字段（处理缺少逗号的情况）
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.kind === "object" && top.currentKey !== null && top.valueStart !== -1) {
        // 只有当已经解析了值内容后，才判断是否为新 key
        // 避免 NaN/Infinity/true/false/null 等值开头字母被误判为新 key
        const valueContent = str.slice(top.valueStart, i).trim();
        const hasValue = valueContent.length > 0;
        // 只有引号开头的才可能是新 key（无引号标识符在值位置可能是 NaN/Infinity 等）
        const looksLikeNewKey = hasValue && (ch === '"' || ch === "'");
        if (looksLikeNewKey) {
          const valStart = top.valueStart;
          const valText = str.slice(valStart, i).trim();
          regions.push({
            path: top.path,
            startOffset: top.fieldStart,
            endOffset: i,
            keyStart: top.keyStart,
            keyEnd: top.keyEnd,
            keyName: top.currentKey,
            valueText: valText,
            valueStart: valStart,
          });
          top.currentKey = null;
          top.keyStart = -1;
          top.keyEnd = -1;
          top.fieldStart = i;
          top.valueStart = -1;
        }
      }
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      inStringChar = ch;
      if (stack.length > 0 && stack[stack.length - 1].kind === "object" && stack[stack.length - 1].currentKey === null) {
        stack[stack.length - 1].keyStart = i;
      }
      continue;
    }

    if (ch === "{") {
      beginObjectAt(i);
      continue;
    }
    if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1].kind === "object") {
        const top = stack.pop()!;
        if (top.currentKey !== null || top.keyStart !== -1) {
          const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : i);
          const valText = str.slice(valStart, i).trim();
          regions.push({
            path: top.path,
            startOffset: top.fieldStart,
            endOffset: i,
            keyStart: top.keyStart,
            keyEnd: top.keyEnd,
            keyName: top.currentKey || "",
            valueText: valText,
            valueStart: valStart,
          });
        }
      }
      continue;
    }
    if (ch === "[") {
      beginArrayAt(i);
      continue;
    }
    if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1].kind === "array") {
        stack.pop();
      }
      continue;
    }

    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.kind === "object") {
        if (ch === ":" && top.currentKey === null) {
          let ks = top.keyStart;
          if (ks === -1) {
            let j = i - 1;
            while (j >= 0 && /\s/.test(str[j])) j--;
            const ke = j + 1;
            while (j >= 0 && !/[{},\[\]:"']/.test(str[j])) {
              // 回溯时遇到注释要跳过，避免把注释内容当作 key
              if (str[j] === '/' && j > 0 && str[j - 1] === '/') {
                // 单行注释：跳过到行首，再继续回溯
                j -= 2;
                while (j >= 0 && str[j] !== '\n') j--;
                while (j >= 0 && /\s/.test(str[j])) j--;
                continue;
              }
              if (str[j] === '/' && j > 0 && str[j - 1] === '*') {
                // 块注释结束：跳过到块注释开始
                j -= 2;
                while (j >= 1 && !(str[j] === '*' && str[j - 1] === '/')) j--;
                j -= 2;
                while (j >= 0 && /\s/.test(str[j])) j--;
                continue;
              }
              j--;
            }
            ks = j + 1;
            // 确保不会把字段开头之前的内容（如注释、换行）卷进 key
            if (ks < top.fieldStart) ks = top.fieldStart;
            top.keyEnd = ke;
          } else {
            top.keyEnd = i;
          }
          if (ks >= 0 && ks < i) {
            let raw = str.slice(ks, i).trim();
            if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) raw = raw.slice(1, -1);
            else if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) raw = raw.slice(1, -1);
            top.currentKey = raw;
            if (top.keyEnd === -1) top.keyEnd = i;
          }
          let vs = i + 1;
          while (vs < str.length && /\s/.test(str[vs])) vs++;
          top.valueStart = vs;
        } else if (ch === ",") {
          if (top.currentKey !== null) {
            const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : i);
            const valText = str.slice(valStart, i).trim();
            regions.push({
              path: top.path,
              startOffset: top.fieldStart,
              endOffset: i,
              keyStart: top.keyStart,
              keyEnd: top.keyEnd,
              keyName: top.currentKey,
              valueText: valText,
              valueStart: valStart,
            });
          }
          top.currentKey = null;
          top.keyStart = -1;
          top.keyEnd = -1;
          top.fieldStart = i + 1;
          top.valueStart = -1;
        }
      }
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.kind === "object" && (top.currentKey !== null || top.keyStart !== -1)) {
      const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : str.length);
      const valText = str.slice(valStart, str.length).trim();
      regions.push({
        path: top.path,
        startOffset: top.fieldStart,
        endOffset: str.length,
        keyStart: top.keyStart,
        keyEnd: top.keyEnd,
        keyName: top.currentKey || "",
        valueText: valText,
        valueStart: valStart,
      });
    }
  }

  return regions;
};

/**
 * 从 jsonc-parser 的 AST 提取所有解析节点的路径->偏移映射
 * 比 scanJsonFieldRegions 更可靠，key 名与 jsonc-parser 解析结果完全一致
 */
export const getFieldNodeOffsets = (text: string): Record<string, number> => {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return {};

  const tree = parseTree(str);
  const offsets: Record<string, number> = {};

  const walk = (node: any, path: string) => {
    if (!node) return;
    if (node.type === "object") {
      for (const child of node.children || []) {
        if (child.type === "property" && child.children && child.children.length >= 2) {
          const keyNode = child.children[0];
          const valueNode = child.children[1];
          const key = keyNode.value !== undefined ? String(keyNode.value) : "";
          const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
          // 使用 key 节点的 offset（更精确）
          if (!(childPath in offsets) || keyNode.offset < offsets[childPath]) {
            offsets[childPath] = keyNode.offset;
          }
          walk(valueNode, childPath);
        }
      }
    } else if (node.type === "array") {
      for (let i = 0; i < (node.children || []).length; i++) {
        walk(node.children[i], `${path}[${i}]`);
      }
    }
  };

  if (tree) walk(tree, "$");
  return offsets;
};

/**
 * 从诊断错误构建占位节点（用于在可视化树中展示无法解析的字段）
 * 将错误按"key:value区域"归组（以 , 或 { 分隔符识别字段边界）
 */
// 致命错误类型：表明该字段的值从根本上无法正确解析
// 解析结果不可靠，应展示为错误节点而非解析节点
const CRITICAL_ERROR_TYPES = new Set([
  "invalid_number",
  "value_expected",
  "property_name_unquoted",
  "colon_expected",
]);

export const buildErrorNodesFromDiagnostics = (
  text: string,
  diagnostics: JsonDiagnosticError[]
): Record<string, { keyName: string; errorMessage: string; errorSuggestion: string; valueText: string; startOffset: number; errorTypes: string[]; hasCriticalError: boolean; errors: JsonDiagnosticError[] }[]> => {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str || !diagnostics.length) return {};

  const regions = scanJsonFieldRegions(str);

  // ==== 给每个诊断错误找所属的 FieldRegion ====
  // 错误属于某 region，当且仅当它的 offset 落在 [region.startOffset, region.endOffset]
  // 若找不到任何 region，则回退到按 offset 最近且 <=40 的对象层
  const sorted = [...diagnostics].sort((a, b) => a.position - b.position);

  type Group = {
    path: string;
    parentPath: string;
    keyName: string;
    startOffset: number;
    endOffset: number;
    valueText: string;
    errors: JsonDiagnosticError[];
    errorTypes: string[];
  };
  const groupsMap = new Map<string, Group>(); // key: `${parentPath}|${keyName}|${start}`

  for (const diag of sorted) {
    // 1. 先找最近的 region
    let region: JsonFieldRegion | undefined;
    for (const r of regions) {
      if (diag.position >= r.startOffset && diag.position <= r.endOffset) {
        // 找到了
        region = r;
        break;
      }
    }
    // 若没找到：找最近的（前一个或后一个，偏移差 <40）
    if (!region) {
      let best: { r: JsonFieldRegion; dist: number } | undefined;
      for (const r of regions) {
        const d1 = Math.abs(diag.position - r.startOffset);
        const d2 = Math.abs(diag.position - r.endOffset);
        const d = Math.min(d1, d2);
        if (d < 40 && (!best || d < best.dist)) best = { r, dist: d };
      }
      if (best) region = best.r;
    }

    let parentPath = "$";
    let keyName = "";
    let regionStart = diag.position;
    let regionEnd = diag.position + diag.length;
    let regionValueText = "";

    if (region) {
      parentPath = region.path;
      keyName = region.keyName;
      regionStart = region.startOffset;
      regionEnd = region.endOffset;
      regionValueText = region.valueText;
      if (!keyName) {
        const w = str.slice(
          Math.max(0, diag.position - 40),
          Math.min(str.length, diag.position + diag.length + 40)
        );
        const m = w.match(/[{,]\s*([^:]{1,60}?)\s*:/);
        if (m) {
          keyName = m[1].trim().replace(/^"|"$/g, "");
        }
      }
    } else {
      try {
        const loc = getLocation(str, diag.position);
        if (loc && Array.isArray(loc.path)) {
          if (loc.path.length === 0) {
            parentPath = "$";
          } else if (loc.path.length === 1 && loc.path[0] === "") {
            parentPath = "$";
          } else {
            const segs = [...loc.path];
            const last = segs.pop()!;
            keyName = String(last);
            parentPath =
              segs.length === 0
                ? "$"
                : "$" + segs.map((s) => (typeof s === "number" ? `[${s}]` : `.${s}`)).join("");
          }
        }
      } catch { /* ignore */ }
      if (!keyName) {
        const w = str.slice(
          Math.max(0, diag.position - 40),
          Math.min(str.length, diag.position + diag.length + 40)
        );
        const m = w.match(/[{,]\s*(.{1,60}?)\s*:/);
        if (m) keyName = m[1].trim().replace(/^"|"$/g, "");
      }
    }

    if (!keyName) {
      keyName = `<错误@${diag.line}:${diag.column}>`;
    }

    // 归并到组（同一 parentPath + keyName 合并，避免同一字段产生多个重复节点）
    const mapKey = `${parentPath}||${keyName}`;
    if (groupsMap.has(mapKey)) {
      const g = groupsMap.get(mapKey)!;
      g.startOffset = Math.min(g.startOffset, regionStart);
      g.endOffset = Math.max(g.endOffset, regionEnd);
      g.errors.push(diag);
      if (!g.errorTypes.includes(diag.type)) g.errorTypes.push(diag.type);
    } else {
      groupsMap.set(mapKey, {
        path: `${parentPath}.${keyName}`,
        parentPath,
        keyName,
        startOffset: regionStart,
        endOffset: regionEnd,
        valueText: regionValueText,
        errors: [diag],
        errorTypes: [diag.type],
      });
    }
  }

  // ==== 生成结果（合并每个组中的错误/修复提示）====
  const result: Record<string, { keyName: string; errorMessage: string; errorSuggestion: string; valueText: string; startOffset: number; errorTypes: string[]; hasCriticalError: boolean; errors: JsonDiagnosticError[] }[]> = {};
  for (const g of groupsMap.values()) {
    if (!result[g.parentPath]) result[g.parentPath] = [];

    const seen = new Set<string>();
    const messages: string[] = [];
    const suggestions: string[] = [];
    for (const e of g.errors) {
      if (!seen.has(e.message)) { seen.add(e.message); messages.push(e.message); }
      if (!seen.has("__s__" + e.suggestion)) { seen.add("__s__" + e.suggestion); suggestions.push(e.suggestion); }
    }

    const summary = messages.length <= 2
      ? messages.join("；")
      : `${messages[0]} 等 ${messages.length} 处问题`;

    const hasCriticalError = g.errorTypes.some((t) => CRITICAL_ERROR_TYPES.has(t));

    result[g.parentPath].push({
      keyName: g.keyName,
      errorMessage: summary,
      errorSuggestion: suggestions.join("；"),
      valueText: g.valueText,
      startOffset: g.startOffset,
      errorTypes: g.errorTypes,
      hasCriticalError,
      errors: g.errors,
    });
  }

  return result;
};

/**
 * 自动修复：生成修复建议
 */
export const generateFixes = (text: string): { fixed: string; fixes: JsonFix[] } => {
  const fixes: JsonFix[] = [];
  let fixed = text;

  // 1. 删除注释
  fixed = fixed.replace(/\/\/[^\n]*/g, (match) => {
    fixes.push({ position: 0, length: match.length, replacement: "", description: "删除单行注释" });
    return "";
  });
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    fixes.push({ position: 0, length: match.length, replacement: "", description: "删除块注释" });
    return "";
  });

  // 2. 单引号 → 双引号
  fixed = fixed.replace(/'((?:[^'\\\n]|\\.)*)'/g, (_match, content) => {
    fixes.push({ position: 0, length: _match.length, replacement: `"${content}"`, description: "单引号改为双引号" });
    return `"${content}"`;
  });

  // 3. 无引号属性名加引号
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, (match, p1, p2, p3) => {
    fixes.push({ position: 0, length: match.length, replacement: `${p1}"${p2}"${p3}`, description: "给属性名添加双引号" });
    return `${p1}"${p2}"${p3}`;
  });

  // 4. 尾随逗号
  fixed = fixed.replace(/,(\s*)([}\]])/g, (match, ws, bracket) => {
    fixes.push({ position: 0, length: match.length, replacement: `${ws}${bracket}`, description: "删除尾随逗号" });
    return `${ws}${bracket}`;
  });

  // 5. NaN / Infinity → null
  fixed = fixed.replace(/\bNaN\b/g, (_match) => {
    fixes.push({ position: 0, length: 3, replacement: "null", description: "NaN 改为 null" });
    return "null";
  });
  fixed = fixed.replace(/(?<![-\w])Infinity\b/g, (_match) => {
    fixes.push({ position: 0, length: 8, replacement: "null", description: "Infinity 改为 null" });
    return "null";
  });
  fixed = fixed.replace(/-Infinity\b/g, (_match) => {
    fixes.push({ position: 0, length: 9, replacement: "null", description: "-Infinity 改为 null" });
    return "null";
  });

  return { fixed, fixes };
};

/**
 * 容错解析主函数
 */
export const lenientParseJson = (text: string): LenientParseResult => {
  const errors = diagnoseJson(text);

  // 如果没有错误，直接解析
  if (errors.length === 0) {
    try {
      return { success: true, parsed: JSON.parse(text), errors: [], fixes: [] };
    } catch { /* fallback */ }
  }

  // 尝试自动修复
  const { fixed, fixes } = generateFixes(text);

  try {
    const parsed = JSON.parse(fixed);
    return {
      success: true,
      parsed,
      errors,
      fixes,
      fixedText: fixed,
    };
  } catch {
    return {
      success: false,
      errors,
      fixes,
      fixedText: fixed,
    };
  }
};

// 错误占位对象
export const createErrorValue = (message: string, suggestion: string): unknown =>
  ({ __jsonError: true as const, __errorMessage: message, __errorSuggestion: suggestion });

export const isErrorValue = (v: unknown): v is { __jsonError: true; __errorMessage: string; __errorSuggestion: string } =>
  typeof v === "object" && v !== null && "__jsonError" in v && (v as any).__jsonError === true;

/**
 * 将 diagnostics 按 JSON 路径分组（用于在可视化树节点上显示错误）
 */
export const mapDiagnosticsToPaths = (
  text: string,
  diagnostics: JsonDiagnosticError[]
): Record<string, JsonDiagnosticError[]> => {
  const map: Record<string, JsonDiagnosticError[]> = {};
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return map;

  for (const diag of diagnostics) {
    try {
      const location = getLocation(str, diag.position);
      // getLocation 返回 { path: (string|number)[] }
      if (location && Array.isArray(location.path) && location.path.length > 0) {
        let path =
          "$" +
          location.path
            .map((s: any) => (typeof s === "number" ? `[${s}]` : `.${s}`))
            .join("");
        // 容错解析会把无法解析的内容塞进空字符串 key，导致路径为 "$."
        // 这类错误映射到根节点，提示整体语法问题
        if (path === "$." || path === "$") {
          path = "$";
        }
        if (!map[path]) map[path] = [];
        map[path].push(diag);
      } else if (location && Array.isArray(location.path) && location.path.length === 0) {
        // 根路径 []
        if (!map["$"]) map["$"] = [];
        map["$"].push(diag);
      }
    } catch {
      /* ignore */
    }
  }
  return map;
};
