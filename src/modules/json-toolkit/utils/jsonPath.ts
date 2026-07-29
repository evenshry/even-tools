// 简化版 JSONPath 查询实现，支持常用语法：
// $              根节点
// .key           子属性
// ['key']        子属性（带特殊字符）
// [index]        数组索引
// [start:end]    数组切片
// [*]            通配符（数组全部或对象所有值）
// ..key          递归下降
//
// 不支持 filter 表达式 ?()、script 表达式等高级特性。

interface QueryResult {
  ok: boolean;
  error?: string;
  matches: { path: string; value: unknown }[];
}

export const queryJsonPath = (root: unknown, expr: string): QueryResult => {
  const trimmed = expr.trim();
  if (!trimmed) {
    return { ok: false, error: "路径为空", matches: [] };
  }
  if (!trimmed.startsWith("$")) {
    return { ok: false, error: "路径必须以 $ 开头", matches: [] };
  }

  try {
    const tokens = tokenize(trimmed);
    const matches: { path: string; value: unknown }[] = [{ path: "$", value: root }];
    const result = applyTokens(root, "$", tokens, matches);
    return { ok: true, matches: result };
  } catch (e) {
    return { ok: false, error: (e as Error).message, matches: [] };
  }
};

type Token =
  | { kind: "child"; name: string }
  | { kind: "index"; index: number }
  | { kind: "slice"; start: number | null; end: number | null }
  | { kind: "wildcard" }
  | { kind: "recursive"; name?: string };

const tokenize = (expr: string): Token[] => {
  const tokens: Token[] = [];
  let i = 1; // 跳过 $

  while (i < expr.length) {
    const c = expr[i];

    // 跳过分隔符
    if (c === "." || c === "[") {
      // 处理 .. 递归下降
      if (c === "." && expr[i + 1] === ".") {
        i += 2;
        // 收集名称（可选，如果紧跟标识符）
        let name = "";
        while (i < expr.length && /[\w\u4e00-\u9fa5-]/.test(expr[i])) {
          name += expr[i];
          i++;
        }
        if (name) {
          tokens.push({ kind: "recursive", name });
        } else {
          tokens.push({ kind: "recursive" });
        }
        continue;
      }

      if (c === "[") {
        i++;
        // 跳过空白
        while (i < expr.length && /\s/.test(expr[i])) i++;

        if (expr[i] === "'") {
          // ['key']
          i++;
          let name = "";
          while (i < expr.length && expr[i] !== "'") {
            name += expr[i];
            i++;
          }
          i++; // 跳过 '
          while (i < expr.length && expr[i] !== "]") i++; // 跳到 ]
          i++; // 跳过 ]
          tokens.push({ kind: "child", name });
        } else if (expr[i] === "*") {
          i++; // 跳过 *
          while (i < expr.length && expr[i] !== "]") i++;
          i++; // 跳过 ]
          tokens.push({ kind: "wildcard" });
        } else {
          // [index] 或 [start:end]
          let inner = "";
          while (i < expr.length && expr[i] !== "]") {
            inner += expr[i];
            i++;
          }
          i++; // 跳过 ]
          inner = inner.trim();
          if (inner.includes(":")) {
            const [s, e] = inner.split(":");
            tokens.push({
              kind: "slice",
              start: s.trim() === "" ? null : parseInt(s.trim(), 10),
              end: e.trim() === "" ? null : parseInt(e.trim(), 10),
            });
          } else {
            const idx = parseInt(inner, 10);
            if (Number.isNaN(idx)) {
              throw new Error(`无法解析索引：${inner}`);
            }
            tokens.push({ kind: "index", index: idx });
          }
        }
      } else {
        // 单点 .
        i++;
        let name = "";
        while (i < expr.length && /[\w\u4e00-\u9fa5-]/.test(expr[i])) {
          name += expr[i];
          i++;
        }
        if (!name) {
          throw new Error("点号后缺少属性名");
        }
        tokens.push({ kind: "child", name });
      }
    } else if (/\s/.test(c)) {
      i++;
    } else {
      throw new Error(`意外字符：${c} (位置 ${i})`);
    }
  }

  return tokens;
};

const applyTokens = (
  current: unknown,
  currentPath: string,
  tokens: Token[],
  out: { path: string; value: unknown }[]
): { path: string; value: unknown }[] => {
  if (tokens.length === 0) {
    out.push({ path: currentPath, value: current });
    return out;
  }
  const [head, ...rest] = tokens;

  switch (head.kind) {
    case "child": {
      if (current !== null && typeof current === "object" && !Array.isArray(current)) {
        const v = (current as Record<string, unknown>)[head.name];
        applyTokens(v, `${currentPath}.${head.name}`, rest, out);
      }
      break;
    }
    case "index": {
      if (Array.isArray(current)) {
        const v = current[head.index];
        applyTokens(v, `${currentPath}[${head.index}]`, rest, out);
      }
      break;
    }
    case "slice": {
      if (Array.isArray(current)) {
        const len = current.length;
        const start = head.start === null ? 0 : head.start < 0 ? Math.max(len + head.start, 0) : Math.min(head.start, len);
        const end = head.end === null ? len : head.end < 0 ? Math.max(len + head.end, 0) : Math.min(head.end, len);
        for (let i = start; i < end; i++) {
          applyTokens(current[i], `${currentPath}[${i}]`, rest, out);
        }
      }
      break;
    }
    case "wildcard": {
      if (Array.isArray(current)) {
        current.forEach((v, i) => applyTokens(v, `${currentPath}[${i}]`, rest, out));
      } else if (current !== null && typeof current === "object") {
        Object.entries(current as Record<string, unknown>).forEach(([k, v]) =>
          applyTokens(v, `${currentPath}.${k}`, rest, out)
        );
      }
      break;
    }
    case "recursive": {
      // 收集所有后代
      const collect = (v: unknown, p: string) => {
        if (head.name) {
          // 如果有 name，匹配同名属性
          if (v !== null && typeof v === "object") {
            if (Array.isArray(v)) {
              v.forEach((item, i) => collect(item, `${p}[${i}]`));
            } else {
              const obj = v as Record<string, unknown>;
              if (head.name in obj) {
                applyTokens(obj[head.name], `${p}.${head.name}`, rest, out);
              }
              Object.entries(obj).forEach(([k, val]) => collect(val, `${p}.${k}`));
            }
          }
        } else {
          // 无 name，所有后代都作为新起点
          applyTokens(v, p, rest, out);
          if (v !== null && typeof v === "object") {
            if (Array.isArray(v)) {
              v.forEach((item, i) => collect(item, `${p}[${i}]`));
            } else {
              Object.entries(v as Record<string, unknown>).forEach(([k, val]) =>
                collect(val, `${p}.${k}`)
              );
            }
          }
        }
      };
      collect(current, currentPath);
      break;
    }
  }

  return out;
};
