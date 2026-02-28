import { Card, Typography, Alert, Row, Col } from "antd";
import { hexToRgbaString, simulateColorBlindness } from "@/modules/color-calculator/utils/colorUtils";
import { COLOR_BLINDNESS_TYPES } from "@/modules/color-calculator/data/colorCalculator";

const { Text } = Typography;

interface ColorBlindnessSimulationProps {
  foregroundColor: string;
  backgroundColor: string;
}

const ColorBlindnessSimulation = ({ foregroundColor, backgroundColor }: ColorBlindnessSimulationProps) => {
  return (
    <Card title="色盲模拟" className="colorblind-card">
      <Alert
        message="色盲友好度检测"
        description="查看您的颜色在不同色盲类型下的显示效果"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Row gutter={[16, 16]}>
        {COLOR_BLINDNESS_TYPES.map((type) => (
          <Col xs={24} sm={12} key={type.id}>
            <Card size="small" className="colorblind-type-card">
              <Text strong>{type.name}</Text>
              <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                {type.description}
              </Text>
              <div
                className="colorblind-preview"
                style={{
                  backgroundColor: hexToRgbaString(simulateColorBlindness(backgroundColor, type.id)),
                }}
              >
                <Text style={{ color: hexToRgbaString(simulateColorBlindness(foregroundColor, type.id)) }}>示例文本 Sample Text</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default ColorBlindnessSimulation;
