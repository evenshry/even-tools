// JSON 工具箱相关类型定义

export namespace JsonToolkitTypes {
  // 缩进风格
  type IndentStyle = 2 | 4 | "tab" | 0;

  // JSON 节点类型
  type JsonNodeType =
    | "object"
    | "array"
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "undefined";

  // JSON 诊断错误
  interface JsonDiagnosticError {
    position: number;
    length: number;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    type: string;
    message: string;
    suggestion: string;
    severity: "error" | "warning";
  }

  // 严格校验结果（JSON.parse 语义）
  interface ValidationResult {
    isValid: boolean;
    error?: string;
    errorLine?: number;
    errorColumn?: number;
    parsed?: unknown;
  }

  // 诊断错误按父路径归组后的节点信息（用于可视化树补全错误节点）
  interface JsonErrorGroup {
    keyName: string;
    errorMessage: string;
    errorSuggestion: string;
    valueText: string;
    startOffset: number;
    endOffset: number;
    errorTypes: string[];
    hasCriticalError: boolean;
    errors: JsonDiagnosticError[];
  }

  type JsonErrorMap = Record<string, JsonErrorGroup[]>;

  // 统计信息
  interface JsonStats {
    size: number; // 字节数
    keys: number; // 总键数
    depth: number; // 最大嵌套深度
    arrays: number; // 数组数量
    objects: number; // 对象数量
    strings: number; // 字符串数量
    numbers: number; // 数字数量
    booleans: number; // 布尔值数量
    nulls: number; // null 数量
    totalNodes: number; // 节点总数
  }

  // 树节点
  interface TreeNode {
    uid: string; // antd Tree 使用的唯一 key（同名 path 出现多次时追加序号）
    depth: number; // 节点层级，根节点为 0
    keyName: string; // 键名（如 "name" 或 "0"），根节点为 "$"
    valueText: string; // 值文本（原始值/对象/数组的概要）
    value?: unknown;
    type: JsonNodeType;
    path: string; // JSON 路径，例如 $.user.name
    children?: TreeNode[];
    expandable: boolean;
    isError?: boolean; // 是否为错误节点
    errorMessage?: string; // 错误描述
    errorSuggestion?: string; // 修复建议
    errorOriginalValue?: string; // 错误节点的原始值（从源文本提取）
    errorStartOffset?: number; // 错误字段在源文本中的起始位置（用于排序）
    errors?: JsonDiagnosticError[]; // 该字段的所有错误详情（用于 hover 展示）
  }

  // 示例数据
  interface Sample {
    id: string;
    name: string;
    description: string;
    content: string;
  }
}
