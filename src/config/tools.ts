// 工具配置文件 - 定义所有可用工具的元数据
export interface Tool {
  id: string; // 工具唯一标识符
  name: string; // 工具显示名称
  description: string; // 工具功能描述
  icon: string; // 工具图标（emoji或图标组件）
  category: string; // 工具分类
  path: string; // 路由路径
}

// 可用工具列表配置
export const tools: Tool[] = [
  {
    id: "unit-converter",
    name: "单位换算大全",
    description: "涵盖常见和不常见单位，支持现代计量单位和古代计量单位的换算",
    icon: "🔄",
    category: "计算工具",
    path: "/unit-converter",
  },
  {
    id: "habit-tracker",
    name: "习惯追踪器",
    description: "帮助您建立和坚持好习惯，追踪每日进度，可视化展示完成情况",
    icon: "📅",
    category: "生活工具",
    path: "/habit-tracker",
  },
  {
    id: "color-calculator",
    name: "颜色计算器",
    description: "计算颜色搭配、对比度、色盲友好度，验证WCAG标准，模拟色盲视图，支持HEX、RGB、HSL、HSV颜色格式、颜色渐变生成实验室",
    icon: "🎨",
    category: "设计工具",
    path: "/color-calculator",
  },
  {
    id: "regex-sandbox",
    name: "正则表达式沙盒",
    description: "强大的正则表达式编辑器、测试器和库，支持实时匹配测试、测试用例管理、常用正则表达式库，帮助您快速编写和调试正则表达式",
    icon: "🔍",
    category: "开发工具",
    path: "/regex-sandbox",
  },
  {
    id: "visual-page-builder",
    name: "视觉页面构建器",
    description: "通过拖拽和配置生成页面的可视化编程工具，支持所见即所得的实时预览，提供丰富的组件库和样式编辑功能",
    icon: "🎨",
    category: "设计工具",
    path: "/visual-page-builder",
  },

];
