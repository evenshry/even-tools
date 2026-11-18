import { useEffect, useState } from "react";
import { Card, ColorPicker, Typography, Button, Input } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import type { Color } from "antd/es/color-picker";
import { parseColor } from "@/modules/color-calculator/utils/colorUtils";

const { Text } = Typography;

interface ColorSelectionCardProps {
  foregroundColor: string;
  backgroundColor: string;
  onColorChange: (color: Color, type: "foreground" | "background") => void;
  onHexInput: (value: string, type: "foreground" | "background") => void;
  onSwapColors: () => void;
}

type ColorType = "foreground" | "background";

// 状态中可能不带 #，输入框统一展示带 # 的形式
const formatHex = (color: string) => (color.startsWith("#") ? color : `#${color}`);

const ColorSelectionCard = ({
  foregroundColor,
  backgroundColor,
  onColorChange,
  onHexInput,
  onSwapColors,
}: ColorSelectionCardProps) => {
  const [drafts, setDrafts] = useState<Record<ColorType, string>>({
    foreground: formatHex(foregroundColor),
    background: formatHex(backgroundColor),
  });
  const [invalid, setInvalid] = useState<Record<ColorType, boolean>>({
    foreground: false,
    background: false,
  });

  // 外部（取色器、交换、剪贴板）改变颜色时同步草稿
  useEffect(() => {
    setDrafts((prev) => ({ ...prev, foreground: formatHex(foregroundColor) }));
    setInvalid((prev) => ({ ...prev, foreground: false }));
  }, [foregroundColor]);

  useEffect(() => {
    setDrafts((prev) => ({ ...prev, background: formatHex(backgroundColor) }));
    setInvalid((prev) => ({ ...prev, background: false }));
  }, [backgroundColor]);

  const handleDraftChange = (value: string, type: ColorType) => {
    setDrafts((prev) => ({ ...prev, [type]: value }));
    setInvalid((prev) => ({ ...prev, [type]: false }));
  };

  const commitDraft = (type: ColorType) => {
    const parsed = parseColor(drafts[type]);
    if (parsed) {
      setInvalid((prev) => ({ ...prev, [type]: false }));
      onHexInput(parsed, type);
    } else {
      // 非法输入只标红，不弹提示
      setInvalid((prev) => ({ ...prev, [type]: true }));
    }
  };

  const renderInput = (type: ColorType) => (
    <Input
      value={drafts[type]}
      onChange={(e) => handleDraftChange(e.target.value, type)}
      onBlur={() => commitDraft(type)}
      onPressEnter={() => commitDraft(type)}
      status={invalid[type] ? "error" : undefined}
      placeholder={type === "foreground" ? "#000000 或 rgb(0,0,0) 或 hsl(0,0%,0%)" : "#FFFFFF 或 rgb(255,255,255) 或 hsl(0,0%,100%)"}
      size="large"
      className="color-picker-input"
    />
  );

  return (
    <Card title="颜色选择" className="color-selection-card">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="color-picker-item">
          <Text strong>前景色</Text>
          <ColorPicker
            value={foregroundColor}
            onChange={(color) => onColorChange(color, "foreground")}
            showText
            size="large"
            className="color-picker-box"
          />
          {renderInput("foreground")}
        </div>

        <Button type="primary" icon={<SwapOutlined />} onClick={onSwapColors} block>
          交换颜色
        </Button>

        <div className="color-picker-item">
          <Text strong>背景色</Text>
          <ColorPicker
            value={backgroundColor}
            onChange={(color) => onColorChange(color, "background")}
            showText
            size="large"
            className="color-picker-box"
          />
          {renderInput("background")}
        </div>
      </div>
    </Card>
  );
};

export default ColorSelectionCard;
