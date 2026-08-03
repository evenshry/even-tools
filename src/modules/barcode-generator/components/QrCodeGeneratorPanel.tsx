import { useState, useEffect, useCallback } from "react";
import { Card, Input, Select, Slider, Button, Space, message, Empty } from "antd";
import QRCode from "qrcode";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

const ERROR_LEVELS = [
  { value: "L", label: "L (低) - 7% 容错" },
  { value: "M", label: "M (中) - 15% 容错" },
  { value: "Q", label: "Q (较高) - 25% 容错" },
  { value: "H", label: "H (高) - 30% 容错" },
];

const SIZE_PRESETS = [
  { name: "小", size: 150 },
  { name: "中", size: 250 },
  { name: "大", size: 350 },
  { name: "特大", size: 500 },
];

const COLOR_PRESETS = [
  { name: "黑色", value: "#000000" },
  { name: "深灰", value: "#333333" },
  { name: "蓝色", value: "#1890ff" },
  { name: "红色", value: "#ff4d4f" },
  { name: "绿色", value: "#52c41a" },
];

interface GeneratedItem {
  id: number;
  value: string;
  dataUrl: string;
  error?: string;
}

const QrCodeGeneratorPanel = () => {
  const mode = useThemeStore((s) => s.mode);
  const [inputText, setInputText] = useState("https://example.com");
  const [size, setSize] = useState(250);
  const [errorLevel, setErrorLevel] = useState("M");
  const [margin, setMargin] = useState(4);
  const [color, setColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [maskPattern, setMaskPattern] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined>(undefined);
  const [items, setItems] = useState<GeneratedItem[]>([]);

  const generateQrCodes = useCallback(async () => {
    const values = inputText
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v);

    if (values.length === 0) {
      setItems([]);
      return;
    }

    const newItems: GeneratedItem[] = [];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const canvas = document.createElement("canvas");
      try {
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: margin,
          color: {
            dark: color,
            light: bgColor,
          },
          errorCorrectionLevel: errorLevel as any,
          maskPattern,
        });
        newItems.push({
          id: i,
          value,
          dataUrl: canvas.toDataURL("image/png"),
        });
      } catch (error) {
        newItems.push({
          id: i,
          value,
          dataUrl: "",
          error: (error as Error).message,
        });
      }
    }

    setItems(newItems);
  }, [inputText, size, margin, color, bgColor, errorLevel, maskPattern]);

  useEffect(() => {
    generateQrCodes();
  }, [generateQrCodes]);

  const downloadSingle = async (item: GeneratedItem, format: "png" | "jpeg" | "svg") => {
    if (item.error || !item.dataUrl) {
      message.warning(`"${item.value}" 生成失败，无法下载`);
      return;
    }

    if (format === "svg") {
      try {
        const svgString = await QRCode.toString(item.value, {
          width: size,
          margin: margin,
          color: {
            dark: color,
            light: bgColor,
          },
          errorCorrectionLevel: errorLevel as any,
          maskPattern,
        });
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qrcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        message.success("已下载 SVG 图片");
      } catch {
        message.error("生成 SVG 失败");
      }
      return;
    }

    const link = document.createElement("a");
    link.download = `qrcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.${format}`;
    link.href = item.dataUrl;
    link.click();
    message.success("已下载图片");
  };

  const downloadAll = async (format: "png" | "jpeg") => {
    const validItems = items.filter((item) => !item.error && item.dataUrl);
    if (validItems.length === 0) {
      message.warning("没有可下载的二维码");
      return;
    }

    for (const item of validItems) {
      const link = document.createElement("a");
      link.download = `qrcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.${format}`;
      link.href = item.dataUrl;
      link.click();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    message.success(`已下载 ${validItems.length} 个图片`);
  };

  return (
    <div style={{ display: "flex", gap: 24, flexDirection: "row", flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 40%", minWidth: 500 }}>
        <Card title="二维码设置" className="qrcode-card">
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                输入内容（每行一个，支持批量生成）
              </label>
              <Input.TextArea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={"请输入二维码内容，每行一个，例如：\nhttps://example.com\nHello World\n产品编号001"}
                rows={5}
                maxLength={5000}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: semanticColors.gray999[mode] }}>
                共 {inputText.split("\n").filter((v) => v.trim()).length} 条记录
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  尺寸: {size}×{size}px
                </label>
                <Slider min={100} max={600} value={size} onChange={setSize} step={10} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>容错级别</label>
                <Select
                  value={errorLevel}
                  onChange={setErrorLevel}
                  options={ERROR_LEVELS}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  边距: {margin}px
                </label>
                <Slider min={0} max={20} value={margin} onChange={setMargin} step={1} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  掩码模式: {maskPattern !== undefined ? maskPattern : "自动"}
                </label>
                <Slider
                  min={0}
                  max={7}
                  value={maskPattern ?? 0}
                  onChange={(value) => setMaskPattern(value as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                  marks={{
                    0: "0",
                    1: "1",
                    2: "2",
                    3: "3",
                    4: "4",
                    5: "5",
                    6: "6",
                    7: "7",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>前景色</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setColor(preset.value)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        backgroundColor: preset.value,
                        border: color === preset.value ? "2px solid #1890ff" : "2px solid #d9d9d9",
                        cursor: "pointer",
                        transition: "border-color 0.2s",
                      }}
                      title={preset.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: 6, cursor: "pointer" }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>背景色</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setBgColor("#ffffff")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: "#ffffff",
                      border: bgColor === "#ffffff" ? "2px solid #1890ff" : "2px solid #d9d9d9",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    title="白色"
                  />
                  <button
                    onClick={() => setBgColor("#f5f5f5")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: "#f5f5f5",
                      border: bgColor === "#f5f5f5" ? "2px solid #1890ff" : "2px solid #d9d9d9",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    title="浅灰"
                  />
                  <button
                    onClick={() => setBgColor("#000000")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: "#000000",
                      border: bgColor === "#000000" ? "2px solid #1890ff" : "2px solid #d9d9d9",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    title="黑色"
                  />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: 6, cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          </Space>
        </Card>
      </div>

      <div style={{ flex: 1, minWidth: 320 }}>
        <Card
          title={`预览（${items.filter((i) => !i.error).length}/${items.length} 个）`}
          className="qrcode-card"
          extra={
            items.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => downloadAll("png")} size="small" type="primary">
                  全部下载 PNG
                </Button>
                <Button onClick={() => downloadAll("jpeg")} size="small">
                  全部下载 JPEG
                </Button>
              </div>
            )
          }
        >
          {items.length === 0 ? (
            <Empty description="请输入内容生成二维码" />
          ) : (
            <div className="preview-grid">
              {items.map((item) => (
                <div key={item.id} className="preview-grid__item">
                  {item.error ? (
                    <div className="preview-grid__error">
                      <span>生成失败</span>
                      <small>{item.error}</small>
                    </div>
                  ) : (
                    <img src={item.dataUrl} alt={item.value} className="preview-grid__img" />
                  )}
                  <div className="preview-grid__label">{item.value}</div>
                  {!item.error && (
                    <div className="preview-grid__actions">
                      <Button size="small" onClick={() => downloadSingle(item, "png")}>PNG</Button>
                      <Button size="small" onClick={() => downloadSingle(item, "jpeg")}>JPEG</Button>
                      <Button size="small" onClick={() => downloadSingle(item, "svg")}>SVG</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="barcode-options">
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>尺寸预设</label>
              <div className="size-presets">
                {SIZE_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    onClick={() => setSize(preset.size)}
                    type={size === preset.size ? "primary" : "default"}
                  >
                    {preset.name} ({preset.size}×{preset.size})
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QrCodeGeneratorPanel;