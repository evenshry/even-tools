import type { JsonToolkitTypes } from "../data/interface";

// 获取缩进字符串
export const getIndentString = (style: JsonToolkitTypes.IndentStyle): string => {
  if (style === "tab") return "\t";
  if (style === 0) return "";
  return " ".repeat(style);
};

// 验证 JSON 字符串（严格 JSON.parse 语义）
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
  indent: JsonToolkitTypes.IndentStyle = 2,
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
  text: string,
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

// 转义 JSON 字符串（借用 JSON.stringify，覆盖全部控制字符）
export const escapeJsonString = (text: string): string => JSON.stringify(text).slice(1, -1);

// 反转义 JSON 字符串（兼容用户输入包含或不包含外层引号）
export const unescapeJsonString = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const hasDouble = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
  const hasSingle = trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'");

  if (hasDouble) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* 退化为逐字符处理 */
    }
  }

  const body = hasDouble || hasSingle ? trimmed.slice(1, -1) : trimmed;

  if (!hasSingle) {
    try {
      return JSON.parse(`"${body}"`);
    } catch {
      /* 退化为逐字符处理 */
    }
    try {
      return JSON.parse(`"${body.replace(/"/g, '\\"')}"`);
    } catch {
      /* 退化为逐字符处理 */
    }
  }

  // 兜底：逐字符反转义，未知转义序列原样保留
  const escapeMap: Record<string, string> = {
    '"': '"',
    "'": "'",
    "\\": "\\",
    "/": "/",
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t",
  };
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\" || i === body.length - 1) {
      out += ch;
      continue;
    }
    const next = body[i + 1];
    if (escapeMap[next] !== undefined) {
      out += escapeMap[next];
      i++;
      continue;
    }
    if (next === "u" && /^[0-9a-fA-F]{4}$/.test(body.slice(i + 2, i + 6))) {
      out += String.fromCharCode(parseInt(body.slice(i + 2, i + 6), 16));
      i += 5;
      continue;
    }
    out += ch;
  }
  return out;
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
export const computeStats = (value: unknown, rawText: string): JsonToolkitTypes.JsonStats => {
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

// 致命错误类型：该字段的值无法可靠解析，树中应展示为错误节点
const CRITICAL_ERROR_TYPES = new Set([
  "invalid_number",
  "value_expected",
  "property_name_unquoted",
  "colon_expected",
]);

type BuildContext = {
  errorNodes?: JsonToolkitTypes.JsonErrorMap;
  nodeOffsets?: Record<string, number>;
  usedUids: Map<string, number>;
};

// 生成 antd Tree 唯一 key：同名 path 出现多次时追加序号
const makeUid = (ctx: BuildContext, path: string): string => {
  const used = ctx.usedUids.get(path) ?? 0;
  ctx.usedUids.set(path, used + 1);
  return used === 0 ? path : `${path}#${used}`;
};

const createErrorNode = (
  ctx: BuildContext,
  parentPath: string,
  error: JsonToolkitTypes.JsonErrorGroup,
  depth: number,
): JsonToolkitTypes.TreeNode => {
  const path = `${parentPath}.${error.keyName}`;
  return {
    uid: makeUid(ctx, path),
    depth,
    keyName: error.keyName,
    valueText: error.valueText || error.errorMessage,
    type: "undefined",
    path,
    expandable: false,
    isError: true,
    errorMessage: error.errorMessage,
    errorSuggestion: error.errorSuggestion,
    errorOriginalValue: error.valueText,
    errorStartOffset: error.startOffset,
    errors: error.errors,
  };
};

// 按源文本偏移混排（无偏移的保持原顺序排在后面）
const sortByOffset = (nodes: JsonToolkitTypes.TreeNode[]): JsonToolkitTypes.TreeNode[] =>
  nodes
    .map((node, idx) => ({ node, idx }))
    .sort((a, b) => {
      const ao = a.node.errorStartOffset;
      const bo = b.node.errorStartOffset;
      if (ao !== undefined && bo !== undefined) return ao - bo;
      if (ao !== undefined) return -1;
      if (bo !== undefined) return 1;
      return a.idx - b.idx;
    })
    .map((item) => item.node);

const buildNode = (
  value: unknown,
  keyName: string,
  path: string,
  depth: number,
  ctx: BuildContext,
): JsonToolkitTypes.TreeNode => {
  const type = detectType(value);
  const node: JsonToolkitTypes.TreeNode = {
    uid: makeUid(ctx, path),
    depth,
    keyName,
    valueText: "",
    value,
    type,
    path,
    expandable: type === "object" || type === "array",
    errorStartOffset: ctx.nodeOffsets?.[path],
  };

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const errors = ctx.errorNodes?.[path] ?? [];

    // 有致命错误的字段由错误节点展示，避免出现不可信的解析值
    const criticalKeys = new Set(
      errors
        .filter(
          (e) =>
            e.hasCriticalError || e.errorTypes.some((t) => CRITICAL_ERROR_TYPES.has(t)),
        )
        .map((e) => e.keyName),
    );
    const entries = Object.entries(obj).filter(([k]) => !criticalKeys.has(k));

    node.valueText = `{} (${entries.length} 项)`;

    const parsedKeys = new Set(entries.map(([k]) => k));
    const parsedOffsets = new Set<number>();
    const children = entries.map(([k, v]) => {
      const childPath = `${path}.${k}`;
      const offset = ctx.nodeOffsets?.[childPath];
      if (offset !== undefined) parsedOffsets.add(offset);
      return buildNode(v, k, childPath, depth + 1, ctx);
    });

    const errorChildren = errors
      .filter((e) => !(parsedKeys.has(e.keyName) && !e.hasCriticalError))
      .filter((e) => !(parsedOffsets.has(e.startOffset) && !e.hasCriticalError))
      .map((e) => createErrorNode(ctx, path, e, depth + 1));

    node.children = sortByOffset([...children, ...errorChildren]);
  } else if (type === "array") {
    const arr = value as unknown[];
    node.valueText = `[] (${arr.length} 项)`;
    const children = arr.map((item, index) =>
      buildNode(item, String(index), `${path}[${index}]`, depth + 1, ctx),
    );
    const errorChildren = (ctx.errorNodes?.[path] ?? []).map((e) =>
      createErrorNode(ctx, path, e, depth + 1),
    );
    node.children = [...children, ...errorChildren];
  } else {
    node.valueText = formatPrimitive(value, type);
  }

  // 自身无偏移时取子节点最小偏移，保证空对象/数组也能排到正确位置
  if (node.errorStartOffset === undefined && node.children?.length) {
    const offsets = node.children
      .map((child) => child.errorStartOffset)
      .filter((o): o is number => o !== undefined);
    if (offsets.length > 0) node.errorStartOffset = Math.min(...offsets);
  }

  return node;
};

/**
 * 构建树形数据（用于 Antd Tree 组件）
 * errorNodes: 按父路径组织的错误节点信息
 * nodeOffsets: 字段路径 -> 源文本偏移，用于混排解析节点与错误节点
 */
export const buildTree = (
  value: unknown,
  errorNodes?: JsonToolkitTypes.JsonErrorMap,
  nodeOffsets?: Record<string, number>,
): JsonToolkitTypes.TreeNode => {
  const ctx: BuildContext = { errorNodes, nodeOffsets, usedUids: new Map() };
  return buildNode(value, "$", "$", 0, ctx);
};

// 格式化单个值的小工具，给外部用
export const formatPrimitive = (
  value: unknown,
  type: JsonToolkitTypes.JsonNodeType,
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
  value: unknown,
): { type: JsonToolkitTypes.JsonNodeType; preview: string } => {
  const type = detectType(value);
  if (type === "object" || type === "array") {
    let json = "";
    try {
      json = JSON.stringify(value);
    } catch {
      json = formatPrimitive(value, type);
    }
    const count =
      type === "array"
        ? (value as unknown[]).length
        : Object.keys(value as Record<string, unknown>).length;
    const preview = json.length > 100 ? `${json.slice(0, 100)}…` : json;
    return { type, preview: `${preview} (${count} 项)` };
  }
  return { type, preview: formatPrimitive(value, type) };
};
