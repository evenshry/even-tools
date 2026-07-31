/**
 * 解析像素值（支持 "100px" / 100 / undefined / null / "" → number）
 *
 * 宽松模式：对非数字字符串（如 "50%"、"auto"）返回 0
 * 用于拖拽/缩放/方向键微调等场景，需要从 CSS 值取出数值参与运算
 */
export const parsePx = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : 0;
};

/**
 * 严格解析像素值：仅接受纯数字或 "Npx" 格式
 * 返回 null 表示非像素单位（如 %、auto、em）
 *
 * 用于 alignSelected 等需要精确像素值的场景：
 * - 百分比/auto 宽度的节点不参与对齐计算，避免错误
 */
export const parsePxStrict = (value: string | number | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  // 接受纯数字或以 px 结尾
  if (/^-?\d+(\.\d+)?$/.test(str) || /^-?\d+(\.\d+)?px$/.test(str)) {
    const num = parseFloat(str);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};
