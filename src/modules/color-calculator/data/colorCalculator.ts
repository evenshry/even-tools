import type { ColorCalculator } from "@/modules/color-calculator/data/interface";

export const COLOR_BLINDNESS_TYPES: ColorCalculator.ColorBlindnessType[] = [
  { id: "protanopia", name: "红色盲", description: "无法感知红色" },
  { id: "deuteranopia", name: "绿色盲", description: "无法感知绿色" },
  { id: "tritanopia", name: "蓝色盲", description: "无法感知蓝色" },
  { id: "achromatopsia", name: "全色盲", description: "完全无法感知颜色" },
];

export const GRADIENT_PRESETS: ColorCalculator.GradientPreset[] = [
  {
    name: "日落",
    type: "linear",
    angle: 180,
    colorStops: [
      { id: "1", color: "#ff6b6b", position: 0 },
      { id: "2", color: "#feca57", position: 50 },
      { id: "3", color: "#ff9ff3", position: 100 },
    ],
  },
  {
    name: "海洋",
    type: "linear",
    angle: 135,
    colorStops: [
      { id: "1", color: "#667eea", position: 0 },
      { id: "2", color: "#764ba2", position: 100 },
    ],
  },
  {
    name: "森林",
    type: "linear",
    angle: 90,
    colorStops: [
      { id: "1", color: "#11998e", position: 0 },
      { id: "2", color: "#38ef7d", position: 100 },
    ],
  },
  {
    name: "极光",
    type: "linear",
    angle: 45,
    colorStops: [
      { id: "1", color: "#00c6ff", position: 0 },
      { id: "2", color: "#0072ff", position: 100 },
    ],
  },
  {
    name: "彩虹",
    type: "linear",
    angle: 90,
    colorStops: [
      { id: "1", color: "#ff0000", position: 0 },
      { id: "2", color: "#ff7f00", position: 16 },
      { id: "3", color: "#ffff00", position: 33 },
      { id: "4", color: "#00ff00", position: 50 },
      { id: "5", color: "#0000ff", position: 66 },
      { id: "6", color: "#4b0082", position: 83 },
      { id: "7", color: "#9400d3", position: 100 },
    ],
  },
  {
    name: "星空",
    type: "radial",
    angle: 0,
    colorStops: [
      { id: "1", color: "#0f0c29", position: 0 },
      { id: "2", color: "#302b63", position: 50 },
      { id: "3", color: "#24243e", position: 100 },
    ],
  },
  {
    name: "火焰",
    type: "linear",
    angle: 180,
    colorStops: [
      { id: "1", color: "#f12711", position: 0 },
      { id: "2", color: "#f5af19", position: 100 },
    ],
  },
  {
    name: "薄荷",
    type: "linear",
    angle: 135,
    colorStops: [
      { id: "1", color: "#a8edea", position: 0 },
      { id: "2", color: "#fed6e3", position: 100 },
    ],
  },
];
