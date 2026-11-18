
import Big from 'big.js';
import { getUnitById } from '@/modules/unit-converter/data/unitData';

// 查找该类别的基准单位（换算系数为 1 的单位），用于说明文案
const findBaseUnit = (
  category: UnitConversion.UnitCategory,
  fallback: UnitConversion.Unit
): UnitConversion.Unit => {
  for (const group of category.groups) {
    for (const unit of group.units) {
      if (Number(unit.conversionFactor) === 1) {
        return unit;
      }
    }
  }
  return fallback;
};

// 单位换算核心逻辑函数
export const convertUnits = (fromValue: number, fromUnitId: string, toUnitId: string): UnitConversion.ConversionResult | null => {
  // 非有限数（Infinity / NaN）无法参与换算，直接判为无效，避免 big.js 抛错
  if (!Number.isFinite(fromValue)) {
    return null;
  }

  const fromUnitData = getUnitById(fromUnitId);
  const toUnitData = getUnitById(toUnitId);

  // 单位不存在时返回null
  if (!fromUnitData || !toUnitData) {
    return null;
  }

  const { unit: fromUnit } = fromUnitData;
  const { unit: toUnit } = toUnitData;

  // 检查是否属于同一单位类型（如长度、重量等）
  if (fromUnitData.category.id !== toUnitData.category.id) {
    return null;
  }

  let result: number;
  let formula: string;
  let explanation: string;

  // 特殊单位处理（温度单位和油耗单位有特殊的换算逻辑）
  switch (fromUnitData.category.id) {
    case 'temperature':
      return convertTemperature(fromValue, fromUnit, toUnit);
    case 'fuel':
      return convertFuelConsumption(fromValue, fromUnit, toUnit);
    default:
      {
        // 基本单位换算（基于换算系数）
        // 使用 Big.js 处理大数精度计算
        const valueBig = new Big(fromValue);
        const fromFactorBig = new Big(fromUnit.conversionFactor);
        const toFactorBig = new Big(toUnit.conversionFactor);

        // 计算逻辑：先转换为基准单位，再从基准单位转换为目标单位
        const baseValue = valueBig.times(fromFactorBig);
        const resultBig = baseValue.div(toFactorBig);
        result = resultBig.toNumber();

        // 超出 JS 数值范围时视为无效，避免展示 Infinity
        if (!Number.isFinite(result)) {
          return null;
        }

        // 生成换算公式和说明
        const fromFactorDisplay = fromUnit.conversionFactor.toString();
        const toFactorDisplay = toUnit.conversionFactor.toString();
        const baseUnit = findBaseUnit(fromUnitData.category, fromUnit);

        formula = `${fromValue} ${fromUnit.symbol} = ${fromValue} × ${fromFactorDisplay} ÷ ${toFactorDisplay} ${toUnit.symbol}`;
        explanation = `1 ${fromUnit.symbol} = ${fromFactorDisplay} ${baseUnit.symbol}`;
      }
      break;
  }

  return {
    fromValue,
    fromUnit,
    toUnit,
    result,
    formula,
    explanation
  };
};

// 温度单位换算函数（温度单位有特殊的换算公式，不能使用简单的系数换算）
const convertTemperature = (value: number, fromUnit: UnitConversion.Unit, toUnit: UnitConversion.Unit): UnitConversion.ConversionResult | null => {
  let celsius: number;
  let result: number;
  let formula: string;
  let explanation: string;

  // 第一步：先将所有温度转换为摄氏度（作为中间单位）
  switch (fromUnit.id) {
    case 'celsius':
      celsius = value;
      break;
    case 'fahrenheit':
      celsius = (value - 32) * 5 / 9;
      break;
    case 'kelvin':
      celsius = value - 273.15;
      break;
    case 'rankine':
      celsius = (value - 491.67) * 5 / 9;
      break;
    default:
      celsius = value;
  }

  // 第二步：从摄氏度转换为目标单位
  switch (toUnit.id) {
    case 'celsius':
      result = celsius;
      break;
    case 'fahrenheit':
      result = celsius * 9 / 5 + 32;
      break;
    case 'kelvin':
      result = celsius + 273.15;
      break;
    case 'rankine':
      result = (celsius + 273.15) * 9 / 5;
      break;
    default:
      result = celsius;
  }

  // 极端数值可能溢出为 Infinity，此时视为无效换算
  if (!Number.isFinite(celsius) || !Number.isFinite(result)) {
    return null;
  }

  // 生成换算公式和解释（根据不同的转换组合生成对应的公式）
  if (fromUnit.id === 'celsius' && toUnit.id === 'fahrenheit') {
    formula = `${value} °C = (${value} × 9/5) + 32 °F`;
    explanation = '摄氏度转华氏度：°F = °C × 9/5 + 32';
  } else if (fromUnit.id === 'fahrenheit' && toUnit.id === 'celsius') {
    formula = `${value} °F = (${value} - 32) × 5/9 °C`;
    explanation = '华氏度转摄氏度：°C = (°F - 32) × 5/9';
  } else if (fromUnit.id === 'celsius' && toUnit.id === 'kelvin') {
    formula = `${value} °C = ${value} + 273.15 K`;
    explanation = '摄氏度转开尔文：K = °C + 273.15';
  } else if (fromUnit.id === 'kelvin' && toUnit.id === 'celsius') {
    formula = `${value} K = ${value} - 273.15 °C`;
    explanation = '开尔文转摄氏度：°C = K - 273.15';
  } else if (fromUnit.id === 'fahrenheit' && toUnit.id === 'kelvin') {
    formula = `${value} °F = ((${value} - 32) × 5/9) + 273.15 K`;
    explanation = '华氏度转开尔文：K = (°F - 32) × 5/9 + 273.15';
  } else if (fromUnit.id === 'kelvin' && toUnit.id === 'fahrenheit') {
    formula = `${value} K = ((${value} - 273.15) × 9/5) + 32 °F`;
    explanation = '开尔文转华氏度：°F = (K - 273.15) × 9/5 + 32';
  } else if (fromUnit.id === 'celsius' && toUnit.id === 'rankine') {
    formula = `${value} °C = (${value} + 273.15) × 9/5 °R`;
    explanation = '摄氏度转兰氏度：°R = (°C + 273.15) × 9/5';
  } else if (fromUnit.id === 'rankine' && toUnit.id === 'celsius') {
    formula = `${value} °R = (${value} - 491.67) × 5/9 °C`;
    explanation = '兰氏度转摄氏度：°C = (°R - 491.67) × 5/9';
  } else if (fromUnit.id === 'fahrenheit' && toUnit.id === 'rankine') {
    formula = `${value} °F = ${value} + 459.67 °R`;
    explanation = '华氏度转兰氏度：°R = °F + 459.67';
  } else if (fromUnit.id === 'rankine' && toUnit.id === 'fahrenheit') {
    formula = `${value} °R = ${value} - 459.67 °F`;
    explanation = '兰氏度转华氏度：°F = °R - 459.67';
  } else if (fromUnit.id === 'kelvin' && toUnit.id === 'rankine') {
    formula = `${value} K = ${value} × 9/5 °R`;
    explanation = '开尔文转兰氏度：°R = K × 9/5';
  } else if (fromUnit.id === 'rankine' && toUnit.id === 'kelvin') {
    formula = `${value} °R = ${value} × 5/9 K`;
    explanation = '兰氏度转开尔文：K = °R × 5/9';
  } else {
    formula = `${value} ${fromUnit.symbol} = ${result} ${toUnit.symbol}`;
    explanation = '相同温度单位转换';
  }

  return {
    fromValue: value,
    fromUnit,
    toUnit,
    result,
    formula,
    explanation
  };
};

// 油耗单位换算函数（油耗单位有特殊的换算公式，不能使用简单的系数换算）
const convertFuelConsumption = (value: number, fromUnit: UnitConversion.Unit, toUnit: UnitConversion.Unit): UnitConversion.ConversionResult | null => {
  // 油耗必须为正数：0 或负数会得到 Infinity/负值，没有实际意义
  if (!(value > 0)) {
    return null;
  }

  let result: number;
  let formula: string;
  let explanation: string;

  // 生成换算公式和解释（根据不同的转换组合生成对应的公式）
  if (fromUnit.id === 'l-100km' && toUnit.id === 'km-l') {
    result = 100 / value;
    formula = `${value} L/100km = 100 ÷ ${value} km/L`;
    explanation = '升每百公里转公里每升：km/L = 100 ÷ (L/100km)';
  } else if (fromUnit.id === 'km-l' && toUnit.id === 'l-100km') {
    result = 100 / value;
    formula = `${value} km/L = 100 ÷ ${value} L/100km`;
    explanation = '公里每升转升每百公里：L/100km = 100 ÷ (km/L)';
  } else if (fromUnit.id === 'l-100km' && toUnit.id === 'mpg-us') {
    result = 235.215 / value;
    formula = `${value} L/100km = 235.215 ÷ ${value} mpg`;
    explanation = '升每百公里转英里每加仑(美制)：mpg = 235.215 ÷ (L/100km)';
  } else if (fromUnit.id === 'mpg-us' && toUnit.id === 'l-100km') {
    result = 235.215 / value;
    formula = `${value} mpg = 235.215 ÷ ${value} L/100km`;
    explanation = '英里每加仑(美制)转升每百公里：L/100km = 235.215 ÷ mpg';
  } else if (fromUnit.id === 'l-100km' && toUnit.id === 'mpg-uk') {
    result = 282.481 / value;
    formula = `${value} L/100km = 282.481 ÷ ${value} mpg`;
    explanation = '升每百公里转英里每加仑(英制)：mpg = 282.481 ÷ (L/100km)';
  } else if (fromUnit.id === 'mpg-uk' && toUnit.id === 'l-100km') {
    result = 282.481 / value;
    formula = `${value} mpg = 282.481 ÷ ${value} L/100km`;
    explanation = '英里每加仑(英制)转升每百公里：L/100km = 282.481 ÷ mpg';
  } else if (fromUnit.id === 'km-l' && toUnit.id === 'mpg-us') {
    result = value * 2.35215;
    formula = `${value} km/L = ${value} × 2.35215 mpg`;
    explanation = '公里每升转英里每加仑(美制)：mpg = km/L × 2.35215';
  } else if (fromUnit.id === 'mpg-us' && toUnit.id === 'km-l') {
    result = value / 2.35215;
    formula = `${value} mpg = ${value} ÷ 2.35215 km/L`;
    explanation = '英里每加仑(美制)转公里每升：km/L = mpg ÷ 2.35215';
  } else if (fromUnit.id === 'km-l' && toUnit.id === 'mpg-uk') {
    result = value * 2.82481;
    formula = `${value} km/L = ${value} × 2.82481 mpg`;
    explanation = '公里每升转英里每加仑(英制)：mpg = km/L × 2.82481';
  } else if (fromUnit.id === 'mpg-uk' && toUnit.id === 'km-l') {
    result = value / 2.82481;
    formula = `${value} mpg = ${value} ÷ 2.82481 km/L`;
    explanation = '英里每加仑(英制)转公里每升：km/L = mpg ÷ 2.82481';
  } else if (fromUnit.id === 'mpg-us' && toUnit.id === 'mpg-uk') {
    result = value * 1.20095;
    formula = `${value} mpg(美制) = ${value} × 1.20095 mpg(英制)`;
    explanation = '英里每加仑(美制)转英里每加仑(英制)：mpg(英制) = mpg(美制) × 1.20095';
  } else if (fromUnit.id === 'mpg-uk' && toUnit.id === 'mpg-us') {
    result = value / 1.20095;
    formula = `${value} mpg(英制) = ${value} ÷ 1.20095 mpg(美制)`;
    explanation = '英里每加仑(英制)转英里每加仑(美制)：mpg(美制) = mpg(英制) ÷ 1.20095';
  } else {
    result = value;
    formula = `${value} ${fromUnit.symbol} = ${result} ${toUnit.symbol}`;
    explanation = '相同油耗单位转换';
  }

  if (!Number.isFinite(result)) {
    return null;
  }

  return {
    fromValue: value,
    fromUnit,
    toUnit,
    result,
    formula,
    explanation
  };
};

// 格式化数字，保留合适的小数位数（用于显示换算结果）
export const formatNumber = (num: number): string => {
  if (!Number.isFinite(num)) {
    return "-";
  }
  if (num === 0) {
    return "0";
  }

  const absValue = Math.abs(num);

  // 极大或极小的数字使用科学计数法，避免被截断成 0 或一长串 0
  if (absValue >= 1e9 || absValue < 1e-6) {
    return num.toExponential(6).replace(/\.?0+e/, "e");
  }

  // 按数量级保留 8 位有效数字，并去掉尾随零
  const decimals = Math.max(1, Math.min(12, 8 - Math.floor(Math.log10(absValue)) - 1));
  return Number(num.toFixed(decimals)).toString();
};

// 获取单位描述信息
export const getUnitDescription = (unit: UnitConversion.Unit): string => {
  return unit.description || `${unit.name} (${unit.symbol})`;
};