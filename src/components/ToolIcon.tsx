import React from "react";
import {
  SearchOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  CodeOutlined,
  BgColorsOutlined,
  BlockOutlined,
  HomeOutlined,
  SwapOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

// 工具 id → 线性图标映射（替代跨平台不一致的 emoji）
const ICON_MAP: Record<string, React.ReactNode> = {
  "regex-sandbox": <SearchOutlined />,
  "bluetooth-printer": <PrinterOutlined />,
  "barcode-generator": <QrcodeOutlined />,
  "json-toolkit": <CodeOutlined />,
  "color-calculator": <BgColorsOutlined />,
  "visual-page-builder": <BlockOutlined />,
  "floor-plan-generator": <HomeOutlined />,
  "unit-converter": <SwapOutlined />,
  "habit-tracker": <CalendarOutlined />,
};

interface ToolIconProps {
  id: string;
}

// 工具图标组件 - 根据 tool.id 渲染对应线性图标
const ToolIcon: React.FC<ToolIconProps> = ({ id }) => {
  return <>{ICON_MAP[id] ?? <AppstoreOutlined />}</>;
};

export default ToolIcon;
