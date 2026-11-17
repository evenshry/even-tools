import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, Input, Select, Slider, Button, Space, Alert, Empty, Spin, message } from "antd";
import QRCode from "qrcode";
import type { QRCodeErrorCorrectionLevel, QRCodeMaskPattern } from "qrcode";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

// 单次最多生成的条数，避免一次渲染过多大图把页面卡死
const MAX_ITEMS = 50;
// 参数变化后的防抖时间，避免拖动滑杆时每一格都重画
const DEBOUNCE_MS = 200;
// 导出倍率：最终像素 = 尺寸 × 倍率
const EXPORT_SCALES = [1, 2, 3];
// 预览图最大显示边长（CSS px），避免高倍率导出把布局撑爆
const PREVIEW_MAX = 200;
// 拼版图单元格边长
const SHEET_CELL = 200;

const ERROR_LEVELS: { value: QRCodeErrorCorrectionLevel; label: string }[] = [
  { value: "L", label: "L (低) - 7% 容错" },
  { value: "M", label: "M (中) - 15% 容错" },
  { value: "Q", label: "Q (较高) - 25% 容错" },
  { value: "H", label: "H (高) - 30% 容错" },
];

const MASK_OPTIONS = [
  { value: "auto", label: "自动（推荐）" },
  ...Array.from({ length: 8 }, (_, i) => ({ value: String(i), label: `掩码 ${i}` })),
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

const BG_PRESETS = [
  { name: "白色", value: "#ffffff" },
  { name: "浅灰", value: "#f5f5f5" },
  { name: "黑色", value: "#000000" },
];

interface GeneratedItem {
  id: string;
  value: string;
  dataUrl: string;
  /** 实际导出的像素边长（按模块整数倍对齐后） */
  pixelSize: number;
  error?: string;
}

/** 把 qrcode 的英文报错转成中文提示 */
const humanizeQrError = (msg: string) => {
  if (/too big|too long|overflow|amount of data/i.test(msg)) {
    return "内容过长，超出二维码容量，请缩短内容或降低容错级别";
  }
  return msg || "生成失败";
};

const parseHexColor = (hex: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let raw = match[1];
  if (raw.length === 3) {
    raw = raw
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(raw, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

/** WCAG 相对亮度 */
const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });

const buildFileName = (value: string, index: number, ext: string) => {
  const safe = value
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return `qrcode_${String(index + 1).padStart(2, "0")}${safe ? `_${safe}` : ""}.${ext}`;
};

const triggerDownload = (href: string, filename: string) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
};

interface SwatchProps {
  color: string;
  active: boolean;
  label: string;
  onSelect: (color: string) => void;
}

const ColorSwatch = ({ color, active, label, onSelect }: SwatchProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={() => onSelect(color)}
    style={{
      width: 36,
      height: 36,
      padding: 0,
      borderRadius: 6,
      backgroundColor: color,
      border: active ? "2px solid #1890ff" : "2px solid #d9d9d9",
      cursor: "pointer",
      transition: "border-color 0.2s",
    }}
  />
);

const QrCodeGeneratorPanel = () => {
  const mode = useThemeStore((s) => s.mode);
  const [inputText, setInputText] = useState("https://example.com");
  const [size, setSize] = useState(250);
  const [exportScale, setExportScale] = useState(2);
  const [errorLevel, setErrorLevel] = useState<QRCodeErrorCorrectionLevel>("M");
  const [margin, setMargin] = useState(4);
  const [color, setColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [maskPattern, setMaskPattern] = useState<QRCodeMaskPattern | undefined>(undefined);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 每次生成自增，异步任务发现 runId 已过期就直接丢弃结果，避免旧结果覆盖新结果
  const runIdRef = useRef(0);

  const allLines = useMemo(
    () =>
      inputText
        .split("\n")
        .map((v) => v.trim())
        .filter((v) => v),
    [inputText]
  );
  const truncated = allLines.length > MAX_ITEMS;
  const values = useMemo(
    () => (truncated ? allLines.slice(0, MAX_ITEMS) : allLines),
    [allLines, truncated]
  );

  /** 按模块整数倍对齐计算导出参数，保证每个模块的像素宽度完全一致 */
  const resolveRenderOptions = useCallback((value: string) => {
    const symbol = QRCode.create(value, {
      errorCorrectionLevel: errorLevel,
      maskPattern,
    });
    const totalModules = symbol.modules.size + margin * 2;
    const targetPx = size * exportScale;
    const scale = Math.max(1, Math.floor(targetPx / totalModules));
    return {
      width: scale * totalModules,
      margin,
      color: { dark: color, light: bgColor },
      errorCorrectionLevel: errorLevel,
      maskPattern,
    };
  }, [size, exportScale, margin, color, bgColor, errorLevel, maskPattern]);

  const generateQrCodes = useCallback(async () => {
    const runId = ++runIdRef.current;

    if (values.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const nextItems: GeneratedItem[] = [];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      try {
        const options = resolveRenderOptions(value);
        const dataUrl = await QRCode.toDataURL(value, { ...options, type: "image/png" });
        nextItems.push({
          id: `${i}:${value}`,
          value,
          dataUrl,
          pixelSize: options.width,
        });
      } catch (error) {
        nextItems.push({
          id: `${i}:${value}`,
          value,
          dataUrl: "",
          pixelSize: 0,
          error: humanizeQrError((error as Error).message),
        });
      }
      // 期间参数又变了，放弃这批结果
      if (runId !== runIdRef.current) return;
    }

    setItems(nextItems);
    setLoading(false);
  }, [values, resolveRenderOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void generateQrCodes();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [generateQrCodes]);

  // 前景/背景对比度校验：QR 码依赖足够的明暗差才能被识别
  const contrast = useMemo(() => {
    const fg = parseHexColor(color);
    const bg = parseHexColor(bgColor);
    if (!fg || !bg) return null;
    const fgLum = relativeLuminance(fg);
    const bgLum = relativeLuminance(bg);
    const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    return { ratio, inverted: fgLum > bgLum };
  }, [color, bgColor]);

  const contrastWarning = useMemo(() => {
    if (!contrast) return "";
    if (contrast.inverted) {
      return "前景色比背景色更亮，多数扫码器无法识别，建议交换前景色与背景色";
    }
    if (contrast.ratio < 3) {
      return `前景/背景对比度仅 ${contrast.ratio.toFixed(1)}:1，扫码失败风险很高，建议改用深色前景 + 浅色背景`;
    }
    if (contrast.ratio < 4.5) {
      return `前景/背景对比度 ${contrast.ratio.toFixed(1)}:1 偏低，建议提高对比度以提升识别率`;
    }
    return "";
  }, [contrast]);

  const validCount = useMemo(() => items.filter((i) => !i.error).length, [items]);

  const downloadSingle = async (
    item: GeneratedItem,
    index: number,
    format: "png" | "jpeg" | "svg"
  ) => {
    if (item.error || !item.dataUrl) {
      message.warning(`"${item.value}" 生成失败，无法下载`);
      return;
    }

    try {
      const options = resolveRenderOptions(item.value);

      if (format === "svg") {
        const svgString = await QRCode.toString(item.value, { ...options, type: "svg" });
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, buildFileName(item.value, index, "svg"));
        URL.revokeObjectURL(url);
        message.success("已下载 SVG 图片");
        return;
      }

      const extension = format === "jpeg" ? "jpeg" : "png";
      // JPEG 需要真正重新编码，不能把 PNG dataURL 直接改名；PNG 也按当前参数重新生成，避免用到旧配置
      const dataUrl =
        format === "jpeg"
          ? await QRCode.toDataURL(item.value, {
              ...options,
              type: "image/jpeg",
              rendererOpts: { quality: 0.95 },
            })
          : await QRCode.toDataURL(item.value, { ...options, type: "image/png" });
      triggerDownload(dataUrl, buildFileName(item.value, index, extension));
      message.success(`已下载 ${extension.toUpperCase()} 图片`);
    } catch {
      message.error("导出图片失败");
    }
  };

  /** 批量下载改为输出一张拼版图，避免浏览器拦截连续多个下载 */
  const downloadSheet = async (format: "png" | "jpeg") => {
    const validItems = items.filter((item) => !item.error && item.dataUrl);
    if (validItems.length === 0) {
      message.warning("没有可下载的二维码");
      return;
    }

    try {
      const images = await Promise.all(validItems.map((item) => loadImage(item.dataUrl)));
      const columns = Math.min(5, Math.ceil(Math.sqrt(validItems.length)));
      const rows = Math.ceil(validItems.length / columns);
      const gap = 16;
      const labelHeight = 24;

      const canvas = document.createElement("canvas");
      canvas.width = columns * (SHEET_CELL + gap) + gap;
      canvas.height = rows * (SHEET_CELL + gap + labelHeight) + gap;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#333333";
      ctx.imageSmoothingEnabled = false;

      images.forEach((img, idx) => {
        const row = Math.floor(idx / columns);
        const column = idx % columns;
        const x = gap + column * (SHEET_CELL + gap);
        const y = gap + row * (SHEET_CELL + gap + labelHeight);
        ctx.drawImage(img, x, y, SHEET_CELL, SHEET_CELL);
        const text = validItems[idx].value;
        ctx.fillText(
          text.length > 22 ? `${text.slice(0, 22)}…` : text,
          x + SHEET_CELL / 2,
          y + SHEET_CELL + 6
        );
      });

      triggerDownload(
        canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.95),
        `qrcode_sheet_${validItems.length}.${format}`
      );
      message.success(`已将 ${validItems.length} 个二维码合并为一张拼版图`);
    } catch {
      message.error("生成拼版图失败");
    }
  };

  const previewSize = Math.min(size, PREVIEW_MAX);

  return (
    <div style={{ display: "flex", gap: 24, flexDirection: "row", flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 35%", minWidth: 450 }}>
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
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: truncated ? "#fa8c16" : semanticColors.gray999[mode],
                }}
              >
                共 {allLines.length} 条记录
                {truncated ? `，单次最多生成前 ${MAX_ITEMS} 条` : ""}
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
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  导出倍率
                </label>
                <Select
                  value={exportScale}
                  onChange={setExportScale}
                  options={EXPORT_SCALES.map((scale) => ({
                    value: scale,
                    label: `${scale}x（${size * scale}px）`,
                  }))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div style={{ marginTop: -12, fontSize: 12, color: semanticColors.gray999[mode] }}>
              实际像素按模块整数倍对齐，可能略小于目标值，可保证二维码不模糊
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  容错级别
                </label>
                <Select
                  value={errorLevel}
                  onChange={setErrorLevel}
                  options={ERROR_LEVELS}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                  静区边距: {margin} 模块
                </label>
                <Slider min={0} max={20} value={margin} onChange={setMargin} step={1} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                掩码模式
              </label>
              <Select
                value={maskPattern === undefined ? "auto" : String(maskPattern)}
                onChange={(value) =>
                  setMaskPattern(
                    value === "auto" ? undefined : (Number(value) as QRCodeMaskPattern)
                  )
                }
                options={MASK_OPTIONS}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>前景色</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLOR_PRESETS.map((preset) => (
                    <ColorSwatch
                      key={preset.value}
                      color={preset.value}
                      label={preset.name}
                      active={color === preset.value}
                      onSelect={setColor}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="自定义前景色"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: 6, cursor: "pointer" }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>背景色</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {BG_PRESETS.map((preset) => (
                    <ColorSwatch
                      key={preset.value}
                      color={preset.value}
                      label={preset.name}
                      active={bgColor === preset.value}
                      onSelect={setBgColor}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="自定义背景色"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: 6, cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>

            {contrastWarning && <Alert type="warning" showIcon message={contrastWarning} />}

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
          </Space>
        </Card>
      </div>

      <div style={{ flex: 1, minWidth: 320 }}>
        <Card
          title={`预览（${validCount}/${items.length} 个）`}
          className="qrcode-card"
          extra={
            validCount > 1 && (
              <Space size={8}>
                <Button onClick={() => downloadSheet("png")} size="small" type="primary">
                  全部下载 PNG
                </Button>
                <Button onClick={() => downloadSheet("jpeg")} size="small">
                  全部下载 JPEG
                </Button>
              </Space>
            )
          }
        >
          <Spin spinning={loading}>
            {items.length === 0 ? (
              <Empty description="请输入内容生成二维码" />
            ) : (
              <div className="preview-grid">
                {items.map((item, index) => (
                  <div key={item.id} className="preview-grid__item">
                    {item.error ? (
                      <div className="preview-grid__error">
                        <span>生成失败</span>
                        <small>{item.error}</small>
                      </div>
                    ) : (
                      <img
                        src={item.dataUrl}
                        alt={item.value}
                        title={`${item.value}（${item.pixelSize}×${item.pixelSize}px）`}
                        className="preview-grid__img"
                        style={{
                          width: previewSize,
                          height: previewSize,
                          // 缩小时用平滑插值，放大时保持像素锐利，避免模块被抽稀或糊掉
                          imageRendering: item.pixelSize > previewSize ? "auto" : "crisp-edges",
                        }}
                      />
                    )}
                    <div className="preview-grid__label">{item.value}</div>
                    {!item.error && (
                      <div className="preview-grid__actions">
                        <Button size="small" onClick={() => downloadSingle(item, index, "png")}>
                          PNG
                        </Button>
                        <Button size="small" onClick={() => downloadSingle(item, index, "jpeg")}>
                          JPEG
                        </Button>
                        <Button size="small" onClick={() => downloadSingle(item, index, "svg")}>
                          SVG
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Spin>
          {validCount > 1 && (
            <div style={{ marginTop: 16, fontSize: 12, color: semanticColors.gray999[mode] }}>
              「全部下载」会合并为一张拼版图，避免浏览器拦截连续下载
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default QrCodeGeneratorPanel;
