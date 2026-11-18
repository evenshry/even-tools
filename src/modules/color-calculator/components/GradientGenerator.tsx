import { useEffect, useState } from "react";
import { Card, Button, Slider, Space, Typography, Row, Col, message, Tabs, Select, Input, ColorPicker } from "antd";
import { PlusOutlined, DeleteOutlined, CopyOutlined, CheckOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { hexToRgbaString, parseColor } from "@/modules/color-calculator/utils/colorUtils";
import type { ColorCalculator } from "@/modules/color-calculator/data/interface";
import { GRADIENT_PRESETS } from "@/modules/color-calculator/data/colorCalculator";
import "@/modules/color-calculator/components/GradientGenerator.scss";

const { Text } = Typography;
const { Option } = Select;

interface ColorStopCardProps {
  stop: ColorCalculator.ColorStop;
  index: number;
  removable: boolean;
  onColorChange: (color: string) => void;
  onPositionChange: (position: number) => void;
  onRemove: () => void;
}

const ColorStopCard = ({ stop, index, removable, onColorChange, onPositionChange, onRemove }: ColorStopCardProps) => {
  // 颜色输入使用本地草稿，失焦或回车时才提交，避免中间态写入非法值
  const [draft, setDraft] = useState(stop.color);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(stop.color);
    setInvalid(false);
  }, [stop.color]);

  const commitDraft = () => {
    const parsed = parseColor(draft);
    if (parsed) {
      setInvalid(false);
      onColorChange(parsed);
    } else {
      setInvalid(true);
    }
  };

  return (
    <Card size="small" className="color-stop-card">
      <Space direction="vertical" style={{ width: "100%" }}>
        <div className="color-stop-header">
          <Text strong>颜色 {index + 1}</Text>
          {removable && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={onRemove} />}
        </div>
        <div className="color-stop-controls">
          <div className="color-picker-wrapper">
            <ColorPicker
              value={stop.color}
              onChange={(color) => onColorChange(color.toHexString())}
              className="color-input"
            />
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setInvalid(false);
              }}
              onBlur={commitDraft}
              onPressEnter={commitDraft}
              status={invalid ? "error" : undefined}
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
              onChange={onPositionChange}
            />
          </div>
        </div>
      </Space>
    </Card>
  );
};

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
    const gradientId = `gradient-${gradientType}`;

    // SVG 没有原生圆锥渐变，改用 foreignObject 承载 CSS conic-gradient，避免导出错误效果
    if (gradientType === "conic") {
      return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${generateCSSGradient()}"></div>
  </foreignObject>
</svg>`;
    }

    let gradientElement = "";

    if (gradientType === "linear") {
      const x1 = Math.round(50 + 50 * Math.cos(((angle - 90) * Math.PI) / 180));
      const y1 = Math.round(50 + 50 * Math.sin(((angle - 90) * Math.PI) / 180));
      const x2 = Math.round(50 + 50 * Math.cos(((angle + 90) * Math.PI) / 180));
      const y2 = Math.round(50 + 50 * Math.sin(((angle + 90) * Math.PI) / 180));

      gradientElement = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
    } else {
      gradientElement = `<radialGradient id="${gradientId}">`;
    }

    const stops = sortedStops.map((stop) => `  <stop offset="${stop.position}%" stop-color="${hexToRgbaString(stop.color)}" />`).join("\n");

    return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
${gradientElement}
${stops}
</${gradientType === "radial" ? "radialGradient" : "linearGradient"}>
  </defs>
  <rect width="100%" height="100%" fill="url(#${gradientId})" />
</svg>`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      message.success("已复制到剪贴板");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  const renderColorStopControls = (stop: ColorCalculator.ColorStop, index: number) => (
    <ColorStopCard
      key={stop.id}
      stop={stop}
      index={index}
      removable={colorStops.length > 2}
      onColorChange={(color) => updateColorStop(stop.id, "color", color)}
      onPositionChange={(position) => updateColorStop(stop.id, "position", position)}
      onRemove={() => removeColorStop(stop.id)}
    />
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
