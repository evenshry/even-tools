export namespace ColorCalculator {
  export interface RGB {
    r: number;
    g: number;
    b: number;
    a?: number;
  }

  export interface HSL {
    h: number;
    s: number;
    l: number;
    a?: number;
  }

  export interface ContrastResult {
    ratio: number;
    levelAA: boolean;
    levelAAA: boolean;
    levelAALarge: boolean;
    levelAAALarge: boolean;
  }

  export interface ColorBlindnessType {
    id: string;
    name: string;
    description: string;
  }

  export interface ColorStop {
    id: string;
    color: string;
    position: number;
  }

  export type GradientType = "linear" | "radial" | "conic";

  export interface GradientPreset {
    name: string;
    type: GradientType;
    angle: number;
    colorStops: ColorStop[];
  }
}
