// JSON 与其他格式互转：YAML、CSV、TSV、XML（轻量）

// ============ JSON -> YAML ============
export const jsonToYaml = (value: unknown, indent = 2): string => {
  const lines: string[] = [];
  const indentStr = " ".repeat(indent);

  const emit = (v: unknown, depth: number, key?: string) => {
    const prefix = key !== undefined ? `${indentStr.repeat(depth)}${key}:` : indentStr.repeat(depth);

    if (v === null) {
      lines.push(key !== undefined ? `${prefix} null` : `${indentStr.repeat(depth)}null`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(key !== undefined ? `${prefix} []` : `${indentStr.repeat(depth)}[]`);
      } else {
        if (key !== undefined) lines.push(prefix);
        v.forEach((item) => {
          if (item !== null && typeof item === "object") {
            lines.push(`${indentStr.repeat(depth + 1)}-`);
            emit(item, depth + 2);
          } else {
            lines.push(`${indentStr.repeat(depth + 1)}- ${formatYamlScalar(item)}`);
          }
        });
      }
    } else if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0) {
        lines.push(key !== undefined ? `${prefix} {}` : `${indentStr.repeat(depth)}{}`);
      } else {
        if (key !== undefined) lines.push(prefix);
        entries.forEach(([k, val]) => emit(val, depth + 1, k));
      }
    } else {
      lines.push(key !== undefined ? `${prefix} ${formatYamlScalar(v)}` : `${indentStr.repeat(depth)}${formatYamlScalar(v)}`);
    }
  };

  emit(value, 0);
  return lines.join("\n");
};

const formatYamlScalar = (v: unknown): string => {
  if (v === null) return "null";
  if (typeof v === "string") {
    // 需要加引号的情况：空串、含特殊字符、纯数字串、含 true/false/null 等
    if (
      v === "" ||
      /^\s|\s$/.test(v) ||
      /^-?\d/.test(v) ||
      /^(true|false|null|yes|no|on|off)$/i.test(v) ||
      /[:#{}[\],&*?|<>=!%@`"'\n]/.test(v)
    ) {
      return JSON.stringify(v);
    }
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v);
};

// ============ JSON -> CSV / TSV ============
// 仅支持对象数组；非数组或空数组返回空串
export const jsonToCsv = (value: unknown, delimiter = ","): string => {
  if (!Array.isArray(value) || value.length === 0) return "";
  // 收集所有对象的键（保序去重）
  const keys: string[] = [];
  const seen = new Set<string>();
  value.forEach((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.keys(item as object).forEach((k) => {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      });
    }
  });
  if (keys.length === 0) return "";

  const escape = (s: string) => {
    if (delimiter === "\t") return s.replace(/\t/g, " ").replace(/\n/g, " ");
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const rows: string[] = [];
  rows.push(keys.map(escape).join(delimiter));
  value.forEach((item) => {
    const row = keys.map((k) => escape(cell((item as Record<string, unknown>)?.[k])));
    rows.push(row.join(delimiter));
  });
  return rows.join("\n");
};

export const jsonToTsv = (value: unknown): string => jsonToCsv(value, "\t");

// ============ JSON -> XML ============
export const jsonToXml = (value: unknown, rootName = "root"): string => {
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const sanitizeTag = (s: string) => {
    const cleaned = s.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (/^\d/.test(cleaned)) return `_${cleaned}`;
    return cleaned || "_";
  };

  const emit = (v: unknown, tag: string, depth: number): string => {
    const pad = "  ".repeat(depth);
    const t = sanitizeTag(tag);

    if (v === null) return `${pad}<${t} />`;
    if (Array.isArray(v)) {
      return v
        .map((item) => emit(item, tag, depth))
        .join("\n");
    }
    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0) return `${pad}<${t} />`;
      const inner = entries
        .map(([k, val]) => emit(val, k, depth + 1))
        .join("\n");
      return `${pad}<${t}>\n${inner}\n${pad}</${t}>`;
    }
    if (typeof v === "string") return `${pad}<${t}>${escapeXml(v)}</${t}>`;
    return `${pad}<${t}>${String(v)}</${t}>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${emit(value, rootName, 0)}`;
};

// ============ JSON -> Properties (扁平 key=value) ============
export const jsonToProperties = (value: unknown): string => {
  const lines: string[] = [];
  const escapeProp = (s: string) => s.replace(/[:=\\#]/g, (m) => `\\${m}`);
  const formatVal = (v: unknown): string => {
    if (v === null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const walk = (v: unknown, prefix: string) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0) {
        lines.push(`${prefix}=`);
        return;
      }
      entries.forEach(([k, val]) => {
        const next = prefix ? `${prefix}.${k}` : k;
        if (val !== null && typeof val === "object") {
          walk(val, next);
        } else {
          lines.push(`${escapeProp(next)}=${escapeProp(formatVal(val))}`);
        }
      });
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${prefix}=`);
        return;
      }
      v.forEach((item, i) => {
        const next = `${prefix}[${i}]`;
        if (item !== null && typeof item === "object") {
          walk(item, next);
        } else {
          lines.push(`${escapeProp(next)}=${escapeProp(formatVal(item))}`);
        }
      });
    } else {
      lines.push(`${escapeProp(prefix)}=${escapeProp(formatVal(v))}`);
    }
  };

  walk(value, "");
  return lines.join("\n");
};
