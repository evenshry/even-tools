import type { ThemeMode } from "@/store/useThemeStore";

export function pick(mode: ThemeMode, light: string, dark: string): string {
  return mode === "dark" ? dark : light;
}

export const semanticColors = {
  ink:    { light: "#1a1d21", dark: "#f1f3f5" },
  ink2:   { light: "#475569", dark: "#94a3b8" },
  ink3:   { light: "#94a3b8", dark: "#64748b" },
  brand:   { light: "#e0484f", dark: "#f25962" },
  info:    { light: "#1890ff", dark: "#60a5fa" },
  success: { light: "#52c41a", dark: "#34d399" },
  warning: { light: "#faad14", dark: "#fbbf24" },
  error:   { light: "#ff4d4f", dark: "#f87171" },
  error2:  { light: "#ff7875", dark: "#fca5a5" },
  gray999: { light: "#999",    dark: "#94a3b8" },
  gray888: { light: "#888",    dark: "#94a3b8" },
  gray8c:  { light: "#8c8c8c", dark: "#64748b" },
  gray666: { light: "#666",    dark: "#94a3b8" },
  grayd9:  { light: "#d9d9d9", dark: "#3a3f47" },
  grayccc: { light: "#ccc",    dark: "#3a3f47" },
  graye8:  { light: "#e8e8e8", dark: "#2a2f37" },
  grayf0:  { light: "#f0f0f0", dark: "#252930" },
  grayf5:  { light: "#f5f5f5", dark: "#252930" },
  infoBlue:   { light: "#3b82f6", dark: "#60a5fa" },
  blue2563eb: { light: "#2563eb", dark: "#60a5fa" },
  green16a34a:{ light: "#16a34a", dark: "#34d399" },
};
