import { memo, useMemo } from "react";
import { Card, Typography, Row, Col } from "antd";
import {
  generateComplementaryColors,
  generateAnalogousColors,
  generateTriadicColors,
  generateMonochromaticColors,
  hexToRgbaString,
} from "@/modules/color-calculator/utils/colorUtils";

const { Text } = Typography;

interface ColorHarmoniesProps {
  foregroundColor: string;
  onCopy: (text: string) => void;
}

const ColorHarmonies = ({ foregroundColor, onCopy }: ColorHarmoniesProps) => {
  // 仅在颜色变化时重新计算，避免切换 Tab 时重复计算
  const { complementary, analogous, triadic, monochromatic } = useMemo(
    () => ({
      complementary: generateComplementaryColors(foregroundColor),
      analogous: generateAnalogousColors(foregroundColor),
      triadic: generateTriadicColors(foregroundColor),
      monochromatic: generateMonochromaticColors(foregroundColor),
    }),
    [foregroundColor]
  );

  const renderColorPalette = (title: string, colors: string[]) => (
    <Card size="small" className="harmony-card">
      <Text strong>{title}</Text>
      <div className="color-palette">
        <div className="color-swatch" style={{ backgroundColor: hexToRgbaString(foregroundColor) }} title="原色" />
        {colors.map((color, index) => (
          <div
            key={index}
            className="color-swatch"
            style={{ backgroundColor: hexToRgbaString(color) }}
            title={color}
            onClick={() => onCopy(color)}
          />
        ))}
      </div>
    </Card>
  );

  return (
    <Card title="颜色搭配推荐" className="harmonies-card">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          {renderColorPalette("互补色", complementary)}
        </Col>
        <Col xs={24} md={12}>
          {renderColorPalette("类比色", analogous)}
        </Col>
        <Col xs={24} md={12}>
          {renderColorPalette("三角色", triadic)}
        </Col>
        <Col xs={24} md={12}>
          {renderColorPalette("单色系", monochromatic)}
        </Col>
      </Row>
    </Card>
  );
};

export default memo(ColorHarmonies);
