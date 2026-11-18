export namespace RegexSandboxTypes {
  export interface RegexPreset {
    id: string;
    name: string;
    description: string;
    pattern: string;
    flags: string;
    category: string;
  }

  export interface TestCase {
    id: string;
    name: string;
    input: string;
    expectedMatches: string[];
    description?: string;
  }

  export interface MatchResult {
    match: string;
    index: number;
    groups: string[];
    /** 命名捕获分组，未使用命名分组时为 undefined */
    namedGroups?: Record<string, string | undefined>;
  }

  export interface TestResult {
    input: string;
    matches: MatchResult[];
    isValid: boolean;
    error?: string;
    /** 匹配数量超过上限、结果被截断时为 true */
    truncated?: boolean;
  }
}
