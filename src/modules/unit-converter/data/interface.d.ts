// 单位换算类型定义 - 使用namespace集中管理
declare namespace UnitConversion {
  interface Unit {
    id: string;
    name: string;
    symbol: string;
    description?: string;
    conversionFactor: number | string; // 相对于基础单位的换算系数，支持字符串以处理大数精度
    formula?: string; // 换算公式
    type?: 'modern' | 'ancient'; // 现代单位或古代单位
  }

  interface UnitGroup {
    id: string;
    name: string;
    description?: string;
    units: Unit[];
  }

  interface UnitCategory {
    id: string;
    name: string;
    description?: string;
    groups: UnitGroup[];
  }

  interface ConversionResult {
    fromValue: number;
    fromUnit: Unit;
    toUnit: Unit;
    result: number;
    formula: string;
    explanation: string;
  }
}