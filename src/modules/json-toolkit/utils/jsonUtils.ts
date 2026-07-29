import type { JsonToolkitTypes } from "../data/interface";
import { isErrorValue } from "./jsonDiagnostics";
import type { JsonDiagnosticError } from "./jsonDiagnostics";

// 获取缩进字符串
export const getIndentString = (style: JsonToolkitTypes.IndentStyle): string => {
  if (style === "tab") return "\t";
  if (style === 0) return "";
  return " ".repeat(style);
};

// 验证 JSON 字符串
export const validateJson = (text: string): JsonToolkitTypes.ValidationResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isValid: false, error: "输入为空" };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { isValid: true, parsed };
  } catch (e) {
    const err = e as Error;
    const message = err.message;

    // 尝试从 message 中提取位置：SyntaxError: Unexpected token ... in JSON at position N
    const posMatch = message.match(/position\s+(\d+)/i);
    let errorLine: number | undefined;
    let errorColumn: number | undefined;
    let friendly = message;

    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const upTo = trimmed.slice(0, pos);
      const lines = upTo.split("\n");
      errorLine = lines.length;
      errorColumn = lines[lines.length - 1].length + 1;
      friendly = `${message.split(" at position")[0]} （第 ${errorLine} 行，第 ${errorColumn} 列）`;
    }

    return {
      isValid: false,
      error: friendly,
      errorLine,
      errorColumn,
    };
  }
};

// 格式化 JSON
export const formatJson = (
  text: string,
  indent: JsonToolkitTypes.IndentStyle = 2
): { ok: true; result: string } | { ok: false; error: string } => {
  const validation = validateJson(text);
  if (!validation.isValid || validation.parsed === undefined) {
    return { ok: false, error: validation.error || "无效 JSON" };
  }
  try {
    return {
      ok: true,
      result: JSON.stringify(validation.parsed, null, getIndentString(indent)),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

// 压缩 JSON
export const minifyJson = (
  text: string
): { ok: true; result: string } | { ok: false; error: string } => {
  const validation = validateJson(text);
  if (!validation.isValid || validation.parsed === undefined) {
    return { ok: false, error: validation.error || "无效 JSON" };
  }
  try {
    return { ok: true, result: JSON.stringify(validation.parsed) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

// 转义 JSON 字符串（将任意字符串转成可放进 JSON 字符串字面量的形式）
export const escapeJsonString = (text: string): string => {
  // 先把已转义的反斜杠保护起来
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/[\b]/g, "\\b"); // [\b] 表示退格符，避免在源码中出现控制字符
};

// 反转义 JSON 字符串
export const unescapeJsonString = (text: string): string => {
  // 兼容用户输入包含或不包含外层引号
  let input = text.trim();
  if (
    input.length >= 2 &&
    ((input.startsWith('"') && input.endsWith('"')) ||
      (input.startsWith("'") && input.endsWith("'")))
  ) {
    input = input.slice(1, -1);
  }
  try {
    // 借用 JSON.parse 完成反转义
    return JSON.parse(`"${input.replace(/"/g, '\\"')}"`);
  } catch {
    // 退化为手动反转义
    return input
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\f/g, "\f")
      .replace(/\\b/g, "\u0008")
      .replace(/\\\\/g, "\\");
  }
};

// 探测节点类型
export const detectType = (value: unknown): JsonToolkitTypes.JsonNodeType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "undefined";
};

// 计算字节大小（UTF-8）
export const byteSize = (text: string): number => {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
};

// 计算 JSON 统计信息
export const computeStats = (
  value: unknown,
  rawText: string
): JsonToolkitTypes.JsonStats => {
  const stats: JsonToolkitTypes.JsonStats = {
    size: byteSize(rawText),
    keys: 0,
    depth: 0,
    arrays: 0,
    objects: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    totalNodes: 0,
  };

  const walk = (v: unknown, depth: number) => {
    stats.depth = Math.max(stats.depth, depth);
    const t = detectType(v);
    switch (t) {
      case "object":
        stats.objects++;
        stats.totalNodes++;
        for (const k of Object.keys(v as object)) {
          stats.keys++;
          walk((v as Record<string, unknown>)[k], depth + 1);
        }
        break;
      case "array":
        stats.arrays++;
        stats.totalNodes++;
        (v as unknown[]).forEach((item) => walk(item, depth + 1));
        break;
      case "string":
        stats.strings++;
        stats.totalNodes++;
        break;
      case "number":
        stats.numbers++;
        stats.totalNodes++;
        break;
      case "boolean":
        stats.booleans++;
        stats.totalNodes++;
        break;
      case "null":
        stats.nulls++;
        stats.totalNodes++;
        break;
    }
  };

  walk(value, 0);
  return stats;
};

// 格式化字节数为人类可读
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// 构建错误节点
const buildErrorNode = (key: string, path: string, value: { __jsonError: true; __errorMessage: string; __errorSuggestion: string }): JsonToolkitTypes.TreeNode => ({
  key: path,
  label: `❌ ${value.__errorMessage}`,
  keyName: key,
  valueText: value.__errorMessage,
  value,
  type: "undefined",
  path,
  expandable: false,
  isError: true,
  errorMessage: value.__errorMessage,
  errorSuggestion: value.__errorSuggestion,
});

// 致命错误类型集合（与 jsonDiagnostics.ts 中的定义保持一致）
// 表明该字段的值从根本上无法正确解析，解析结果不可靠
const CRITICAL_ERROR_TYPES = new Set([
  "invalid_number",
  "value_expected",
  "property_name_unquoted",
  "colon_expected",
]);

// 构建树形数据（用于 Antd Tree 组件）
// errorNodes: 按父路径组织的错误节点信息
// nodeOffsets: 所有字段在源文本中的偏移映射（path -> startOffset），用于混排解析节点和错误节点
export const buildTree = (
  value: unknown,
  path = "$",
  errorNodes?: Record<string, { keyName: string; errorMessage: string; errorSuggestion: string; valueText: string; startOffset: number; errorTypes?: string[]; hasCriticalError?: boolean; errors?: JsonDiagnosticError[] }[]>,
  nodeOffsets?: Record<string, number>
): JsonToolkitTypes.TreeNode => {
  if (isErrorValue(value)) {
    return buildErrorNode("$", path, value);
  }

  const type = detectType(value);
  const node: JsonToolkitTypes.TreeNode = {
    key: path,
    label: "",
    keyName: "$",
    valueText: "",
    value,
    type,
    path,
    expandable: type === "object" || type === "array",
  };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    let entries = Object.entries(obj).filter(([k]) => k !== "__error" && k !== "__error_key__");
    const errorEntry = obj.__error;

    // 检测哪些字段有致命错误类型，这些字段应作为错误节点展示，而非解析节点
    const criticalKeys = new Set<string>();
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        if (err.hasCriticalError || (err.errorTypes && err.errorTypes.some((t) => CRITICAL_ERROR_TYPES.has(t)))) {
          criticalKeys.add(err.keyName);
        }
      }
    }
    // 过滤掉有致命错误的字段（它们将以错误节点形式展示）
    if (criticalKeys.size > 0) {
      entries = entries.filter(([k]) => !criticalKeys.has(k));
    }

    const count = entries.length;
    node.valueText = `{} (${count} 项)`;
    node.label = node.valueText;
    // 构建已解析的子节点集合（用于过滤重复的错误节点）
    const parsedOffsets = new Set<number>();
    // 记录已解析的 keyName，用于过滤重复错误节点
    const parsedKeyNames = new Set(entries.map(([k]) => k));
    const parsedChildren = entries.map(([k, v]) => {
      const childPath = `${path}.${k}`;
      const childNode = buildTreeChild(k, v, childPath, errorNodes, nodeOffsets);
      // 从 nodeOffsets 中获取该字段的真实偏移
      if (nodeOffsets) {
        if (childPath in nodeOffsets) {
          childNode.errorStartOffset = nodeOffsets[childPath];
          parsedOffsets.add(nodeOffsets[childPath]);
        } else {
          for (const [p, off] of Object.entries(nodeOffsets)) {
            const isExact = p === childPath;
            const isDirectChild = p.startsWith(childPath + ".") || p.startsWith(childPath + "[");
            if (isExact || isDirectChild) {
              parsedOffsets.add(off);
            }
            if (isExact) {
              childNode.errorStartOffset = off;
            }
          }
        }
      }
      return childNode;
    });
    // 追加未解析的错误节点（过滤掉已被 jsonc-parser 成功解析的字段，避免重复）
    const errorChildren: JsonToolkitTypes.TreeNode[] = [];
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        // 若该 key 已被 jsonc-parser 成功解析，以内联错误显示，不再创建独立错误节点
        // 但有致命错误的字段已被过滤掉（不在 parsedKeyNames 中），所以会正常展示为错误节点
        if (parsedKeyNames.has(err.keyName) && !err.hasCriticalError) continue;
        // 跳过偏移已被解析节点占用的字段
        if (parsedOffsets.has(err.startOffset) && !err.hasCriticalError) continue;
        errorChildren.push({
          key: `${path}.${err.keyName}`,
          label: `❌ ${err.errorMessage}`,
          keyName: err.keyName,
          valueText: err.valueText || err.errorMessage,
          value: undefined,
          type: "undefined",
          path: `${path}.${err.keyName}`,
          expandable: false,
          isError: true,
          errorMessage: err.errorMessage,
          errorSuggestion: err.errorSuggestion,
          errorOriginalValue: err.valueText,
          errorStartOffset: err.startOffset,
          errors: err.errors,
        });
      }
    }
    // 解析错误标记的子节点
    const markerChildren: JsonToolkitTypes.TreeNode[] = [];
    if (isErrorValue(errorEntry)) {
      markerChildren.push(buildErrorNode("__error__", `${path}.__error__`, errorEntry));
    }
    // 推断当前节点 offset：若自身无 offset，取子节点最小 offset（确保空对象/数组也能排对位置）
    if (node.errorStartOffset === undefined && node.children) {
      const childOffsets = node.children.map((c) => c.errorStartOffset).filter((o): o is number => o !== undefined);
      if (childOffsets.length > 0) {
        node.errorStartOffset = Math.min(...childOffsets);
      }
    }
    // 按真实文本偏移混排（有 offset 的排在前面按偏移排序；没有的排在后面保持原始顺序）
    const allChildren = [...parsedChildren, ...errorChildren, ...markerChildren].map((n, idx) => ({ node: n, idx }));
    allChildren.sort((a, b) => {
      const ao = a.node.errorStartOffset;
      const bo = b.node.errorStartOffset;
      if (ao !== undefined && bo !== undefined) return ao - bo;
      if (ao !== undefined && bo === undefined) return -1;
      if (ao === undefined && bo !== undefined) return 1;
      return a.idx - b.idx;
    });
    node.children = allChildren.map((item) => item.node);
  } else if (type === "array") {
    const arr = value as unknown[];
    node.valueText = `[] (${arr.length} 项)`;
    node.label = node.valueText;
    node.children = arr.map((v, i) => {
      const childPath = `${path}[${i}]`;
      return buildTreeChild(String(i), v, childPath, errorNodes, nodeOffsets);
    });
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        node.children.push({
          key: `${path}.${err.keyName}`,
          label: `❌ ${err.errorMessage}`,
          keyName: err.keyName,
          valueText: err.valueText || err.errorMessage,
          value: undefined,
          type: "undefined",
          path: `${path}.${err.keyName}`,
          expandable: false,
          isError: true,
          errorMessage: err.errorMessage,
          errorSuggestion: err.errorSuggestion,
          errorOriginalValue: err.valueText,
          errorStartOffset: err.startOffset,
          errors: err.errors,
        });
      }
    }
    // 推断当前节点 offset：若自身无 offset，取子节点最小 offset
    if (node.errorStartOffset === undefined && node.children) {
      const childOffsets = node.children.map((c) => c.errorStartOffset).filter((o): o is number => o !== undefined);
      if (childOffsets.length > 0) {
        node.errorStartOffset = Math.min(...childOffsets);
      }
    }
  } else {
    node.valueText = formatPrimitive(value, type);
    node.label = node.valueText;
  }

  return node;
};

const buildTreeChild = (
  key: string,
  value: unknown,
  path: string,
  errorNodes?: Record<string, { keyName: string; errorMessage: string; errorSuggestion: string; valueText: string; startOffset: number; errorTypes?: string[]; hasCriticalError?: boolean; errors?: JsonDiagnosticError[] }[]>,
  nodeOffsets?: Record<string, number>
): JsonToolkitTypes.TreeNode => {
  if (isErrorValue(value)) {
    return buildErrorNode(key, path, value);
  }

  const type = detectType(value);
  const node: JsonToolkitTypes.TreeNode = {
    key: path,
    label: "",
    keyName: key,
    valueText: "",
    value,
    type,
    path,
    expandable: type === "object" || type === "array",
  };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    let entries = Object.entries(obj).filter(([k]) => k !== "__error" && k !== "__error_key__");
    const errorEntry = obj.__error;

    // 检测哪些字段有致命错误类型
    const criticalKeys = new Set<string>();
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        if (err.hasCriticalError || (err.errorTypes && err.errorTypes.some((t) => CRITICAL_ERROR_TYPES.has(t)))) {
          criticalKeys.add(err.keyName);
        }
      }
    }
    if (criticalKeys.size > 0) {
      entries = entries.filter(([k]) => !criticalKeys.has(k));
    }

    const count = entries.length;
    node.valueText = `{} (${count})`;
    node.label = `${key}: ${node.valueText}`;
    // 构建已解析的子节点集合（用于过滤重复的错误节点）
    const parsedOffsets = new Set<number>();
    // 记录已解析的 keyName，用于过滤重复错误节点
    const parsedKeyNames = new Set(entries.map(([k]) => k));
    const parsedChildren = entries.map(([k, v]) => {
      const childPath = `${path}.${k}`;
      const childNode = buildTreeChild(k, v, childPath, errorNodes, nodeOffsets);
      if (nodeOffsets) {
        if (childPath in nodeOffsets) {
          childNode.errorStartOffset = nodeOffsets[childPath];
          parsedOffsets.add(nodeOffsets[childPath]);
        } else {
          for (const [p, off] of Object.entries(nodeOffsets)) {
            const isExact = p === childPath;
            const isDirectChild = p.startsWith(childPath + ".") || p.startsWith(childPath + "[");
            if (isExact || isDirectChild) {
              parsedOffsets.add(off);
            }
            if (isExact) {
              childNode.errorStartOffset = off;
            }
          }
        }
      }
      return childNode;
    });
    const markerChildren: JsonToolkitTypes.TreeNode[] = [];
    if (isErrorValue(errorEntry)) {
      markerChildren.push(buildErrorNode("__error__", `${path}.__error__`, errorEntry));
    }
    const errorChildren: JsonToolkitTypes.TreeNode[] = [];
    // 追加未解析的错误节点（过滤掉已被 jsonc-parser 成功解析的字段，避免重复）
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        // 若该 key 已被 jsonc-parser 成功解析，以内联错误显示，不再创建独立错误节点
        // 但有致命错误的字段已被过滤掉（不在 parsedKeyNames 中），所以会正常展示为错误节点
        if (parsedKeyNames.has(err.keyName) && !err.hasCriticalError) continue;
        // 跳过偏移已被解析节点占用的字段
        if (parsedOffsets.has(err.startOffset) && !err.hasCriticalError) continue;
        errorChildren.push({
          key: `${path}.${err.keyName}`,
          label: `❌ ${err.errorMessage}`,
          keyName: err.keyName,
          valueText: err.valueText || err.errorMessage,
          value: undefined,
          type: "undefined",
          path: `${path}.${err.keyName}`,
          expandable: false,
          isError: true,
          errorMessage: err.errorMessage,
          errorSuggestion: err.errorSuggestion,
          errorOriginalValue: err.valueText,
          errorStartOffset: err.startOffset,
          errors: err.errors,
        });
      }
    }
    // 推断当前节点 offset：若自身无 offset，取子节点最小 offset（确保空对象/数组也能排对位置）
    if (node.errorStartOffset === undefined && node.children) {
      const childOffsets = node.children.map((c) => c.errorStartOffset).filter((o): o is number => o !== undefined);
      if (childOffsets.length > 0) {
        node.errorStartOffset = Math.min(...childOffsets);
      }
    }
    // 按 startOffset 排序（有 offset 的排在前面；没有的排在后面保持原始顺序）
    const allChildren = [...parsedChildren, ...errorChildren, ...markerChildren].map((n, idx) => ({ node: n, idx }));
    allChildren.sort((a, b) => {
      const ao = a.node.errorStartOffset;
      const bo = b.node.errorStartOffset;
      if (ao !== undefined && bo !== undefined) return ao - bo;
      if (ao !== undefined && bo === undefined) return -1;
      if (ao === undefined && bo !== undefined) return 1;
      return a.idx - b.idx;
    });
    node.children = allChildren.map((item) => item.node);
  } else if (type === "array") {
    const arr = value as unknown[];
    node.valueText = `[] (${arr.length})`;
    node.label = `${key}: ${node.valueText}`;
    const arrChildren = arr.map((v, i) => {
      const childPath = `${path}[${i}]`;
      return buildTreeChild(String(i), v, childPath, errorNodes, nodeOffsets);
    });
    // 追加未解析的错误节点（数组路径）
    if (errorNodes && errorNodes[path]) {
      for (const err of errorNodes[path]) {
        arrChildren.push({
          key: `${path}.${err.keyName}`,
          label: `❌ ${err.errorMessage}`,
          keyName: err.keyName,
          valueText: err.valueText || err.errorMessage,
          value: undefined,
          type: "undefined",
          path: `${path}.${err.keyName}`,
          expandable: false,
          isError: true,
          errorMessage: err.errorMessage,
          errorSuggestion: err.errorSuggestion,
          errorOriginalValue: err.valueText,
          errorStartOffset: err.startOffset,
          errors: err.errors,
        });
      }
    }
    // 推断当前节点 offset：若自身无 offset，取子节点最小 offset
    if (node.errorStartOffset === undefined && arrChildren.length > 0) {
      const childOffsets = arrChildren.map((c) => c.errorStartOffset).filter((o): o is number => o !== undefined);
      if (childOffsets.length > 0) {
        node.errorStartOffset = Math.min(...childOffsets);
      }
    }
    node.children = arrChildren;
  } else {
    node.valueText = formatPrimitive(value, type);
    node.label = `${key}: ${node.valueText}`;
  }

  return node;
};

// 格式化单个值的小工具，给外部用
export const formatPrimitive = (
  value: unknown,
  type: JsonToolkitTypes.JsonNodeType
): string => {
  switch (type) {
    case "string":
      return `"${value}"`;
    case "number":
    case "boolean":
      return String(value);
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    default:
      return String(value);
  }
};

// 描述一个值：返回类型与可读预览
export const describeValue = (
  value: unknown
): { type: JsonToolkitTypes.JsonNodeType; preview: string } => {
  const type = detectType(value);
  return { type, preview: formatPrimitive(value, type) };
};
