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

  // 验证结果
  interface ValidationResult {
    isValid: boolean;
    error?: string;
    errorLine?: number;
    errorColumn?: number;
    parsed?: unknown;
  }

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
    key: string;
    label: string;
    value?: unknown;
    type: JsonNodeType;
    path: string; // JSON 路径，例如 $.user.name
    children?: TreeNode[];
    expandable: boolean;
  }

  // 示例数据
  interface Sample {
    id: string;
    name: string;
    description: string;
    content: string;
  }
}
