import { Card, Typography, Space, Button } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { hexToRgb, rgbToHsl, hexToRgbaString } from "@/modules/color-calculator/utils/colorUtils";

const { Text } = Typography;

interface ColorInfoCardProps {
  color: string;
  label: string;
  copied: string | null;
  onCopy: (text: string) => void;
}

const ColorInfoCard = ({ color, label, copied, onCopy }: ColorInfoCardProps) => {
  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b, rgb.a);

  const rgbString = rgb.a !== undefined ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a.toFixed(2)})` : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  const hslString =
    hsl.a !== undefined
      ? `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${hsl.a.toFixed(2)})`
      : `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;

  return (
    <Card className="color-info-card">
      <div className="color-info-header">
        <Text strong>{label}</Text>
        <div className="color-preview" style={{ backgroundColor: hexToRgbaString(color) }} />
      </div>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <div className="color-value">
          <Text type="secondary">HEX:</Text>
          <Space>
            <Text code>{color}</Text>
            <Button
              type="text"
              size="small"
              icon={copied === color ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => onCopy(color)}
            />
          </Space>
        </div>
        <div className="color-value">
          <Text type="secondary">RGB:</Text>
          <Space>
            <Text code>{rgbString}</Text>
            <Button
              type="text"
              size="small"
              icon={copied === rgbString ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => onCopy(rgbString)}
            />
          </Space>
        </div>
        <div className="color-value">
          <Text type="secondary">HSL:</Text>
          <Space>
            <Text code>{hslString}</Text>
            <Button
              type="text"
              size="small"
              icon={copied === hslString ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => onCopy(hslString)}
            />
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default ColorInfoCard;
