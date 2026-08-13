# even-tools

A collection of useful web tools for developers, designers, and daily life. Built with React + TypeScript, running entirely in the browser.

## Tools

### 开发工具

- **正则表达式** - 强大的正则表达式编辑器、测试器和库，支持实时匹配测试、测试用例管理、常用正则表达式库
- **蓝牙打印机** - 通过 Web Bluetooth 连接 ESC/POS 热敏打印机，支持指令模式（Hex/助记符/纯文本）和编辑模式（可视化设计打印内容），支持 ESC/POS 与 TSPL 双协议
- **条形码/二维码** - 支持 CODE 128、EAN-13、UPC、CODE 39 等多种条形码类型，以及 QR Code 生成，支持自定义颜色、尺寸、容错级别和批量导出
- **JSON 工具箱** - JSON 格式化、压缩、容错校验、可视化树、统计分析、JSONPath 路径查询，支持 YAML/CSV/TSV/XML/Properties 格式转换及字符串转义/反转义

### 设计工具

- **颜色计算器** - 颜色转换（HEX/RGB/HSL/HSV）、对比度分析、和谐配色、WCAG 标准校验、色盲模拟视图、颜色渐变生成实验室
- **视觉页面构建** - 拖拽式可视化页面编辑器，所见即所得实时预览，丰富的组件库、图层管理和代码导出
- **房屋平面设计** - 根据配置参数生成专业房屋平面图，支持房间布局、门窗设置、家具摆放和模板导出

### 生活工具

- **单位换算大全** - 涵盖常见与不常见单位，支持现代计量单位（长度、重量、温度、面积、体积、时间等）和古代计量单位换算
- **习惯追踪** - 每日习惯打卡追踪，日历视图展示完成情况，可视化统计图表，支持自定义习惯和提醒

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (rolldown-vite) 构建
- **Ant Design** UI 组件库
- **Zustand** 状态管理
- **React Router** 路由
- **React DnD** 拖拽
- **SCSS** 样式
- **IndexedDB** 本地数据持久化

## Development

```bash
yarn install
yarn dev
```

## Build

```bash
yarn build
```

## Deploy

```bash
yarn deploy
```

## Links

- Website: https://evenshry.github.io/even-tools/
