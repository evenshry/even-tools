import { useState, useEffect, useCallback } from "react";
import { Card, Input, Select, Slider, Button, Space, message, Empty } from "antd";
import JsBarcode from "jsbarcode";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

const BARCODE_TYPES = [
  { value: "CODE128", label: "CODE 128 (通用)" },
  { value: "CODE128A", label: "CODE 128A" },
  { value: "CODE128B", label: "CODE 128B" },
  { value: "CODE128C", label: "CODE 128C" },
  { value: "EAN13", label: "EAN-13 (商品条码)" },
  { value: "EAN8", label: "EAN-8" },
  { value: "UPC-A", label: "UPC-A" },
  { value: "UPC-E", label: "UPC-E" },
  { value: "CODE39", label: "CODE 39" },
  { value: "CODE39EXTENDED", label: "CODE 39 Extended" },
  { value: "ITF", label: "ITF (交叉25码)" },
  { value: "ITF14", label: "ITF-14" },
  { value: "MSI", label: "MSI" },
  { value: "Pharmacode", label: "Pharmacode (药品码)" },
  { value: "Codabar", label: "Codabar" },
];

const SIZE_PRESETS = [
  { name: "小", width: 200, height: 80, lineWidth: 2 },
  { name: "中", width: 300, height: 120, lineWidth: 3 },
  { name: "大", width: 400, height: 160, lineWidth: 4 },
  { name: "特大", width: 500, height: 200, lineWidth: 5 },
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

const BarcodeGeneratorPanel = () => {
  const mode = useThemeStore((s) => s.mode);
  const [inputText, setInputText] = useState("123456789012");
  const [barcodeType, setBarcodeType] = useState("CODE128");
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(120);
  const [lineWidth, setLineWidth] = useState(4);
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState("#000000");
  const [displayValue, setDisplayValue] = useState(true);
  const [textPosition, setTextPosition] = useState("bottom");
  const [margin, setMargin] = useState(10);
  const [items, setItems] = useState<GeneratedItem[]>([]);

  const generateBarcodes = useCallback(() => {
    const values = inputText
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v);

    if (values.length === 0) {
      setItems([]);
      return;
    }

    const newItems: GeneratedItem[] = values.map((value, index) => {
      const canvas = document.createElement("canvas");
      try {
        JsBarcode(canvas, value, {
          format: barcodeType as any,
          width: lineWidth,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          textPosition: textPosition as any,
          margin: margin,
          lineColor: color,
          background: "#ffffff",
        });
        return {
          id: index,
          value,
          dataUrl: canvas.toDataURL("image/png"),
        };
      } catch (error) {
        return {
          id: index,
          value,
          dataUrl: "",
          error: (error as Error).message,
        };
      }
    });
    setItems(newItems);
  }, [inputText, barcodeType, lineWidth, height, fontSize, textPosition, margin, color, displayValue]);

  useEffect(() => {
    generateBarcodes();
  }, [generateBarcodes]);

  const downloadSingle = (item: GeneratedItem, format: "png" | "jpeg" | "svg") => {
    if (item.error || !item.dataUrl) {
      message.warning(`"${item.value}" 生成失败，无法下载`);
      return;
    }

    if (format === "svg") {
      const tempCanvas = document.createElement("canvas");
      try {
        JsBarcode(tempCanvas, item.value, {
          format: barcodeType as any,
          width: lineWidth,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          textPosition: textPosition as any,
          margin: margin,
          lineColor: color,
          background: "#ffffff",
        });
        const svgData = tempCanvas.outerHTML;
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `barcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
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
    link.download = `barcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
    link.href = item.dataUrl;
    link.click();
    message.success("已下载图片");
  };

  const downloadAll = async (format: "png" | "jpeg") => {
    const validItems = items.filter((item) => !item.error && item.dataUrl);
    if (validItems.length === 0) {
      message.warning("没有可下载的条形码");
      return;
    }

    for (const item of validItems) {
      const link = document.createElement("a");
      link.download = `barcode_${item.value.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
      link.href = item.dataUrl;
      link.click();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    message.success(`已下载 ${validItems.length} 个图片`);
  };

  return (
    <div style={{ display: "flex", gap: 24, flexDirection: "row", flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 40%", minWidth: 500 }}>
        <Card title="条形码设置" className="barcode-card">
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                输入内容（每行一个，支持批量生成）
              </label>
              <Input.TextArea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={"请输入条形码内容，每行一个，例如：\n123456789012\nABC123\nhttps://example.com"}
                rows={5}
                maxLength={5000}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: semanticColors.gray999[mode] }}>
                共 {inputText.split("\n").filter((v) => v.trim()).length} 条记录
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>条码类型</label>
                <Select
                  value={barcodeType}
                  onChange={setBarcodeType}
                  options={BARCODE_TYPES}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>文字位置</label>
                <Select
                  value={textPosition}
                  onChange={setTextPosition}
                  options={[
                    { value: "top", label: "上方" },
                    { value: "bottom", label: "下方" },
                    { value: "center", label: "居中" },
                  ]}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  线条宽度: {lineWidth}px
                </label>
                <Slider min={1} max={10} value={lineWidth} onChange={setLineWidth} step={0.5} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  高度: {height}px
                </label>
                <Slider min={30} max={300} value={height} onChange={setHeight} step={10} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  字体大小: {fontSize}px
                </label>
                <Slider min={8} max={48} value={fontSize} onChange={setFontSize} step={2} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>边距: {margin}px</label>
                <Slider min={0} max={50} value={margin} onChange={setMargin} step={2} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>颜色</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setColor(preset.value)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: preset.value,
                      border: color === preset.value ? "3px solid #1890ff" : "2px solid #d9d9d9",
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
                  style={{ width: 40, height: 40, borderRadius: 8, cursor: "pointer" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={displayValue}
                  onChange={(e) => setDisplayValue(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                显示文字
              </label>
            </div>
          </Space>
        </Card>
      </div>

      <div style={{ flex: 1, minWidth: 320 }}>
        <Card
          title={`预览（${items.filter((i) => !i.error).length}/${items.length} 个）`}
          className="barcode-card"
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
            <Empty description="请输入内容生成条形码" />
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
                    onClick={() => {
                      setWidth(preset.width);
                      setHeight(preset.height);
                      setLineWidth(preset.lineWidth);
                    }}
                    type={width === preset.width && height === preset.height ? "primary" : "default"}
                  >
                    {preset.name} ({preset.width}×{preset.height})
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

export default BarcodeGeneratorPanel;