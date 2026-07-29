import type { JsonToolkitTypes } from "./interface";

// 内置 JSON 示例数据
export const samples: JsonToolkitTypes.Sample[] = [
  {
    id: "comprehensive-errors",
    name: "常见错误合集",
    description: "覆盖未引号属性名、单引号、尾随逗号、非法转义、注释、NaN/Infinity、缺少逗号/括号等典型 JSON 错误",
    content: `{
  // 这是一行非法注释
  unquoted_key: "属性名必须用双引号包裹",
  'single_quotes': 'JSON 只接受双引号',
  "trailing_comma": "注意末尾逗号",
  "invalid_escape": "C:\\Users\\name",
  "special_numbers": {
    "not_a_number": NaN,
    "positive_infinity": Infinity,
    "negative_infinity": -Infinity
  },
  "missing_comma": "前面缺少逗号"
  "missing_brace": "对象没有正确闭合",
  "bad_number": 0123,
  "empty_value": ,
  "valid_field": "这行是正确的"
}`,
  },
  {
    id: "user",
    name: "用户信息",
    description: "典型的用户对象，包含基本信息与爱好列表",
    content: `{"id":1001,"name":"张三","age":28,"email":"zhangsan@example.com","isActive":true,"address":{"city":"北京","street":"朝阳路 100 号","zip":"100000"},"roles":["admin","editor"],"lastLogin":null}`,
  },
  {
    id: "products",
    name: "商品列表",
    description: "商品数组，常用于演示 CSV 转换",
    content: `[
  {"id":1,"name":"iPhone 15 Pro","price":7999,"stock":42,"tags":["手机","苹果"],"onSale":true},
  {"id":2,"name":"MacBook Air M3","price":9499,"stock":15,"tags":["笔记本","苹果"],"onSale":true},
  {"id":3,"name":"小米 14","price":3999,"stock":88,"tags":["手机","安卓"],"onSale":false},
  {"id":4,"name":"Sony WH-1000XM5","price":2399,"stock":0,"tags":["耳机","降噪"],"onSale":false}
]`,
  },
  {
    id: "nested",
    name: "深层嵌套",
    description: "复杂嵌套结构，用于演示深度统计与路径查找",
    content: `{
  "company": "Even Tools",
  "founded": 2024,
  "teams": [
    {
      "name": "前端",
      "lead": {"name": "Alice", "age": 32},
      "members": [{"name": "Bob", "skills": ["React","TS"]}, {"name": "Carol", "skills": ["Vue","JS"]}]
    },
    {
      "name": "后端",
      "lead": {"name": "Dave", "age": 35},
      "members": [{"name": "Eve", "skills": ["Go","MySQL"]}]
    }
  ],
  "meta": {"verified": true, "score": 4.8}
}`,
  },
  {
    id: "api",
    name: "API 响应",
    description: "RESTful API 响应示例",
    content: `{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "list": [
      {"id": 1, "title": "第一篇文章"},
      {"id": 2, "title": "第二篇文章"}
    ]
  },
  "timestamp": 1730000000000
}`,
  },
  {
    id: "comprehensive-errors",
    name: "常见错误合集",
    description: "覆盖未引号属性名、单引号、尾随逗号、非法转义、注释、NaN/Infinity、缺少逗号/括号等典型 JSON 错误",
    content: `{
  // 这是一行非法注释
  unquoted_key: "属性名必须用双引号包裹",
  'single_quotes': 'JSON 只接受双引号',
  "trailing_comma": "注意末尾逗号",
  "invalid_escape": "C:\\Users\\name",
  "special_numbers": {
    "not_a_number": NaN,
    "positive_infinity": Infinity,
    "negative_infinity": -Infinity
  },
  "missing_comma": "前面缺少逗号"
  "missing_brace": "对象没有正确闭合",
  "bad_number": 0123,
  "empty_value": ,
  "valid_field": "这行是正确的"
}`,
  },
];
