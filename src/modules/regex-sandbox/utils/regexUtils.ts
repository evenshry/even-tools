import type { RegexSandboxTypes } from "../data/interface";

export function executeRegex(
  pattern: string,
  flags: string,
  input: string
): RegexSandboxTypes.TestResult {
  try {
    const regex = new RegExp(pattern, flags);
    const matches: RegexSandboxTypes.MatchResult[] = [];
    let match: RegExpExecArray | null;

    if (flags.includes("g")) {
      while ((match = regex.exec(input)) !== null) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1),
        });
      }
    } else {
      match = regex.exec(input);
      if (match) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1),
        });
      }
    }

    return {
      input,
      matches,
      isValid: true,
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

export function validateRegex(pattern: string): { isValid: boolean; error?: string } {
  try {
    new RegExp(pattern);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
