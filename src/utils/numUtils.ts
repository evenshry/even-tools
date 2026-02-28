/**
 * 保留指定位数小数, 默认保留2位, 小数尾数0不展示
 * @param value 输入值（数字或可转换为数字的字符串）
 * @param precision 保留小数位数（默认2）
 * @returns 格式化后的数字字符串
 */
export const formatDecimal = (value: number | string, precision: number = 8): string => {
  // 转换为数字类型
  const num = Number(value);

  // 处理非数字和无限值
  if (isNaN(num)) return "NaN";
  if (!isFinite(num)) return num.toString();

  // 处理负零 (-0)
  const processedNum = Object.is(num, -0) ? 0 : num;

  // 精度范围限制 (0-100)
  const adjustedPrecision = Math.max(0, Math.min(10, precision));

  // 使用toFixed获取基础字符串
  let result = processedNum.toFixed(adjustedPrecision);

  // 移除小数部分尾随零
  if (result.includes(".")) {
    result = result.replace(/\.?0+$/, "");
  }

  return result;
};
