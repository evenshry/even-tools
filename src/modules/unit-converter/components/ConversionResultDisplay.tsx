import React, { useState, useEffect } from "react";
import { Input, Button, Card, Typography, Space, Alert, Row, Col } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { convertUnits } from "@/modules/unit-converter/utils/unitConversion";
import "@/modules/unit-converter/components/ConversionResultDisplay.scss";
import { formatDecimal } from "@/utils/numUtils";

const { Title, Text, Paragraph } = Typography;

// 换算结果显示组件属性
interface ConversionResultDisplayProps {
  selectedFromUnit: UnitConversion.Unit | null; // 选中的源单位
  selectedToUnit: UnitConversion.Unit | null; // 选中的目标单位
  onSwapUnits: () => void; // 交换单位的回调函数
}

// 换算结果显示组件 - 展示输入框、单位信息和换算结果
const ConversionResultDisplay: React.FC<ConversionResultDisplayProps> = ({ selectedFromUnit, selectedToUnit, onSwapUnits }) => {
  // 输入值
  const [inputValue, setInputValue] = useState<string>("1");
  // 换算结果
  const [conversionResult, setConversionResult] = useState<UnitConversion.ConversionResult | null>(null);
  // 输入值是否有效
  const [isInputValid, setIsInputValid] = useState(true);
  // 交换动画状态
  const [isSwapping, setIsSwapping] = useState(false);

  // 验证输入是否为有效数字
  const validateInput = (value: string): boolean => {
    if (value === "") return true;
    const numValue = parseFloat(value);
    return !isNaN(numValue) && isFinite(numValue);
  };

  // 当单位或输入值变化时，自动执行换算
  useEffect(() => {
    if (selectedFromUnit && selectedToUnit && inputValue !== "") {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        const result = convertUnits(numValue, selectedFromUnit.id, selectedToUnit.id);
        if (result) {
          setConversionResult(result);
        }
      }
    } else {
      setConversionResult(null);
    }
  }, [selectedFromUnit, selectedToUnit, inputValue]);

  // 处理输入值变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsInputValid(validateInput(value));
  };

  // 交换源单位和目标单位，并将当前结果作为新的输入值
  const handleSwapUnits = () => {
    setIsSwapping(true);
    setInputValue(conversionResult?.result.toString() || "1");
    onSwapUnits();
    setTimeout(() => {
      setIsSwapping(false);
    }, 300);
  };

  return (
    <Card>
      <Title level={3} className="conversion-result-display__title">
        单位换算
      </Title>

      <Space orientation="vertical" size={24} className="conversion-result-display__space">
        {/* 显示源单位和目标单位，以及交换按钮 */}
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}>
            {selectedFromUnit && (
              <Card
                size="small"
                className={`conversion-result-display__unit-card conversion-result-display__unit-card--from ${
                  isSwapping ? "conversion-result-display__unit-card--swap-right" : ""
                }`}
              >
                <Space direction="vertical" size={8} className="conversion-result-display__unit-card-space">
                  <div>
                    <Text strong className="conversion-result-display__unit-name">
                      {selectedFromUnit.name}
                    </Text>
                    <Text code className="conversion-result-display__unit-symbol">
                      {selectedFromUnit.symbol}
                    </Text>
                  </div>
                  {selectedFromUnit.description && (
                    <Text type="secondary" className="conversion-result-display__unit-description">
                      {selectedFromUnit.description}
                    </Text>
                  )}
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="输入数值"
                    min="0"
                    step="any"
                    status={isInputValid ? undefined : "error"}
                    size="large"
                    className="conversion-result-display__input"
                  />
                </Space>
              </Card>
            )}
          </Col>

          <Col xs={24} md={4} className="conversion-result-display__swap-button-container">
            {selectedFromUnit && selectedToUnit && (
              <Button
                icon={<SwapOutlined />}
                onClick={handleSwapUnits}
                disabled={!conversionResult}
                size="large"
                className={`conversion-result-display__swap-button ${
                  isSwapping ? "conversion-result-display__swap-button--animating" : ""
                }`}
              >
                交换
              </Button>
            )}
          </Col>

          <Col xs={24} md={10}>
            {selectedToUnit && (
              <Card
                size="small"
                className={`conversion-result-display__unit-card conversion-result-display__unit-card--to ${
                  isSwapping ? "conversion-result-display__unit-card--swap-left" : ""
                }`}
              >
                <Space direction="vertical" size={8} className="conversion-result-display__unit-card-space">
                  <div>
                    <Text strong className="conversion-result-display__unit-name">
                      {selectedToUnit.name}
                    </Text>
                    <Text code className="conversion-result-display__unit-symbol">
                      {selectedToUnit.symbol}
                    </Text>
                  </div>
                  {selectedToUnit.description && (
                    <Text type="secondary" className="conversion-result-display__unit-description">
                      {selectedToUnit.description}
                    </Text>
                  )}
                  {conversionResult && (
                    <div className="conversion-result-display__result-value">
                      <Text className="conversion-result-display__result-text conversion-result-display__result-text--highlight">
                        {formatDecimal(conversionResult.result)}
                      </Text>
                    </div>
                  )}
                  {!conversionResult && (
                    <div className="conversion-result-display__result-placeholder">
                      <Text type="secondary">-</Text>
                    </div>
                  )}
                </Space>
              </Card>
            )}
          </Col>
        </Row>

        {/* 显示换算公式和说明 */}
        {conversionResult && (
          <Card className="conversion-result-display__result-card">
            <Space orientation="vertical" size={16} className="conversion-result-display__space">
              <div>
                <Title level={5} className="conversion-result-display__formula-title">
                  换算公式:
                </Title>
                <Paragraph code className="conversion-result-display__formula">
                  {conversionResult.formula}
                </Paragraph>
              </div>

              <div>
                <Title level={5} className="conversion-result-display__explanation-title">
                  说明:
                </Title>
                <Paragraph className="conversion-result-display__explanation">{conversionResult.explanation}</Paragraph>
              </div>
            </Space>
          </Card>
        )}

        {/* 未选择单位或输入无效时的提示 */}
        {!selectedFromUnit || (!selectedToUnit && <Alert message="请选择要转换的单位" type="info" showIcon />)}

        {isInputValid === false && <Alert message="请输入有效的数值" type="error" showIcon />}
      </Space>
    </Card>
  );
};

export default ConversionResultDisplay;
