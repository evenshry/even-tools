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
    id: "regex-sandbox",
    name: "正则表达式",
    description: "强大的正则表达式编辑器、测试器和库，支持实时匹配测试、测试用例管理、常用正则表达式库，帮助您快速编写和调试正则表达式",
    icon: "🔍",
    category: "开发工具",
    path: "/regex-sandbox",
  },
  {
    id: "bluetooth-printer",
    name: "蓝牙打印机",
    description: "通过 Web Bluetooth 连接 ESC/POS 热敏打印机，支持指令模式直接发送 Hex、助记符、纯文本，以及编辑模式可视化设计打印内容",
    icon: "🖨️",
    category: "开发工具",
    path: "/bluetooth-printer",
  },
  {
    id: "barcode-generator",
    name: "条形码/二维码",
    description: "支持多种条形码类型（CODE 128、EAN-13、UPC、CODE 39等）和二维码生成，支持自定义颜色、尺寸、容错级别，支持批量生成和多格式图片下载",
    icon: "🏷️",
    category: "开发工具",
    path: "/barcode-generator",
  },
  {
    id: "json-toolkit",
    name: "JSON工具箱",
    description: "JSON 格式化、压缩、校验、可视化树、统计分析、JSONPath 路径查询，以及与 YAML、CSV、TSV、XML、Properties 之间的相互转换，支持字符串转义/反转义",
    icon: "🧬",
    category: "开发工具",
    path: "/json-toolkit",
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
    id: "visual-page-builder",
    name: "视觉页面构建",
    description: "通过拖拽和配置生成页面的可视化编程工具，支持所见即所得的实时预览，提供丰富的组件库和样式编辑功能",
    icon: "🎨",
    category: "设计工具",
    path: "/visual-page-builder",
  },
  {
    id: "floor-plan-generator",
    name: "房屋平面设计",
    description: "根据配置参数生成专业的房屋平面设计图，支持房间布局、门窗设置、家具摆放等功能",
    icon: "🏠",
    category: "设计工具",
    path: "/floor-plan-generator",
  },
  {
    id: "unit-converter",
    name: "单位换算大全",
    description: "涵盖常见和不常见单位，支持现代计量单位和古代计量单位的换算",
    icon: "🔄",
    category: "生活工具",
    path: "/unit-converter",
  },
  {
    id: "habit-tracker",
    name: "习惯追踪",
    description: "帮助您建立和坚持好习惯，追踪每日进度，可视化展示完成情况",
    icon: "📅",
    category: "生活工具",
    path: "/habit-tracker",
  },
];
