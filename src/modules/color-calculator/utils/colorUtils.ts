import type { ColorCalculator } from "@/modules/color-calculator/data/interface";
import { COLOR_BLINDNESS_TYPES } from "@/modules/color-calculator/data/colorCalculator";

export type { ColorCalculator };
export { COLOR_BLINDNESS_TYPES };

export function hexToRgb(hex: string): ColorCalculator.RGB {
  let hexValue = hex.replace("#", "");
  
  if (hexValue.length === 3) {
    hexValue = hexValue.split("").map((c) => c + c).join("");
  } else if (hexValue.length === 4) {
    hexValue = hexValue.split("").map((c) => c + c).join("");
  }
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hexValue);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    const a = result[4] ? parseInt(result[4], 16) / 255 : undefined;
    return { r, g, b, a };
  }
  return { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number, a?: number): string {
  const hex = [r, g, b].map((x) => {
    const h = Math.round(x).toString(16);
    return h.length === 1 ? "0" + h : h;
  }).join("");
  
  if (a !== undefined) {
    const alphaHex = Math.round(a * 255).toString(16);
    const paddedAlpha = alphaHex.length === 1 ? "0" + alphaHex : alphaHex;
    return "#" + hex + paddedAlpha;
  }
  
  return "#" + hex;
}

export function rgbToHsl(r: number, g: number, b: number, a?: number): ColorCalculator.HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100, a };
}

export function hslToRgb(h: number, s: number, l: number, a?: number): ColorCalculator.RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
}

export function getLuminance(r: number, g: number, b: number): number {
  const [R, G, B] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function checkWCAGCompliance(contrastRatio: number): ColorCalculator.ContrastResult {
  return {
    ratio: contrastRatio,
    levelAA: contrastRatio >= 4.5,
    levelAAA: contrastRatio >= 7,
    levelAALarge: contrastRatio >= 3,
    levelAAALarge: contrastRatio >= 4.5,
  };
}

export function simulateColorBlindness(hex: string, type: string): string {
  const rgb = hexToRgb(hex);
  let r = rgb.r;
  let g = rgb.g;
  let b = rgb.b;

  const R = r;
  const G = g;
  const B = b;

  switch (type) {
    case "protanopia":
      r = 0.567 * R + 0.433 * G + 0 * B;
      g = 0.558 * R + 0.442 * G + 0 * B;
      b = 0 * R + 0.242 * G + 0.758 * B;
      break;
    case "deuteranopia":
      r = 0.625 * R + 0.375 * G + 0 * B;
      g = 0.7 * R + 0.3 * G + 0 * B;
      b = 0 * R + 0.3 * G + 0.7 * B;
      break;
    case "tritanopia":
      r = 0.95 * R + 0.05 * G + 0 * B;
      g = 0 * R + 0.433 * G + 0.567 * B;
      b = 0 * R + 0.475 * G + 0.525 * B;
      break;
    case "achromatopsia":
      const gray = 0.299 * R + 0.587 * G + 0.114 * B;
      r = gray;
      g = gray;
      b = gray;
      break;
    default:
      break;
  }

  return rgbToHex(
    Math.min(255, Math.max(0, r)),
    Math.min(255, Math.max(0, g)),
    Math.min(255, Math.max(0, b))
  );
}

export function generateComplementaryColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const complementary = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
  return [rgbToHex(complementary.r, complementary.g, complementary.b)];
}

export function generateAnalogousColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const color1 = hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
  const color2 = hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l);
  return [
    rgbToHex(color1.r, color1.g, color1.b),
    rgbToHex(color2.r, color2.g, color2.b),
  ];
}

export function generateTriadicColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const color1 = hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l);
  const color2 = hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l);
  return [
    rgbToHex(color1.r, color1.g, color1.b),
    rgbToHex(color2.r, color2.g, color2.b),
  ];
}

export function generateMonochromaticColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const colors: string[] = [];

  for (let i = 1; i <= 4; i++) {
    const newL = Math.max(0, Math.min(100, hsl.l + i * 10));
    const color = hslToRgb(hsl.h, hsl.s, newL);
    colors.push(rgbToHex(color.r, color.g, color.b));
  }

  for (let i = 1; i <= 4; i++) {
    const newL = Math.max(0, Math.min(100, hsl.l - i * 10));
    const color = hslToRgb(hsl.h, hsl.s, newL);
    colors.push(rgbToHex(color.r, color.g, color.b));
  }

  return colors;
}

export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/.test(hex);
}

export function getContrastLevel(ratio: number): string {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export function hexToRgbaString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (rgb.a !== undefined) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a.toFixed(2)})`;
  }
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export interface ParseColorResult {
  success: boolean;
  color?: string;
  format?: string;
  error?: string;
}

export function parseRgb(rgbString: string): ColorCalculator.RGB | null {
  const rgbaRegex = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i;
  const match = rgbaRegex.exec(rgbString);
  
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] ? parseFloat(match[4]) : undefined;
    
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      if (a !== undefined && (a < 0 || a > 1)) {
        return null;
      }
      return { r, g, b, a };
    }
  }
  
  return null;
}

export function parseHsl(hslString: string): ColorCalculator.HSL | null {
  const hslaRegex = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*([\d.]+))?\s*\)$/i;
  const match = hslaRegex.exec(hslString);
  
  if (match) {
    const h = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const l = parseInt(match[3], 10);
    const a = match[4] ? parseFloat(match[4]) : undefined;
    
    if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      if (a !== undefined && (a < 0 || a > 1)) {
        return null;
      }
      return { h, s, l, a };
    }
  }
  
  return null;
}

export function parseColor(colorString: string): string | null {
  const trimmed = colorString.trim();
  
  if (isValidHex(trimmed)) {
    return trimmed;
  }
  
  const rgb = parseRgb(trimmed);
  if (rgb) {
    return rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a);
  }
  
  const hsl = parseHsl(trimmed);
  if (hsl) {
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l, hsl.a);
    return rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a);
  }
  
  return null;
}

export function parseColorWithDetails(colorString: string): ParseColorResult {
  const trimmed = colorString.trim();
  
  if (!trimmed) {
    return {
      success: false,
      error: "输入为空"
    };
  }
  
  if (isValidHex(trimmed)) {
    return {
      success: true,
      color: trimmed,
      format: "HEX"
    };
  }
  
  const rgb = parseRgb(trimmed);
  if (rgb) {
    return {
      success: true,
      color: rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a),
      format: rgb.a !== undefined ? "RGBA" : "RGB"
    };
  }
  
  const hsl = parseHsl(trimmed);
  if (hsl) {
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l, hsl.a);
    return {
      success: true,
      color: rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a),
      format: hsl.a !== undefined ? "HSLA" : "HSL"
    };
  }
  
  return {
    success: false,
    error: "不支持的颜色格式，请使用 HEX (#RRGGBB)、RGB (rgb(r,g,b)) 或 HSL (hsl(h,s%,l%)) 格式"
  };
}
