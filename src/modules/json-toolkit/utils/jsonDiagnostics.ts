/**
 * JSON 错误诊断与容错解析
 * 使用 jsonc-parser（VS Code 同款）一次性构建 AST：同时得到容错结构、错误列表与字段偏移
 */
import { parseTree, getNodeValue, getLocation } from "jsonc-parser";
import type { Node, ParseError } from "jsonc-parser";
import type { JsonToolkitTypes } from "../data/interface";

export type JsonDiagnosticError = JsonToolkitTypes.JsonDiagnosticError;
export type JsonErrorGroup = JsonToolkitTypes.JsonErrorGroup;

// ParseErrorCode（jsonc-parser const enum 的本地数值映射）
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

export interface JsonFix {
  position: number;
  length: number;
  replacement: string;
  description: string;
}

export interface JsonAnalysis {
  diagnostics: JsonDiagnosticError[];
  fixes: JsonFix[];
  /** 自动修复后的文本（仅当修复结果可被严格解析时提供） */
  fixedText?: string;
  /** 原文是否可通过严格 JSON.parse */
  strictValid: boolean;
  /** 严格解析结果（strictValid 时存在） */
  strictParsed?: unknown;
  /** 容错解析得到的部分结构（原文无效时用于树展示） */
  partial?: unknown;
  /** 可用数据：严格有效时为原文结果，否则为自动修复后的结果 */
  data?: unknown;
  /** 字段路径 -> 源文本偏移 */
  offsets: Record<string, number>;
}

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
    suggestion: '使用合法转义: \\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t',
  },
  [ParseErrorCode.InvalidCharacter]: {
    type: "invalid_character",
    message: "存在无效的字符",
    suggestion: "删除非法字符",
  },
  // 尾随逗号（jsonc 允许，严格 JSON 不允许，此处兜底）
  17: {
    type: "trailing_comma",
    message: "不允许尾随逗号",
    suggestion: "删除最后一个元素后的逗号",
  },
};

// 致命错误类型：表明该字段的值从根本上无法正确解析，应展示为错误节点而非解析节点
const CRITICAL_ERROR_TYPES = new Set([
  "invalid_number",
  "value_expected",
  "property_name_unquoted",
  "colon_expected",
]);

/** 预计算换行位置，避免每条错误都做 slice + split */
class LineIndex {
  private readonly starts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) this.starts.push(i + 1);
    }
  }

  toLineColumn(position: number): { line: number; column: number } {
    const pos = Math.max(0, position);
    let low = 0;
    let high = this.starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.starts[mid] <= pos) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: pos - this.starts[low] + 1 };
  }
}

const createDiagnostic = (
  index: LineIndex,
  position: number,
  length: number,
  info: { type: string; message: string; suggestion: string },
): JsonDiagnosticError => {
  const safeLength = Math.max(length, 1);
  const start = index.toLineColumn(position);
  const end = index.toLineColumn(position + safeLength);
  return {
    position,
    length: safeLength,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
    type: info.type,
    message: info.message,
    suggestion: info.suggestion,
    severity: "error",
  };
};

const isWhitespace = (ch: string): boolean =>
  ch === " " || ch === "\n" || ch === "\r" || ch === "\t";

// 收集所有双引号字符串区间（用于排除字符串内部的误报）
const collectStringRanges = (str: string): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] !== '"') {
      i++;
      continue;
    }
    const start = i;
    i++;
    while (i < str.length) {
      if (str[i] === "\\") {
        i += 2;
        continue;
      }
      if (str[i] === '"') {
        i++;
        break;
      }
      if (str[i] === "\n") break;
      i++;
    }
    ranges.push({ start, end: i });
  }
  return ranges;
};

/**
 * 检测 jsonc-parser 不会报错的特殊情况（单引号、注释、NaN、尾随逗号、前导零）
 */
const detectSpecialErrors = (str: string, index: LineIndex): JsonDiagnosticError[] => {
  const errors: JsonDiagnosticError[] = [];
  const ranges = collectStringRanges(str);

  // 二分查找位置是否落在某个字符串区间内（ranges 天然有序）
  const isInString = (pos: number): boolean => {
    let low = 0;
    let high = ranges.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const r = ranges[mid];
      if (pos < r.start) high = mid - 1;
      else if (pos >= r.end) low = mid + 1;
      else return true;
    }
    return false;
  };

  // 单引号字符串
  const singleQuoteRe = /'((?:[^'\\\n]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = singleQuoteRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, m[0].length, {
        type: "single_quotes",
        message: "使用了单引号，JSON 标准只接受双引号",
        suggestion: "将单引号改为双引号",
      }),
    );
  }

  // 单行注释
  const lineCommentRe = /\/\/[^\n]*/g;
  while ((m = lineCommentRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, m[0].length, {
        type: "comment",
        message: "JSON 不支持单行注释",
        suggestion: "删除注释内容",
      }),
    );
  }

  // 块注释
  const blockCommentRe = /\/\*[\s\S]*?\*\//g;
  while ((m = blockCommentRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, m[0].length, {
        type: "comment",
        message: "JSON 不支持块注释",
        suggestion: "删除 /* ... */ 注释",
      }),
    );
  }

  // NaN
  const nanRe = /\bNaN\b/g;
  while ((m = nanRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, 3, {
        type: "nan_or_infinity",
        message: "JSON 不支持 NaN",
        suggestion: "将 NaN 替换为 null",
      }),
    );
  }

  // Infinity / -Infinity
  const infRe = /(?<![-\w])Infinity\b/g;
  while ((m = infRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, 8, {
        type: "nan_or_infinity",
        message: "JSON 不支持 Infinity",
        suggestion: "将 Infinity 替换为 null",
      }),
    );
  }
  const negInfRe = /-Infinity\b/g;
  while ((m = negInfRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, 9, {
        type: "nan_or_infinity",
        message: "JSON 不支持 -Infinity",
        suggestion: "将 -Infinity 替换为 null",
      }),
    );
  }

  // 尾随逗号：逗号后（跳过空白与注释）紧跟 } 或 ]
  let inStr = false;
  let strChar = "";
  let escNext = false;
  for (let p = 0; p < str.length; p++) {
    const c = str[p];
    if (inStr) {
      if (escNext) {
        escNext = false;
        continue;
      }
      if (c === "\\") {
        escNext = true;
        continue;
      }
      if (c === strChar) {
        inStr = false;
        strChar = "";
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strChar = c;
      continue;
    }
    if (c === "/" && p + 1 < str.length) {
      if (str[p + 1] === "/") {
        while (p < str.length && str[p] !== "\n") p++;
        continue;
      }
      if (str[p + 1] === "*") {
        p += 2;
        while (p < str.length - 1 && !(str[p] === "*" && str[p + 1] === "/")) p++;
        p++;
        continue;
      }
    }
    if (c === ",") {
      let q = p + 1;
      while (q < str.length && isWhitespace(str[q])) q++;
      if (q < str.length && (str[q] === "}" || str[q] === "]")) {
        errors.push(
          createDiagnostic(index, p, 1, {
            type: "trailing_comma",
            message: "不允许尾随逗号",
            suggestion: "删除最后一个元素后的逗号",
          }),
        );
      }
    }
  }

  // 前导零：如 0123
  const badNumRe = /(?<![\w$.])(0\d+)(?!\w)/g;
  while ((m = badNumRe.exec(str)) !== null) {
    if (isInString(m.index)) continue;
    errors.push(
      createDiagnostic(index, m.index, m[1].length, {
        type: "invalid_number",
        message: `数字格式错误：${m[1]}（前导零不合法）`,
        suggestion: "使用无前置零的数字（如 123），或用字符串表示",
      }),
    );
  }

  return errors;
};

/**
 * 从 AST 提取所有字段路径 -> key 节点偏移的映射
 */
const collectFieldOffsets = (tree: Node | undefined): Record<string, number> => {
  const offsets: Record<string, number> = {};
  if (!tree) return offsets;

  const walk = (node: Node, path: string) => {
    if (node.type === "object") {
      for (const child of node.children ?? []) {
        if (child.type !== "property" || !child.children || child.children.length < 2) continue;
        const [keyNode, valueNode] = child.children;
        const key = keyNode.value !== undefined ? String(keyNode.value) : "";
        const childPath = `${path}.${key}`;
        if (!(childPath in offsets) || keyNode.offset < offsets[childPath]) {
          offsets[childPath] = keyNode.offset;
        }
        walk(valueNode, childPath);
      }
    } else if (node.type === "array") {
      (node.children ?? []).forEach((child, i) => walk(child, `${path}[${i}]`));
    }
  };

  walk(tree, "$");
  return offsets;
};

/**
 * 一次性解析：严格解析结果 + 容错结构 + 错误诊断 + 自动修复
 */
export const analyzeJson = (text: string): JsonAnalysis => {
  const str = typeof text === "string" ? text : "";
  if (!str.trim()) {
    return {
      diagnostics: [
        {
          position: 0,
          length: 1,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 2,
          type: "value_expected",
          message: "输入为空",
          suggestion: "请粘贴或输入 JSON 内容",
          severity: "error",
        },
      ],
      fixes: [],
      strictValid: false,
      offsets: {},
    };
  }

  // 1) 严格解析（原生实现，最快）
  let strictParsed: unknown;
  let strictValid = false;
  let strictError: unknown;
  try {
    strictParsed = JSON.parse(str);
    strictValid = true;
  } catch (e) {
    strictError = e;
  }

  // 2) 一次 AST 解析，同时得到容错结构、错误列表与字段偏移
  const parseErrors: ParseError[] = [];
  const tree = parseTree(str, parseErrors);
  const offsets = collectFieldOffsets(tree);
  const partial = tree ? (getNodeValue(tree) as unknown) : undefined;

  const index = new LineIndex(str);
  const diagnostics: JsonDiagnosticError[] = [];

  if (!strictValid) {
    const parseDiagnostics: JsonDiagnosticError[] = [];
    for (const e of parseErrors) {
      const info = parseErrorInfo[e.error] ?? {
        type: "parse_error",
        message: `解析错误 (code: ${e.error})`,
        suggestion: "检查该位置的 JSON 语法",
      };
      parseDiagnostics.push(createDiagnostic(index, e.offset, e.length, info));
    }
    const specialDiagnostics = detectSpecialErrors(str, index);
    diagnostics.push(...mergeDiagnostics(parseDiagnostics, specialDiagnostics));

    if (diagnostics.length === 0) {
      // 兜底：从 JSON.parse 抛出的错误中尽力提取位置
      const message = (strictError as Error)?.message ?? "无法解析该 JSON";
      const posMatch = message.match(/position\s+(\d+)/i);
      const offset = posMatch ? Math.min(parseInt(posMatch[1], 10), str.length) : 0;
      diagnostics.push(
        createDiagnostic(index, offset, 1, {
          type: "invalid_symbol",
          message,
          suggestion: "检查该位置的语法是否符合 JSON 规范",
        }),
      );
    }
  }

  if (strictValid) {
    return {
      diagnostics: [],
      fixes: [],
      strictValid,
      strictParsed,
      partial,
      data: strictParsed,
      offsets,
    };
  }

  // 3) 仅在原文无效时尝试自动修复
  const { fixed, fixes } = generateFixes(str);
  let data: unknown;
  let fixedParsed = false;
  if (fixed !== str) {
    try {
      data = JSON.parse(fixed);
      fixedParsed = true;
    } catch {
      fixedParsed = false;
    }
  }

  return {
    diagnostics,
    fixes: fixedParsed ? fixes : [],
    fixedText: fixedParsed ? fixed : undefined,
    strictValid,
    partial,
    data,
    offsets,
  };
};

const dedupeDiagnostics = (diagnostics: JsonDiagnosticError[]): JsonDiagnosticError[] => {
  const seen = new Set<string>();
  return diagnostics.filter((e) => {
    const key = `${e.position}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * 合并解析错误与特殊语法错误：特殊错误（单引号/注释/尾随逗号等）定位更精确，
 * 以其为中心丢弃相邻的通用解析错误，避免同一处问题被重复列出
 */
const mergeDiagnostics = (
  parseDiagnostics: JsonDiagnosticError[],
  specialDiagnostics: JsonDiagnosticError[],
): JsonDiagnosticError[] => {
  const clustered = clusterDiagnostics(parseDiagnostics);
  if (specialDiagnostics.length === 0) return dedupeDiagnostics(clustered);
  const covered = (d: JsonDiagnosticError) =>
    specialDiagnostics.some(
      (s) => d.position >= s.position - 2 && d.position <= s.position + s.length + 2,
    );
  return dedupeDiagnostics(
    [...specialDiagnostics, ...clustered.filter((d) => !covered(d))].sort(
      (a, b) => a.position - b.position,
    ),
  );
};

// 同一位置附近可能有多个解析错误，保留信息量最大的一条
const PARSE_ERROR_PRIORITY: Record<string, number> = {
  property_name_unquoted: 6,
  colon_expected: 5,
  comma_expected: 4,
  close_brace_expected: 4,
  close_bracket_expected: 4,
  end_of_file_expected: 4,
  unexpected_end_of_string: 4,
  unexpected_end_of_number: 4,
  value_expected: 3,
  invalid_number: 3,
  invalid_character: 2,
  invalid_symbol: 1,
};

const clusterDiagnostics = (diagnostics: JsonDiagnosticError[]): JsonDiagnosticError[] => {
  const sorted = [...diagnostics].sort((a, b) => a.position - b.position);
  const result: JsonDiagnosticError[] = [];
  let cluster: JsonDiagnosticError[] = [];

  const flush = () => {
    if (cluster.length === 0) return;
    const best = cluster.reduce((acc, cur) =>
      (PARSE_ERROR_PRIORITY[cur.type] ?? 0) > (PARSE_ERROR_PRIORITY[acc.type] ?? 0) ? cur : acc,
    );
    result.push(best);
    cluster = [];
  };

  for (const diag of sorted) {
    if (cluster.length > 0 && diag.position - cluster[cluster.length - 1].position > 2) flush();
    cluster.push(diag);
  }
  flush();
  return result;
};

/**
 * 自动修复（字符串感知）：只处理字符串之外的内容，避免破坏字符串字面量
 */
export const generateFixes = (text: string): { fixed: string; fixes: JsonFix[] } => {
  const str = typeof text === "string" ? text : "";
  const fixes: JsonFix[] = [];
  const out: string[] = [];
  const stack: Array<"object" | "array"> = [];

  const record = (position: number, length: number, replacement: string, description: string) => {
    fixes.push({ position, length, replacement, description });
  };

  // 识别注释，返回注释结束位置
  const readComment = (i: number): { end: number; kind: "line" | "block" } | null => {
    if (str[i] !== "/") return null;
    if (str[i + 1] === "/") {
      let j = i;
      while (j < str.length && str[j] !== "\n") j++;
      return { end: j, kind: "line" };
    }
    if (str[i + 1] === "*") {
      const close = str.indexOf("*/", i + 2);
      return { end: close === -1 ? str.length : close + 2, kind: "block" };
    }
    return null;
  };

  // 只查看不消费：用于前瞻判断（注释随后由主循环处理）
  const peekTrivia = (from: number): number => {
    let j = from;
    for (;;) {
      while (j < str.length && isWhitespace(str[j])) j++;
      const comment = readComment(j);
      if (!comment) return j;
      j = comment.end;
    }
  };

  // 消费并输出空白、丢弃注释（顺带记录修复项）
  const emitTrivia = (from: number): number => {
    let j = from;
    for (;;) {
      if (j < str.length && isWhitespace(str[j])) {
        out.push(str[j]);
        j++;
        continue;
      }
      const comment = readComment(j);
      if (!comment) return j;
      record(j, comment.end - j, "", comment.kind === "line" ? "删除单行注释" : "删除块注释");
      j = comment.end;
    }
  };

  // 无引号属性名 -> 加双引号
  const maybeQuoteKey = (from: number): number => {
    const start = emitTrivia(from);
    if (!/[A-Za-z_$]/.test(str[start] ?? "")) return start;
    let j = start;
    while (j < str.length && /[A-Za-z0-9_$]/.test(str[j])) j++;
    let k = j;
    while (k < str.length && isWhitespace(str[k])) k++;
    if (str[k] !== ":") return start;
    const name = str.slice(start, j);
    out.push(`"${name}"`);
    record(start, name.length, `"${name}"`, "给属性名添加双引号");
    return j;
  };

  let i = 0;
  while (i < str.length) {
    const ch = str[i];

    // 字符串：整段消费，内部内容一律不改写
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let content = "";
      while (j < str.length) {
        const c = str[j];
        if (c === "\\") {
          const next = str[j + 1];
          if (next === undefined) {
            content += c;
            j++;
            break;
          }
          if (quote === "'") {
            if (next === "'") content += "'";
            else if (next === '"') content += '\\"';
            else content += c + next;
          } else {
            content += c + next;
          }
          j += 2;
          continue;
        }
        if (c === quote) {
          j++;
          break;
        }
        if (c === "\n" && quote === "'") break;
        if (quote === "'" && c === '"') {
          content += '\\"';
          j++;
          continue;
        }
        content += c;
        j++;
      }
      if (quote === "'") {
        out.push(`"${content}"`);
        record(i, j - i, `"${content}"`, "单引号改为双引号");
      } else {
        out.push(str.slice(i, j));
      }
      i = j;
      continue;
    }

    // 注释
    const comment = readComment(i);
    if (comment) {
      record(i, comment.end - i, "", comment.kind === "line" ? "删除单行注释" : "删除块注释");
      i = comment.end;
      continue;
    }

    // 尾随逗号
    if (ch === ",") {
      const next = peekTrivia(i + 1);
      if (next < str.length && (str[next] === "}" || str[next] === "]")) {
        record(i, 1, "", "删除尾随逗号");
        i++;
        continue;
      }
      out.push(",");
      i++;
      if (stack[stack.length - 1] === "object") i = maybeQuoteKey(i);
      continue;
    }

    if (ch === "{") {
      stack.push("object");
      out.push("{");
      i++;
      i = maybeQuoteKey(i);
      continue;
    }
    if (ch === "[") {
      stack.push("array");
      out.push("[");
      i++;
      continue;
    }
    if (ch === "}" || ch === "]") {
      stack.pop();
      out.push(ch);
      i++;
      continue;
    }

    // NaN / Infinity / -Infinity
    if (
      str.startsWith("NaN", i) &&
      !/[A-Za-z0-9_$]/.test(str[i - 1] ?? "")
    ) {
      record(i, 3, "null", "NaN 改为 null");
      out.push("null");
      i += 3;
      continue;
    }
    if (
      str.startsWith("Infinity", i) &&
      !/[A-Za-z0-9_$]/.test(str[i - 1] ?? "")
    ) {
      record(i, 8, "null", "Infinity 改为 null");
      out.push("null");
      i += 8;
      continue;
    }
    if (str.startsWith("-Infinity", i) && !/[A-Za-z0-9_$]/.test(str[i - 1] ?? "")) {
      record(i, 9, "null", "-Infinity 改为 null");
      out.push("null");
      i += 9;
      continue;
    }

    // 前导零：0123 -> 123
    if (ch === "0" && /\d/.test(str[i + 1] ?? "") && !/[A-Za-z0-9_$.]/.test(str[i - 1] ?? "")) {
      record(i, 1, "", "删除数字的前导零");
      i++;
      continue;
    }

    out.push(ch);
    i++;
  }

  return { fixed: out.join(""), fixes };
};

// 字段区域类型
interface JsonFieldRegion {
  path: string; // 父路径（如 "$" 或 "$.malformed object"）
  startOffset: number; // 该字段起始位置
  endOffset: number; // 该字段结束位置
  keyStart: number; // key 名起始
  keyEnd: number; // key 名结束
  keyName: string; // 提取到的 key 名
  valueText: string; // 提取到的 value 原始文本
  valueStart: number; // value 在源文本中的起始位置
}

/**
 * 扫描 JSON 文本，识别所有字段（key:value）的区域位置
 */
const scanJsonFieldRegions = (text: string): JsonFieldRegion[] => {
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

  const parentPathOf = (): string => {
    if (stack.length === 0) return "$";
    const top = stack[stack.length - 1];
    if (top.kind === "object" && top.currentKey !== null) return `${top.path}.${top.currentKey}`;
    return top.path;
  };

  const beginContainer = (kind: "object" | "array", pos: number) => {
    stack.push({
      kind,
      path: parentPathOf(),
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
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        const next = str[i + 1];
        if (next === '"' || next === "\\" || next === "/" ||
            next === "b" || next === "f" || next === "n" ||
            next === "r" || next === "t" || next === "u") {
          escapeNext = true;
        }
        continue;
      }
      if (ch === inStringChar) {
        inString = false;
        inStringChar = "";
      }
      continue;
    }

    // 跳过注释（非字符串状态下）
    if (ch === "/" && i + 1 < str.length) {
      if (str[i + 1] === "/") {
        const commentStart = i;
        while (i < str.length && str[i] !== "\n") i++;
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.kind === "object" && top.currentKey === null && top.fieldStart <= commentStart) {
            top.fieldStart = i + 1;
          }
        }
        continue;
      }
      if (str[i + 1] === "*") {
        const commentStart = i;
        i += 2;
        while (i < str.length - 1 && !(str[i] === "*" && str[i + 1] === "/")) i++;
        i++;
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.kind === "object" && top.currentKey === null && top.fieldStart <= commentStart) {
            top.fieldStart = i + 1;
          }
        }
        continue;
      }
    }

    // 缺少逗号时，新 key 的开头意味着上一个字段结束
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.kind === "object" && top.currentKey !== null && top.valueStart !== -1) {
        const valueContent = str.slice(top.valueStart, i).trim();
        const looksLikeNewKey = valueContent.length > 0 && (ch === '"' || ch === "'");
        if (looksLikeNewKey) {
          regions.push({
            path: top.path,
            startOffset: top.fieldStart,
            endOffset: i,
            keyStart: top.keyStart,
            keyEnd: top.keyEnd,
            keyName: top.currentKey,
            valueText: str.slice(top.valueStart, i).trim(),
            valueStart: top.valueStart,
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
      beginContainer("object", i);
      continue;
    }
    if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1].kind === "object") {
        const top = stack.pop()!;
        if (top.currentKey !== null || top.keyStart !== -1) {
          const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : i);
          regions.push({
            path: top.path,
            startOffset: top.fieldStart,
            endOffset: i,
            keyStart: top.keyStart,
            keyEnd: top.keyEnd,
            keyName: top.currentKey || "",
            valueText: str.slice(valStart, i).trim(),
            valueStart: valStart,
          });
        }
      }
      continue;
    }
    if (ch === "[") {
      beginContainer("array", i);
      continue;
    }
    if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1].kind === "array") stack.pop();
      continue;
    }

    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.kind !== "object") continue;

      if (ch === ":" && top.currentKey === null) {
        let ks = top.keyStart;
        if (ks === -1) {
          let j = i - 1;
          while (j >= 0 && isWhitespace(str[j])) j--;
          const ke = j + 1;
          while (j >= 0 && !/[{},\[\]:"']/.test(str[j])) {
            // 回溯时跳过注释
            if (str[j] === "/" && j > 0 && str[j - 1] === "/") {
              j -= 2;
              while (j >= 0 && str[j] !== "\n") j--;
              while (j >= 0 && isWhitespace(str[j])) j--;
              continue;
            }
            if (str[j] === "/" && j > 0 && str[j - 1] === "*") {
              j -= 2;
              while (j >= 1 && !(str[j] === "*" && str[j - 1] === "/")) j--;
              j -= 2;
              while (j >= 0 && isWhitespace(str[j])) j--;
              continue;
            }
            j--;
          }
          ks = j + 1;
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
        while (vs < str.length && isWhitespace(str[vs])) vs++;
        top.valueStart = vs;
      } else if (ch === ",") {
        if (top.currentKey !== null) {
          const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : i);
          regions.push({
            path: top.path,
            startOffset: top.fieldStart,
            endOffset: i,
            keyStart: top.keyStart,
            keyEnd: top.keyEnd,
            keyName: top.currentKey,
            valueText: str.slice(valStart, i).trim(),
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

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.kind === "object" && (top.currentKey !== null || top.keyStart !== -1)) {
      const valStart = top.valueStart !== -1 ? top.valueStart : (top.keyEnd !== -1 ? top.keyEnd + 1 : str.length);
      regions.push({
        path: top.path,
        startOffset: top.fieldStart,
        endOffset: str.length,
        keyStart: top.keyStart,
        keyEnd: top.keyEnd,
        keyName: top.currentKey || "",
        valueText: str.slice(valStart, str.length).trim(),
        valueStart: valStart,
      });
    }
  }

  return regions;
};

/**
 * 从诊断错误构建占位节点（用于在可视化树中展示无法解析的字段）
 */
export const buildErrorNodesFromDiagnostics = (
  text: string,
  diagnostics: JsonDiagnosticError[],
): JsonToolkitTypes.JsonErrorMap => {
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str || !diagnostics.length) return {};

  const regions = scanJsonFieldRegions(str);
  const sorted = [...diagnostics].sort((a, b) => a.position - b.position);

  type Group = {
    parentPath: string;
    keyName: string;
    startOffset: number;
    endOffset: number;
    valueText: string;
    errors: JsonDiagnosticError[];
    errorTypes: string[];
  };
  const groupsMap = new Map<string, Group>();

  for (const diag of sorted) {
    // 1) 优先用闭区间匹配字段区域（区域结束位置通常是逗号/括号，错误常定位在这里）
    let region = regions.find((r) => diag.position >= r.startOffset && diag.position <= r.endOffset);
    // 2) 未命中时取 startOffset 最近的字段
    if (!region) {
      let best: { r: JsonFieldRegion; dist: number } | undefined;
      for (const r of regions) {
        const d = Math.abs(diag.position - r.startOffset);
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
    } else {
      const location = getLocation(str, diag.position);
      if (location && Array.isArray(location.path) && location.path.length > 0) {
        const segs = [...location.path];
        const last = segs.pop();
        if (last !== undefined) {
          keyName = String(last);
          parentPath =
            segs.length === 0
              ? "$"
              : "$" + segs.map((s) => (typeof s === "number" ? `[${s}]` : `.${s}`)).join("");
        }
      }
    }

    if (!keyName) {
      const window = str.slice(
        Math.max(0, diag.position - 40),
        Math.min(str.length, diag.position + diag.length + 40),
      );
      const m = window.match(/[{,]\s*([^:]{1,60}?)\s*:/);
      if (m) keyName = m[1].trim().replace(/^"|"$/g, "");
    }
    if (!keyName) keyName = `<错误@${diag.line}:${diag.column}>`;

    const mapKey = `${parentPath}||${keyName}`;
    const existing = groupsMap.get(mapKey);
    if (existing) {
      existing.startOffset = Math.min(existing.startOffset, regionStart);
      existing.endOffset = Math.max(existing.endOffset, regionEnd);
      existing.errors.push(diag);
      if (!existing.errorTypes.includes(diag.type)) existing.errorTypes.push(diag.type);
    } else {
      groupsMap.set(mapKey, {
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

  const result: JsonToolkitTypes.JsonErrorMap = {};
  for (const g of groupsMap.values()) {
    const seenMessage = new Set<string>();
    const messages: string[] = [];
    const seenSuggestion = new Set<string>();
    const suggestions: string[] = [];
    for (const e of g.errors) {
      if (!seenMessage.has(e.message)) {
        seenMessage.add(e.message);
        messages.push(e.message);
      }
      if (!seenSuggestion.has(e.suggestion)) {
        seenSuggestion.add(e.suggestion);
        suggestions.push(e.suggestion);
      }
    }

    const errorMessage =
      messages.length <= 2 ? messages.join("；") : `${messages[0]} 等 ${messages.length} 处问题`;

    (result[g.parentPath] ??= []).push({
      keyName: g.keyName,
      errorMessage,
      errorSuggestion: suggestions.join("；"),
      valueText: g.valueText,
      startOffset: g.startOffset,
      endOffset: g.endOffset,
      errorTypes: g.errorTypes,
      hasCriticalError: g.errorTypes.some((t) => CRITICAL_ERROR_TYPES.has(t)),
      errors: g.errors,
    });
  }

  return result;
};

/**
 * 将 diagnostics 按 JSON 路径分组（用于在可视化树节点上显示错误）
 */
export const mapDiagnosticsToPaths = (
  text: string,
  diagnostics: JsonDiagnosticError[],
): Record<string, JsonDiagnosticError[]> => {
  const map: Record<string, JsonDiagnosticError[]> = {};
  const str = typeof text === "string" ? text : String(text ?? "");
  if (!str) return map;

  for (const diag of diagnostics) {
    try {
      const location = getLocation(str, diag.position);
      if (!location || !Array.isArray(location.path)) continue;
      if (location.path.length === 0) {
        (map["$"] ??= []).push(diag);
        continue;
      }
      let path =
        "$" +
        location.path.map((s) => (typeof s === "number" ? `[${s}]` : `.${s}`)).join("");
      // 容错解析会把无法解析的内容塞进空字符串 key，这类错误归到根节点
      if (path === "$.") path = "$";
      (map[path] ??= []).push(diag);
    } catch {
      /* 忽略单条错误的定位失败 */
    }
  }
  return map;
};
