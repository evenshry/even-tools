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
  }

  export interface TestResult {
    input: string;
    matches: MatchResult[];
    isValid: boolean;
    error?: string;
  }
}
