
import Big from 'big.js';
import { getUnitById } from '@/modules/unit-converter/data/unitData';

// 单位换算核心逻辑函数
export const convertUnits = (fromValue: number, fromUnitId: string, toUnitId: string): UnitConversion.ConversionResult | null => {
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
      // 基本单位换算（基于换算系数）
      // 使用 Big.js 处理大数精度计算
      const valueBig = new Big(fromValue);
      const fromFactorBig = typeof fromUnit.conversionFactor === 'string' 
        ? new Big(fromUnit.conversionFactor) 
        : new Big(fromUnit.conversionFactor);
      const toFactorBig = typeof toUnit.conversionFactor === 'string' 
        ? new Big(toUnit.conversionFactor) 
        : new Big(toUnit.conversionFactor);
      
      // 计算逻辑：先转换为基准单位，再从基准单位转换为目标单位
      const baseValue = valueBig.times(fromFactorBig);
      const resultBig = baseValue.div(toFactorBig);
      result = resultBig.toNumber();
      
      // 生成换算公式和说明
      const fromFactorDisplay = typeof fromUnit.conversionFactor === 'string' 
        ? fromUnit.conversionFactor 
        : fromUnit.conversionFactor.toString();
      const toFactorDisplay = typeof toUnit.conversionFactor === 'string' 
        ? toUnit.conversionFactor 
        : toUnit.conversionFactor.toString();
      
      formula = `${fromValue} ${fromUnit.symbol} = ${fromValue} × ${fromFactorDisplay} ÷ ${toFactorDisplay} ${toUnit.symbol}`;
      explanation = `1 ${fromUnit.symbol} = ${fromFactorDisplay} ${fromUnitData.category.name === 'data' ? 'bit' : fromUnitData.category.name === 'length' ? 'm' : fromUnitData.category.name === 'weight' ? 'kg' : fromUnitData.category.name === 'area' ? 'm²' : fromUnitData.category.name === 'volume' ? 'm³' : fromUnitData.category.name === 'time' ? 's' : fromUnitData.category.name === 'energy' ? 'J' : '基础单位'}`;
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
const convertTemperature = (value: number, fromUnit: UnitConversion.Unit, toUnit: UnitConversion.Unit): UnitConversion.ConversionResult => {
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
const convertFuelConsumption = (value: number, fromUnit: UnitConversion.Unit, toUnit: UnitConversion.Unit): UnitConversion.ConversionResult => {
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
  const bigNum = new Big(num);
  
  // 判断绝对值大小
  const absValue = bigNum.abs();
  
  // 大数字使用科学计数法（大于等于 1e6）
  if (absValue.gte(new Big('1e6'))) {
    return bigNum.toExponential(6);
  }
  // 极小数字使用科学计数法（小于 1e-6）
  if (absValue.lt(new Big('1e-6')) && absValue.gt(0)) {
    return bigNum.toExponential(6);
  }
  
  // 保留最多6位有效数字
  return bigNum.toPrecision(6).toString();
};

// 获取单位描述信息
export const getUnitDescription = (unit: UnitConversion.Unit): string => {
  return unit.description || `${unit.name} (${unit.symbol})`;
};