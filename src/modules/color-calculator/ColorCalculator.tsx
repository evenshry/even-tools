import { useState, useEffect, useRef } from "react";
import { Layout, Space, Tabs, message } from "antd";
import { EyeOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { Color } from "antd/es/color-picker";
import ModuleHeader from "@/components/ModuleHeader";
import GradientGenerator from "@/modules/color-calculator/components/GradientGenerator";
import ColorSelectionCard from "@/modules/color-calculator/components/ColorSelectionCard";
import ColorInfoCard from "@/modules/color-calculator/components/ColorInfoCard";
import ContrastAnalysis from "@/modules/color-calculator/components/ContrastAnalysis";
import ColorBlindnessSimulation from "@/modules/color-calculator/components/ColorBlindnessSimulation";
import ColorHarmonies from "@/modules/color-calculator/components/ColorHarmonies";
import ClipboardColorModal from "@/modules/color-calculator/components/ClipboardColorModal";
import { parseColorWithDetails, type ParseColorResult } from "@/modules/color-calculator/utils/colorUtils";
import "@/modules/color-calculator/ColorCalculator.scss";

const { Content } = Layout;

const ColorCalculator = () => {
  const [foregroundColor, setForegroundColor] = useState("000000");
  const [backgroundColor, setBackgroundColor] = useState("FFFFFF");
  const [copied, setCopied] = useState<string | null>(null);
  const [showColorModal, setShowColorModal] = useState(false);
  const [detectedColor, setDetectedColor] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const lastDetectedColor = useRef<string | null>(null);
  const promptedColorsRef = useRef<Set<string>>(new Set());
  // 记录本应用最近写入剪贴板的内容，避免轮询重复弹出检测框
  const lastCopiedTextRef = useRef<string | null>(null);
  const clipboardErrorReportedRef = useRef(false);

  useEffect(() => {
    const loadPromptedColors = () => {
      try {
        const saved = localStorage.getItem("color-calculator-prompted-colors");
        if (saved) {
          promptedColorsRef.current = new Set(JSON.parse(saved));
        }
      } catch {
        // 本地记录损坏时忽略即可
      }
    };

    loadPromptedColors();

    const checkClipboardPeriodically = async () => {
      // 页面不可见时不读取剪贴板
      if (document.hidden) {
        return;
      }

      try {
        const text = await navigator.clipboard.readText();
        clipboardErrorReportedRef.current = false;

        // 应用内复制的内容不再提示
        if (lastCopiedTextRef.current !== null && text === lastCopiedTextRef.current) {
          return;
        }

        const result: ParseColorResult = parseColorWithDetails(text);

        if (result.success && result.color) {
          const normalizedColor = result.color.toLowerCase();

          if (lastDetectedColor.current !== normalizedColor) {
            lastDetectedColor.current = normalizedColor;

            if (!promptedColorsRef.current.has(normalizedColor)) {
              promptedColorsRef.current.add(normalizedColor);

              // 限制记录数量，避免无限增长
              if (promptedColorsRef.current.size > 200) {
                const oldest = promptedColorsRef.current.values().next().value;
                if (oldest !== undefined) {
                  promptedColorsRef.current.delete(oldest);
                }
              }

              try {
                localStorage.setItem("color-calculator-prompted-colors", JSON.stringify(Array.from(promptedColorsRef.current)));
              } catch {
                // 存储失败不影响颜色检测
              }

              setDetectedColor(result.color);
              setDetectedFormat(result.format || "HEX");
              setShowColorModal(true);
            }
          }
        }
      } catch {
        // 无权限或读取失败只记录一次，避免控制台刷屏
        if (!clipboardErrorReportedRef.current) {
          clipboardErrorReportedRef.current = true;
          console.warn("无法读取剪贴板，颜色自动检测已暂停");
        }
      }
    };

    const interval = setInterval(checkClipboardPeriodically, 2000);

    return () => clearInterval(interval);
  }, []);

  const applyDetectedColor = (type: "foreground" | "background") => {
    if (detectedColor) {
      const hex = detectedColor.replace("#", "");
      if (type === "foreground") {
        setForegroundColor(hex);
      } else {
        setBackgroundColor(hex);
      }
      message.success(`已应用${detectedFormat}颜色到${type === "foreground" ? "前景色" : "背景色"}`);
      setShowColorModal(false);
      setDetectedColor(null);
      setDetectedFormat(null);
    }
  };

  const handleColorChange = (color: Color, type: "foreground" | "background") => {
    // toHexString 会在透明时输出 8 位 HEX，避免丢失 alpha
    const hex = color.toHexString().replace("#", "");
    if (type === "foreground") {
      setForegroundColor(hex);
    } else {
      setBackgroundColor(hex);
    }
  };

  const handleHexInput = (value: string, type: "foreground" | "background") => {
    const result: ParseColorResult = parseColorWithDetails(value);

    if (result.success && result.color) {
      const hex = result.color.replace("#", "");
      if (type === "foreground") {
        setForegroundColor(hex);
      } else {
        setBackgroundColor(hex);
      }
      message.success(`已应用${result.format}颜色`);
    }
    // 非法输入由输入框自身标红提示，这里不再重复弹窗
  };

  const handleSwapColors = () => {
    const temp = foregroundColor;
    setForegroundColor(backgroundColor);
    setBackgroundColor(temp);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      lastCopiedTextRef.current = text;
      setCopied(text);
      message.success("已复制到剪贴板");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      message.error("复制失败，请手动复制");
    }
  };

  return (
    <Layout className="color-calculator">
      <ModuleHeader title="颜色计算器" />

      <Content className="color-calculator__content">
        <div style={{ display: "flex", gap: 24, flexDirection: "row", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 33.333%", minWidth: 300 }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <ColorSelectionCard
                foregroundColor={foregroundColor}
                backgroundColor={backgroundColor}
                onColorChange={handleColorChange}
                onHexInput={handleHexInput}
                onSwapColors={handleSwapColors}
              />

              <ColorInfoCard color={foregroundColor} label="前景色" copied={copied} onCopy={copyToClipboard} />
              <ColorInfoCard color={backgroundColor} label="背景色" copied={copied} onCopy={copyToClipboard} />
            </Space>
          </div>

          <div style={{ flex: 1, minWidth: 300 }}>
            <Tabs
              defaultActiveKey="harmonies"
              items={[
                {
                  key: "harmonies",
                  label: (
                    <span>
                      <EyeOutlined />
                      颜色搭配
                    </span>
                  ),
                  children: <ColorHarmonies foregroundColor={foregroundColor} onCopy={copyToClipboard} />,
                },
                {
                  key: "colorblind",
                  label: (
                    <span>
                      <EyeOutlined />
                      色盲模拟
                    </span>
                  ),
                  children: <ColorBlindnessSimulation foregroundColor={foregroundColor} backgroundColor={backgroundColor} />,
                },
                {
                  key: "contrast",
                  label: (
                    <span>
                      <EyeOutlined />
                      对比度分析
                    </span>
                  ),
                  children: <ContrastAnalysis foregroundColor={foregroundColor} backgroundColor={backgroundColor} />,
                },
                {
                  key: "gradient",
                  label: (
                    <span>
                      <ThunderboltOutlined />
                      渐变生成实验室
                    </span>
                  ),
                  children: <GradientGenerator />,
                },
              ]}
            />
          </div>
        </div>
      </Content>

      <ClipboardColorModal
        open={showColorModal}
        detectedColor={detectedColor}
        detectedFormat={detectedFormat}
        onApply={applyDetectedColor}
        onCancel={() => {
          setShowColorModal(false);
          setDetectedColor(null);
          setDetectedFormat(null);
        }}
      />
    </Layout>
  );
};

export default ColorCalculator;
