import { Card, Typography, Divider, Tag, Space } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { hexToRgbaString, getContrastRatio, checkWCAGCompliance, getContrastLevel } from "@/modules/color-calculator/utils/colorUtils";

const { Title, Text } = Typography;

interface ContrastAnalysisProps {
  foregroundColor: string;
  backgroundColor: string;
}

const ContrastAnalysis = ({ foregroundColor, backgroundColor }: ContrastAnalysisProps) => {
  const contrastRatio = getContrastRatio(foregroundColor, backgroundColor);
  const wcagResult = checkWCAGCompliance(contrastRatio);
  const contrastLevel = getContrastLevel(contrastRatio);

  return (
    <Card title="对比度分析" className="contrast-card">
      <div className="contrast-preview" style={{ backgroundColor: hexToRgbaString(backgroundColor) }}>
        <Text style={{ fontSize: "24px", fontWeight: "bold", color: hexToRgbaString(foregroundColor) }}>示例文本 Sample Text</Text>
        <Text style={{ fontSize: "18px", color: hexToRgbaString(foregroundColor) }}>这是普通大小的文本，用于测试对比度</Text>
        <Text style={{ fontSize: "14px", color: hexToRgbaString(foregroundColor) }}>这是小号文本，用于测试对比度</Text>
        <Text style={{ fontSize: "32px", fontWeight: "bold", color: hexToRgbaString(foregroundColor) }}>大号文本 Large Text</Text>
      </div>

      <Divider />

      <div className="contrast-ratio">
        <Text strong>对比度比率: </Text>
        <Text
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: wcagResult.levelAAA ? "#52c41a" : wcagResult.levelAA ? "#faad14" : "#ff4d4f",
          }}
        >
          {contrastRatio.toFixed(2)}:1
        </Text>
        <Tag color={wcagResult.levelAAA ? "success" : wcagResult.levelAA ? "warning" : "error"}>{contrastLevel}</Tag>
      </div>

      <Divider />

      <div className="wcag-standards">
        <Title level={5}>WCAG 标准</Title>
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div className="wcag-item">
            <Text>普通文本 (AA): </Text>
            {wcagResult.levelAA ? (
              <Tag color="success" icon={<CheckOutlined />}>
                通过 (≥4.5:1)
              </Tag>
            ) : (
              <Tag color="error">未通过</Tag>
            )}
          </div>
          <div className="wcag-item">
            <Text>普通文本 (AAA): </Text>
            {wcagResult.levelAAA ? (
              <Tag color="success" icon={<CheckOutlined />}>
                通过 (≥7:1)
              </Tag>
            ) : (
              <Tag color="error">未通过</Tag>
            )}
          </div>
          <div className="wcag-item">
            <Text>大号文本 (AA): </Text>
            {wcagResult.levelAALarge ? (
              <Tag color="success" icon={<CheckOutlined />}>
                通过 (≥3:1)
              </Tag>
            ) : (
              <Tag color="error">未通过</Tag>
            )}
          </div>
          <div className="wcag-item">
            <Text>大号文本 (AAA): </Text>
            {wcagResult.levelAAALarge ? (
              <Tag color="success" icon={<CheckOutlined />}>
                通过 (≥4.5:1)
              </Tag>
            ) : (
              <Tag color="error">未通过</Tag>
            )}
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default ContrastAnalysis;
