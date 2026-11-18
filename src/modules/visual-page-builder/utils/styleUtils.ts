import type { CSSProperties, PageNode } from '../types';

/** 画布容器内边距（与 CanvasArea.scss 中 .canvas-container 的 padding 保持一致） */
export const CANVAS_PADDING = 16;

/**
 * 可在画布、预览、导出之间共享的节点样式属性白名单
 * 三处渲染统一消费该列表，避免各自维护导致视觉不一致
 */
export const NODE_STYLE_KEYS = [
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'left', 'top', 'right', 'bottom',
  'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontFamily',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'border', 'borderRadius', 'boxShadow', 'opacity',
  'gap', 'rowGap', 'columnGap',
  'textAlign', 'lineHeight', 'letterSpacing', 'textDecoration', 'whiteSpace',
  'overflow', 'cursor', 'objectFit', 'zIndex', 'transform', 'transition',
  'verticalAlign', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'justifySelf', 'order',
  'gridColumn', 'gridRow',
] as const;

export type NodeStyleKey = typeof NODE_STYLE_KEYS[number];

/**
 * 将 PageNode 的 style + layout 合并为统一的 CSSProperties
 * - 仅输出白名单内的样式属性
 * - layout 中的布局属性优先级高于 style
 */
export const buildNodeStyle = (node: PageNode): CSSProperties => {
  const { style, layout } = node;
  const result: Record<string, unknown> = {};

  for (const key of NODE_STYLE_KEYS) {
    const value = style[key];
    if (value !== undefined && value !== '') {
      result[key] = value;
    }
  }

  // 布局属性：以 layout 为准（覆盖 style 中的同名值）
  if (layout.display) result.display = layout.display;
  if (layout.position) result.position = layout.position;
  if (layout.flexDirection) result.flexDirection = layout.flexDirection;
  if (layout.flexWrap) result.flexWrap = layout.flexWrap;
  if (layout.justifyContent) result.justifyContent = layout.justifyContent;
  if (layout.alignItems) result.alignItems = layout.alignItems;
  if (layout.alignContent) result.alignContent = layout.alignContent;
  if (layout.gridTemplateColumns) result.gridTemplateColumns = layout.gridTemplateColumns;
  if (layout.gridTemplateRows) result.gridTemplateRows = layout.gridTemplateRows;
  if (layout.gridAutoFlow) result.gridAutoFlow = layout.gridAutoFlow;
  if (layout.gridAutoRows) result.gridAutoRows = layout.gridAutoRows;
  if (layout.gridAutoColumns) result.gridAutoColumns = layout.gridAutoColumns;

  return result as CSSProperties;
};

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
