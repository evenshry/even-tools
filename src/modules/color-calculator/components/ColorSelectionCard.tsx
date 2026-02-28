import { Card, ColorPicker, Typography, Button, Input } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import type { Color } from "antd/es/color-picker";

const { Text } = Typography;

interface ColorSelectionCardProps {
  foregroundColor: string;
  backgroundColor: string;
  onColorChange: (color: Color, type: "foreground" | "background") => void;
  onHexInput: (value: string, type: "foreground" | "background") => void;
  onSwapColors: () => void;
}

const ColorSelectionCard = ({
  foregroundColor,
  backgroundColor,
  onColorChange,
  onHexInput,
  onSwapColors,
}: ColorSelectionCardProps) => {
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
          <Input
            value={foregroundColor}
            onChange={(e) => onHexInput(e.target.value, "foreground")}
            placeholder="#000000 或 rgb(0,0,0) 或 hsl(0,0%,0%)"
            size="large"
            className="color-picker-input"
          />
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
          <Input
            value={backgroundColor}
            onChange={(e) => onHexInput(e.target.value, "background")}
            placeholder="#FFFFFF 或 rgb(255,255,255) 或 hsl(0,0%,100%)"
            size="large"
            className="color-picker-input"
          />
        </div>
      </div>
    </Card>
  );
};

export default ColorSelectionCard;
