import { useState } from "react";
import { Card, Button, Slider, Space, Typography, Row, Col, message, Tabs, Select, Input, ColorPicker } from "antd";
import { PlusOutlined, DeleteOutlined, CopyOutlined, CheckOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { hexToRgbaString } from "@/modules/color-calculator/utils/colorUtils";
import type { ColorCalculator } from "@/modules/color-calculator/data/interface";
import { GRADIENT_PRESETS } from "@/modules/color-calculator/data/colorCalculator";
import "@/modules/color-calculator/components/GradientGenerator.scss";

const { Text } = Typography;
const { Option } = Select;

const GradientGenerator = () => {
  const [gradientType, setGradientType] = useState<ColorCalculator.GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [colorStops, setColorStops] = useState<ColorCalculator.ColorStop[]>([
    { id: "1", color: "#667eea", position: 0 },
    { id: "2", color: "#764ba2", position: 100 },
  ]);
  const [copied, setCopied] = useState<string | null>(null);

  const addColorStop = () => {
    const newId = Date.now().toString();
    const newPosition = Math.round(Math.random() * 100);
    const newColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    setColorStops([...colorStops, { id: newId, color: newColor, position: newPosition }].sort((a, b) => a.position - b.position));
  };

  const removeColorStop = (id: string) => {
    if (colorStops.length <= 2) {
      message.warning("至少需要保留两个颜色");
      return;
    }
    setColorStops(colorStops.filter((stop) => stop.id !== id));
  };

  const updateColorStop = (id: string, field: keyof ColorCalculator.ColorStop, value: string | number) => {
    setColorStops(colorStops.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop)).sort((a, b) => a.position - b.position));
  };

  const applyPreset = (preset: ColorCalculator.GradientPreset) => {
    setGradientType(preset.type);
    setAngle(preset.angle);
    setColorStops(preset.colorStops);
    message.success(`已应用预设: ${preset.name}`);
  };

  const generateRandomGradient = () => {
    const stopCount = Math.floor(Math.random() * 4) + 2;
    const newColorStops: ColorCalculator.ColorStop[] = [];
    const usedPositions = new Set<number>();

    for (let i = 0; i < stopCount; i++) {
      let position;
      do {
        position = Math.round(Math.random() * 100);
      } while (usedPositions.has(position));
      usedPositions.add(position);

      newColorStops.push({
        id: Date.now().toString() + i,
        color:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),
        position,
      });
    }

    const types: ColorCalculator.GradientType[] = ["linear", "radial", "conic"];
    setGradientType(types[Math.floor(Math.random() * types.length)]);
    setAngle(Math.floor(Math.random() * 360));
    setColorStops(newColorStops.sort((a, b) => a.position - b.position));
    message.success("已生成随机渐变");
  };

  const generateCSSGradient = (): string => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const stopsString = sortedStops.map((stop) => `${hexToRgbaString(stop.color)} ${stop.position}%`).join(", ");

    switch (gradientType) {
      case "linear":
        return `linear-gradient(${angle}deg, ${stopsString})`;
      case "radial":
        return `radial-gradient(circle, ${stopsString})`;
      case "conic":
        return `conic-gradient(from ${angle}deg, ${stopsString})`;
      default:
        return "";
    }
  };

  const generateSVGGradient = (): string => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const gradientId = `gradient-${gradientType}-${sortedStops.map((s) => s.color + s.position).join("-")}`;

    let gradientElement = "";
    let rectElement = "";

    switch (gradientType) {
      case "linear":
        const x1 = Math.round(50 + 50 * Math.cos(((angle - 90) * Math.PI) / 180));
        const y1 = Math.round(50 + 50 * Math.sin(((angle - 90) * Math.PI) / 180));
        const x2 = Math.round(50 + 50 * Math.cos(((angle + 90) * Math.PI) / 180));
        const y2 = Math.round(50 + 50 * Math.sin(((angle + 90) * Math.PI) / 180));

        gradientElement = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
        break;
      case "radial":
        gradientElement = `<radialGradient id="${gradientId}">`;
        break;
      case "conic":
        gradientElement = `<linearGradient id="${gradientId}" gradientTransform="rotate(${angle})">`;
        break;
    }

    const stops = sortedStops.map((stop) => `  <stop offset="${stop.position}%" stop-color="${hexToRgbaString(stop.color)}" />`).join("\n");

    rectElement = `<rect width="100%" height="100%" fill="url(#${gradientId})" />`;

    return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
${gradientElement}
${stops}
</${gradientType === "radial" ? "radialGradient" : "linearGradient"}>
  </defs>
  ${rectElement}
</svg>`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    message.success("已复制到剪贴板");
    setTimeout(() => setCopied(null), 2000);
  };

  const renderColorStopControls = (stop: ColorCalculator.ColorStop, index: number) => (
    <Card key={stop.id} size="small" className="color-stop-card">
      <Space direction="vertical" style={{ width: "100%" }}>
        <div className="color-stop-header">
          <Text strong>颜色 {index + 1}</Text>
          {colorStops.length > 2 && (
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeColorStop(stop.id)} />
          )}
        </div>
        <div className="color-stop-controls">
          <div className="color-picker-wrapper">
            <ColorPicker
              value={stop.color}
              onChange={(color) => updateColorStop(stop.id, "color", color.toHex())}
              className="color-input"
            />
            <Input
              value={stop.color}
              onChange={(e) => updateColorStop(stop.id, "color", e.target.value)}
              placeholder="#000000"
              style={{ width: 100 }}
            />
          </div>
          <div className="position-slider">
            <Text style={{ margin: "5px 0" }}>位置: {stop.position}%</Text>
            <Slider
              style={{ flex: 1 }}
              min={0}
              max={100}
              value={stop.position}
              onChange={(value) => updateColorStop(stop.id, "position", value)}
            />
          </div>
        </div>
      </Space>
    </Card>
  );

  return (
    <div className="gradient-generator">
      <Card title="渐变生成实验室" className="gradient-generator-card">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <div className="gradient-form">
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div className="gradient-type-selector">
                  <Text strong>渐变类型</Text>
                  <Select value={gradientType} onChange={setGradientType} style={{ width: "100%" }}>
                    <Option value="linear">线性渐变</Option>
                    <Option value="radial">径向渐变</Option>
                    <Option value="conic">圆锥渐变</Option>
                  </Select>
                </div>

                {gradientType !== "radial" && (
                  <div className="angle-control">
                    <Text strong>角度: {angle}°</Text>
                    <Slider min={0} max={360} value={angle} onChange={setAngle} />
                  </div>
                )}

                <div className="color-stops-section">
                  <div className="color-stops-header">
                    <Text strong>颜色停止点</Text>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addColorStop}>
                      添加颜色
                    </Button>
                  </div>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {colorStops.map((stop, index) => renderColorStopControls(stop, index))}
                  </Space>
                </div>
              </Space>
            </div>

            <div className="gradient-presets">
              <div className="presets-header">
                <Text strong>预设模板</Text>
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={generateRandomGradient}>
                  随机渐变
                </Button>
              </div>
              <div className="presets-grid">
                {GRADIENT_PRESETS.map((preset) => (
                  <div key={preset.name} className="preset-item" onClick={() => applyPreset(preset)}>
                    <div
                      className="preset-preview"
                      style={{
                        background:
                          preset.type === "linear"
                            ? `linear-gradient(${preset.angle}deg, ${preset.colorStops
                                .map((s) => `${hexToRgbaString(s.color)} ${s.position}%`)
                                .join(", ")})`
                            : preset.type === "radial"
                            ? `radial-gradient(circle, ${preset.colorStops
                                .map((s) => `${hexToRgbaString(s.color)} ${s.position}%`)
                                .join(", ")})`
                            : `conic-gradient(from ${preset.angle}deg, ${preset.colorStops
                                .map((s) => `${hexToRgbaString(s.color)} ${s.position}%`)
                                .join(", ")})`,
                      }}
                    />
                    <Text className="preset-name">{preset.name}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Col>

          <Col xs={24} lg={12}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div className="gradient-preview-section">
                <Text strong>预览</Text>
                <div className="gradient-preview" style={{ background: generateCSSGradient() }} />
              </div>

              <Tabs
                defaultActiveKey="css"
                items={[
                  {
                    key: "css",
                    label: "CSS 代码",
                    children: (
                      <div className="code-output">
                        <Input.TextArea
                          value={generateCSSGradient()}
                          readOnly
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          className="code-textarea"
                        />
                        <Button
                          type="primary"
                          icon={copied === "css" ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => copyToClipboard(generateCSSGradient(), "css")}
                        >
                          复制 CSS
                        </Button>
                      </div>
                    ),
                  },
                  {
                    key: "svg",
                    label: "SVG 代码",
                    children: (
                      <div className="code-output">
                        <Input.TextArea
                          value={generateSVGGradient()}
                          readOnly
                          autoSize={{ minRows: 8, maxRows: 12 }}
                          className="code-textarea"
                        />
                        <Button
                          type="primary"
                          icon={copied === "svg" ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={() => copyToClipboard(generateSVGGradient(), "svg")}
                        >
                          复制 SVG
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default GradientGenerator;
