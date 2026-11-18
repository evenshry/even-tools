import type { RegexSandboxTypes } from "../data/interface";

/** 单次测试最多返回的匹配数量，避免超长输入或异常表达式把页面卡死 */
export const MAX_MATCHES = 1000;

/** 把 RegExp 执行结果转换为统一结构 */
function toMatchResult(match: RegExpExecArray): RegexSandboxTypes.MatchResult {
  return {
    match: match[0],
    index: match.index,
    groups: match.slice(1),
    namedGroups: match.groups ? { ...match.groups } : undefined,
  };
}

/**
 * 全局模式下推进 lastIndex。
 * 零长度匹配（如 a*、^、断言）时 exec 不会自行前进，必须手动推进，
 * 否则会陷入死循环；u 模式下按码点推进，避免截断代理对。
 */
function advanceLastIndex(regex: RegExp, input: string, unicode: boolean) {
  const codePoint = unicode ? input.codePointAt(regex.lastIndex) : undefined;
  const step = codePoint === undefined ? 1 : String.fromCodePoint(codePoint).length;
  regex.lastIndex += step;
}

export function executeRegex(
  pattern: string,
  flags: string,
  input: string
): RegexSandboxTypes.TestResult {
  try {
    const regex = new RegExp(pattern, flags);
    const matches: RegexSandboxTypes.MatchResult[] = [];
    const isGlobal = flags.includes("g") || flags.includes("y");
    const unicode = flags.includes("u");
    let truncated = false;

    if (!isGlobal) {
      const match = regex.exec(input);
      if (match) {
        matches.push(toMatchResult(match));
      }
    } else {
      while (true) {
        if (matches.length >= MAX_MATCHES) {
          // 多执行一次确认是否还有剩余匹配，避免恰好 1000 个时误报截断
          truncated = regex.exec(input) !== null;
          break;
        }
        const match = regex.exec(input);
        if (!match) break;

        matches.push(toMatchResult(match));

        // 零长度匹配需要手动推进，否则下一轮会停在原地
        if (match[0] === "") {
          advanceLastIndex(regex, input, unicode);
        }
      }
    }

    return {
      input,
      matches,
      isValid: true,
      truncated,
    };
  } catch (error) {
    return {
      input,
      matches: [],
      isValid: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

export function validateRegex(
  pattern: string,
  flags = ""
): { isValid: boolean; error?: string } {
  try {
    new RegExp(pattern, flags);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
