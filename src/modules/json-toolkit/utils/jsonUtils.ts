import type { JsonToolkitTypes } from "../data/interface";

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

// 构建树形数据（用于 Antd Tree 组件）
export const buildTree = (
  value: unknown,
  path = "$"
): JsonToolkitTypes.TreeNode => {
  const type = detectType(value);
  const node: JsonToolkitTypes.TreeNode = {
    key: path,
    label: "",
    value,
    type,
    path,
    expandable: type === "object" || type === "array",
  };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    node.label = `{} ${Object.keys(obj).length} 项`;
    node.children = Object.entries(obj).map(([k, v]) => {
      const childPath = `${path}.${k}`;
      return buildTreeChild(k, v, childPath);
    });
  } else if (type === "array") {
    const arr = value as unknown[];
    node.label = `[] ${arr.length} 项`;
    node.children = arr.map((v, i) => {
      const childPath = `${path}[${i}]`;
      return buildTreeChild(String(i), v, childPath);
    });
  } else {
    node.label = formatPrimitive(value, type);
  }

  return node;
};

const buildTreeChild = (
  key: string,
  value: unknown,
  path: string
): JsonToolkitTypes.TreeNode => {
  const type = detectType(value);
  const node: JsonToolkitTypes.TreeNode = {
    key: path,
    label: "",
    value,
    type,
    path,
    expandable: type === "object" || type === "array",
  };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    node.label = `${key}: {} (${Object.keys(obj).length})`;
    node.children = Object.entries(obj).map(([k, v]) => {
      const childPath = `${path}.${k}`;
      return buildTreeChild(k, v, childPath);
    });
  } else if (type === "array") {
    const arr = value as unknown[];
    node.label = `${key}: [] (${arr.length})`;
    node.children = arr.map((v, i) => {
      const childPath = `${path}[${i}]`;
      return buildTreeChild(String(i), v, childPath);
    });
  } else {
    node.label = `${key}: ${formatPrimitive(value, type)}`;
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
