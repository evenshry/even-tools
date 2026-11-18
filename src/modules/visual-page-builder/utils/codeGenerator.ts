import type { PageNode, NodeType } from '../types';
import { NodeType as NodeTypeEnum } from '../types';
import { NODE_STYLE_KEYS } from './styleUtils';
import { validateNodeGraph } from './nodeValidation';

/**
 * HTML 转义：防止 XSS，转义 & < > " '
 */
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * JSX 字符串字面量转义：转义反斜杠、引号、换行等，防止破坏 JSX 语法
 */
const escapeJsxString = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/'/g, "\\'");
};

/**
 * 判断值是否为有效非空（兼容 0 / '0' 等假值场景）
 */
const hasValue = (value: unknown): boolean => {
  return value !== undefined && value !== null && value !== '';
};

/**
 * 将 PageNode.style + layout 合并为单个 CSSProperties 对象
 * 与画布/预览共用 NODE_STYLE_KEYS 白名单，保证导出视觉一致
 */
const mergeStyleAndLayout = (node: PageNode): Record<string, string | number> => {
  const { style, layout } = node;
  const merged: Record<string, string | number> = {};

  for (const key of NODE_STYLE_KEYS) {
    const value = style[key];
    if (hasValue(value)) {
      merged[key] = typeof value === 'number' ? value : String(value);
    }
  }

  // 布局属性：以 layout 为准（覆盖 style 中的同名值）
  if (layout.display) merged.display = layout.display;
  if (layout.position) merged.position = layout.position;
  if (layout.flexDirection) merged.flexDirection = layout.flexDirection;
  if (layout.flexWrap) merged.flexWrap = layout.flexWrap;
  if (layout.justifyContent) merged.justifyContent = layout.justifyContent;
  if (layout.alignItems) merged.alignItems = layout.alignItems;
  if (layout.alignContent) merged.alignContent = layout.alignContent;
  if (layout.gridTemplateColumns) merged.gridTemplateColumns = layout.gridTemplateColumns;
  if (layout.gridTemplateRows) merged.gridTemplateRows = layout.gridTemplateRows;
  if (layout.gridAutoFlow) merged.gridAutoFlow = layout.gridAutoFlow;
  if (layout.gridAutoRows) merged.gridAutoRows = layout.gridAutoRows;
  if (layout.gridAutoColumns) merged.gridAutoColumns = layout.gridAutoColumns;

  return merged;
};

/** HTML 标签映射（显式覆盖所有 NodeType，避免 default fallback 隐藏语义错误） */
const getHtmlTag = (type: NodeType): string => {
  switch (type) {
    case NodeTypeEnum.SECTION: return 'section';
    case NodeTypeEnum.HEADING: return 'h2';
    case NodeTypeEnum.BUTTON: return 'button';
    case NodeTypeEnum.IMAGE: return 'img';
    case NodeTypeEnum.INPUT: return 'input';
    case NodeTypeEnum.FORM: return 'form';
    case NodeTypeEnum.SPAN: return 'span';
    case NodeTypeEnum.TEXT: return 'div';
    case NodeTypeEnum.SELECT: return 'select';
    case NodeTypeEnum.CHECKBOX: return 'input';
    case NodeTypeEnum.VIDEO: return 'video';
    case NodeTypeEnum.ICON: return 'i';
    // 容器类节点统一用 div，布局差异通过 style.display 表达
    case NodeTypeEnum.PAGE:
    case NodeTypeEnum.CONTAINER:
    case NodeTypeEnum.GRID:
    case NodeTypeEnum.FLEX:
    case NodeTypeEnum.STACK:
    case NodeTypeEnum.DIV:
    case NodeTypeEnum.CUSTOM:
      return 'div';
    default:
      // 兜底：未知类型用 div，避免崩溃
      return 'div';
  }
};

/** 缩进工具 */
const indent = (depth: number): string => '  '.repeat(depth);

/**
 * 生成内联 HTML 字符串
 * - 所有 style 内联到 style 属性
 * - 容器节点递归渲染子节点
 */
export const generateHTML = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const renderNode = (node: PageNode, depth: number): string => {
    const tag = getHtmlTag(node.type);
    const style = mergeStyleAndLayout(node);
    const styleStr = Object.entries(style)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`)
      .join('; ');
    // style 内容可能来自用户输入，写入属性前统一转义
    const safeStyle = escapeHtml(styleStr);

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    // 自闭合标签
    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeHtml(node.content.src || '');
      const alt = escapeHtml(node.name);
      return `${indent(depth)}<img src="${src}" alt="${alt}" style="${safeStyle}" />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeHtml(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder="${placeholder}" style="${safeStyle}" />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeHtml(node.content.text || '');
      return `${indent(depth)}<label style="${safeStyle}"><input type="checkbox" />${label}</label>`;
    }
    if (node.type === NodeTypeEnum.SELECT) {
      const option = escapeHtml(node.content.text || '请选择');
      return `${indent(depth)}<select style="${safeStyle}"><option>${option}</option></select>`;
    }
    if (node.type === NodeTypeEnum.VIDEO) {
      const src = escapeHtml(node.content.src || '');
      return `${indent(depth)}<video src="${src}" style="${safeStyle}" controls></video>`;
    }

    // 文本内容（转义防止 XSS）
    const textContent = escapeHtml(node.content.text || '');

    if (children.length === 0 && textContent) {
      return `${indent(depth)}<${tag} style="${safeStyle}">${textContent}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} style="${safeStyle}"></${tag}>`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} style="${safeStyle}">\n${inner}\n${indent(depth)}</${tag}>`;
  };

  const body = rootNodes.map((n) => renderNode(n, 1)).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>导出页面</title>
</head>
<body>
${body}
</body>
</html>`;
};

/**
 * 生成 React JSX 代码
 * - style 提取为对象写法
 * - className 使用 node.name 的 kebab-case
 */
export const generateReact = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const renderNode = (node: PageNode, depth: number): string => {
    const tag = getHtmlTag(node.type);
    const style = mergeStyleAndLayout(node);
    const styleStr = '{' + Object.entries(style)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${escapeJsxString(v)}'` : v}`)
      .join(', ') + '}';

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeJsxString(node.content.src || '');
      const alt = escapeJsxString(node.name);
      return `${indent(depth)}<img src={'${src}'} alt={'${alt}'} style={${styleStr}} />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder={'${placeholder}'} style={${styleStr}} />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<label style={${styleStr}}><input type="checkbox" />${label}</label>`;
    }
    if (node.type === NodeTypeEnum.SELECT) {
      const option = escapeJsxString(node.content.text || '请选择');
      return `${indent(depth)}<select style={${styleStr}}><option>{'${option}'}</option></select>`;
    }
    if (node.type === NodeTypeEnum.VIDEO) {
      const src = escapeJsxString(node.content.src || '');
      return `${indent(depth)}<video src={'${src}'} style={${styleStr}} controls />`;
    }

    const textContent = node.content.text || '';

    if (children.length === 0 && textContent) {
      // 文本节点用 {'...'} 包裹，防止 < > 破坏 JSX
      return `${indent(depth)}<${tag} style={${styleStr}}>{'${escapeJsxString(textContent)}'}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} style={${styleStr}} />`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} style={${styleStr}}>\n${inner}\n${indent(depth)}</${tag}>`;
  };

  const body = rootNodes.map((n) => renderNode(n, 2)).join('\n');
  return `import React from 'react';

const ExportedPage: React.FC = () => {
  return (
    <>
${body}
    </>
  );
};

export default ExportedPage;
`;
};

/**
 * 将 CSS 属性对象转换为 Tailwind class 字符串
 * - 常见属性精确映射（flex, gap, justify-center 等）
 * - 带单位或非常规值使用 Tailwind arbitrary value 语法，如 w-[100px], gap-[10px]
 * - 无法映射的属性收集到 remainingStyle 返回，调用方按需保留为 inline style
 */
interface TailwindResult {
  /** Tailwind class 字符串（去重、空格分隔） */
  classes: string;
  /** 无法映射为 Tailwind class 的属性（key 已转为 camelCase） */
  remainingStyle: Record<string, string | number>;
}

/** 像素值提取（纯数字 + px 或纯数字） */
const toPx = (v: string | number): string | null => {
  if (typeof v === 'number') return v === 0 ? '0' : `${v}px`;
  const m = v.match(/^(-?\d*\.?\d+)(px)?$/);
  if (!m) return null;
  return m[1] === '0' ? '0' : `${m[1]}px`;
};

/** 颜色值 → Tailwind 支持任意值如 bg-[#f0f0f0]，统一走 arbitrary 更稳定 */
const toArbitrary = (v: string | number): string => {
  const s = typeof v === 'number' ? v.toString() : v;
  // 处理带空格的值如 "0 2px 8px rgba(0,0,0,0.15)" → bracket 内需要下划线替代空格
  return `[${s.replace(/ /g, '_')}]`;
};

/**
 * 核心映射函数
 * 输入：mergeStyleAndLayout 合并后的 style 对象
 * 输出：Tailwind class 数组 + 未映射的剩余 style
 */
const styleToTailwind = (style: Record<string, string | number>): TailwindResult => {
  const classes: string[] = [];
  const remaining: Record<string, string | number> = {};

  const consume = (key: string): string | number | undefined => {
    const v = style[key];
    if (v !== undefined && v !== null && v !== '') delete style[key];
    return v;
  };

  // ===== 布局 =====
  const display = consume('display');
  if (display === 'flex') classes.push('flex');
  else if (display === 'grid') classes.push('grid');
  else if (display === 'inline') classes.push('inline');
  else if (display === 'inline-block') classes.push('inline-block');
  else if (display === 'block') classes.push('block');
  else if (display === 'none') classes.push('hidden');

  const position = consume('position');
  if (position === 'absolute') classes.push('absolute');
  else if (position === 'relative') classes.push('relative');
  else if (position === 'fixed') classes.push('fixed');
  else if (position === 'sticky') classes.push('sticky');

  // ===== Flex =====
  const flexDir = consume('flexDirection');
  if (flexDir === 'row') classes.push('flex-row');
  else if (flexDir === 'column') classes.push('flex-col');
  else if (flexDir === 'row-reverse') classes.push('flex-row-reverse');
  else if (flexDir === 'column-reverse') classes.push('flex-col-reverse');

  const flexWrap = consume('flexWrap');
  if (flexWrap === 'wrap') classes.push('flex-wrap');
  else if (flexWrap === 'nowrap') classes.push('flex-nowrap');
  else if (flexWrap === 'wrap-reverse') classes.push('flex-wrap-reverse');

  const justify = consume('justifyContent');
  if (justify === 'flex-start') classes.push('justify-start');
  else if (justify === 'flex-end') classes.push('justify-end');
  else if (justify === 'center') classes.push('justify-center');
  else if (justify === 'space-between') classes.push('justify-between');
  else if (justify === 'space-around') classes.push('justify-around');
  else if (justify === 'space-evenly') classes.push('justify-evenly');

  const items = consume('alignItems');
  if (items === 'stretch') classes.push('items-stretch');
  else if (items === 'flex-start') classes.push('items-start');
  else if (items === 'flex-end') classes.push('items-end');
  else if (items === 'center') classes.push('items-center');
  else if (items === 'baseline') classes.push('items-baseline');

  const alignContent = consume('alignContent');
  if (alignContent === 'center') classes.push('content-center');
  else if (alignContent === 'flex-start') classes.push('content-start');
  else if (alignContent === 'flex-end') classes.push('content-end');
  else if (alignContent === 'space-between') classes.push('content-between');
  else if (alignContent === 'space-around') classes.push('content-around');

  const alignSelf = consume('alignSelf');
  if (alignSelf === 'auto') classes.push('self-auto');
  else if (alignSelf === 'stretch') classes.push('self-stretch');
  else if (alignSelf === 'center') classes.push('self-center');
  else if (alignSelf === 'flex-start') classes.push('self-start');
  else if (alignSelf === 'flex-end') classes.push('self-end');

  const flexGrow = consume('flexGrow');
  if (flexGrow === 1) classes.push('flex-grow');
  else if (typeof flexGrow === 'number' && flexGrow > 0) classes.push(`grow-${flexGrow}`);

  const flexShrink = consume('flexShrink');
  if (flexShrink === 0) classes.push('shrink-0');

  const order = consume('order');
  if (typeof order === 'number' && order !== 0) classes.push(`order-${order}`);

  // ===== Gap =====
  const gap = consume('gap');
  if (gap !== undefined) {
    const px = toPx(gap);
    classes.push(px === '0' ? 'gap-0' : `gap-${px ? px.replace('px', '') : toArbitrary(gap)}`);
  }
  const rowGap = consume('rowGap');
  if (rowGap !== undefined) {
    const px = toPx(rowGap);
    classes.push(px === '0' ? 'gap-y-0' : `gap-y-${px ? px.replace('px', '') : toArbitrary(rowGap)}`);
  }
  const colGap = consume('columnGap');
  if (colGap !== undefined) {
    const px = toPx(colGap);
    classes.push(px === '0' ? 'gap-x-0' : `gap-x-${px ? px.replace('px', '') : toArbitrary(colGap)}`);
  }

  // ===== Grid =====
  const gridCols = consume('gridTemplateColumns');
  if (gridCols !== undefined) classes.push(`grid-cols-${toArbitrary(gridCols)}`);
  const gridRows = consume('gridTemplateRows');
  if (gridRows !== undefined) classes.push(`grid-rows-${toArbitrary(gridRows)}`);
  const gridFlow = consume('gridAutoFlow');
  if (gridFlow !== undefined) classes.push(`grid-flow-${toArbitrary(gridFlow)}`);
  const gridAutoRows = consume('gridAutoRows');
  if (gridAutoRows !== undefined) classes.push(`auto-rows-${toArbitrary(gridAutoRows)}`);
  const gridAutoCols = consume('gridAutoColumns');
  if (gridAutoCols !== undefined) classes.push(`auto-cols-${toArbitrary(gridAutoCols)}`);
  const gridColumn = consume('gridColumn');
  if (gridColumn !== undefined) classes.push(`col-${toArbitrary(gridColumn)}`);
  const gridRow = consume('gridRow');
  if (gridRow !== undefined) classes.push(`row-${toArbitrary(gridRow)}`);

  // ===== 尺寸 =====
  const width = consume('width');
  if (width !== undefined) {
    const px = toPx(width);
    classes.push(px === '0' ? 'w-0' : `w-${px ? px.replace('px', '') : toArbitrary(width)}`);
  }
  const height = consume('height');
  if (height !== undefined) {
    const px = toPx(height);
    classes.push(px === '0' ? 'h-0' : `h-${px ? px.replace('px', '') : toArbitrary(height)}`);
  }
  const minW = consume('minWidth');
  if (minW !== undefined) classes.push(`min-w-${toArbitrary(minW)}`);
  const maxW = consume('maxWidth');
  if (maxW !== undefined) classes.push(`max-w-${toArbitrary(maxW)}`);
  const minH = consume('minHeight');
  if (minH !== undefined) classes.push(`min-h-${toArbitrary(minH)}`);
  const maxH = consume('maxHeight');
  if (maxH !== undefined) classes.push(`max-h-${toArbitrary(maxH)}`);

  // ===== 间距 =====
  const padding = consume('padding');
  if (padding !== undefined) {
    const px = toPx(padding);
    classes.push(px === '0' ? 'p-0' : `p-${px ? px.replace('px', '') : toArbitrary(padding)}`);
  }
  const paddingTop = consume('paddingTop');
  if (paddingTop !== undefined) classes.push(`pt-${toArbitrary(paddingTop)}`);
  const paddingBottom = consume('paddingBottom');
  if (paddingBottom !== undefined) classes.push(`pb-${toArbitrary(paddingBottom)}`);
  const paddingLeft = consume('paddingLeft');
  if (paddingLeft !== undefined) classes.push(`pl-${toArbitrary(paddingLeft)}`);
  const paddingRight = consume('paddingRight');
  if (paddingRight !== undefined) classes.push(`pr-${toArbitrary(paddingRight)}`);

  const margin = consume('margin');
  if (margin !== undefined) {
    const px = toPx(margin);
    classes.push(px === '0' ? 'm-0' : `m-${px ? px.replace('px', '') : toArbitrary(margin)}`);
  }
  const marginTop = consume('marginTop');
  if (marginTop !== undefined) classes.push(`mt-${toArbitrary(marginTop)}`);
  const marginBottom = consume('marginBottom');
  if (marginBottom !== undefined) classes.push(`mb-${toArbitrary(marginBottom)}`);
  const marginLeft = consume('marginLeft');
  if (marginLeft !== undefined) classes.push(`ml-${toArbitrary(marginLeft)}`);
  const marginRight = consume('marginRight');
  if (marginRight !== undefined) classes.push(`mr-${toArbitrary(marginRight)}`);

  // ===== 颜色与外观 =====
  const bg = consume('backgroundColor');
  if (bg !== undefined) classes.push(`bg-${toArbitrary(bg)}`);
  const color = consume('color');
  if (color !== undefined) classes.push(`text-${toArbitrary(color)}`);
  const borderRadius = consume('borderRadius');
  if (borderRadius !== undefined) {
    const px = toPx(borderRadius);
    classes.push(px === '0' ? 'rounded-none' : `rounded-${px ? px.replace('px', '') : toArbitrary(borderRadius)}`);
  }
  const opacity = consume('opacity');
  if (opacity !== undefined) classes.push(`opacity-${Math.round(Number(opacity) * 100)}`);
  const zIndex = consume('zIndex');
  if (zIndex !== undefined) classes.push(`z-${zIndex}`);
  const overflow = consume('overflow');
  if (overflow === 'hidden') classes.push('overflow-hidden');
  else if (overflow === 'auto') classes.push('overflow-auto');
  else if (overflow === 'scroll') classes.push('overflow-scroll');

  // ===== 文字 =====
  const fontSize = consume('fontSize');
  if (fontSize !== undefined) classes.push(`text-${toArbitrary(fontSize)}`);
  const fontWeight = consume('fontWeight');
  if (fontWeight !== undefined) {
    const num = Number(fontWeight);
    if (!Number.isNaN(num)) classes.push(`font-${num}`);
    else if (fontWeight === 'bold') classes.push('font-bold');
    else if (fontWeight === 'normal') classes.push('font-normal');
  }
  const lineHeight = consume('lineHeight');
  if (lineHeight !== undefined) classes.push(`leading-${toArbitrary(lineHeight)}`);
  const textAlign = consume('textAlign');
  if (textAlign === 'left') classes.push('text-left');
  else if (textAlign === 'center') classes.push('text-center');
  else if (textAlign === 'right') classes.push('text-right');
  else if (textAlign === 'justify') classes.push('text-justify');
  const textDeco = consume('textDecoration');
  if (textDeco === 'underline') classes.push('underline');
  else if (textDeco === 'line-through') classes.push('line-through');
  else if (textDeco === 'none') classes.push('no-underline');
  const letterSpacing = consume('letterSpacing');
  if (letterSpacing !== undefined && letterSpacing !== '0') classes.push(`tracking-${toArbitrary(letterSpacing)}`);
  const whiteSpace = consume('whiteSpace');
  if (whiteSpace === 'nowrap') classes.push('whitespace-nowrap');
  else if (whiteSpace === 'pre-wrap') classes.push('whitespace-pre-wrap');

  // ===== 定位偏移 =====
  const left = consume('left');
  if (left !== undefined) classes.push(`left-${toArbitrary(left)}`);
  const top = consume('top');
  if (top !== undefined) classes.push(`top-${toArbitrary(top)}`);
  const right = consume('right');
  if (right !== undefined) classes.push(`right-${toArbitrary(right)}`);
  const bottom = consume('bottom');
  if (bottom !== undefined) classes.push(`bottom-${toArbitrary(bottom)}`);

  // 剩余属性收集
  for (const [k, v] of Object.entries(style)) {
    if (v !== undefined && v !== null && v !== '') {
      const camelK = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      remaining[camelK] = typeof v === 'number' ? v : String(v);
    }
  }

  return {
    classes: Array.from(new Set(classes)).join(' '),
    remainingStyle: remaining,
  };
};

/**
 * 生成 Tailwind + React JSX 混合代码
 * - className 使用 Tailwind class（覆盖 ~80% 常见场景）
 * - 无法映射的属性保留为 style={{}} 内联样式
 * - 附带 Tailwind CSS CDN 提示（import "tailwindcss" 需项目已配置）
 */
export const generateTailwind = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const renderNode = (node: PageNode, depth: number): string => {
    const tag = getHtmlTag(node.type);
    const merged = mergeStyleAndLayout(node);
    const { classes, remainingStyle } = styleToTailwind({ ...merged });

    const classNameLine = classes ? `className="${classes}"` : '';
    const styleLine = Object.keys(remainingStyle).length > 0
      ? `style={${Object.entries(remainingStyle)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${escapeJsxString(v)}'` : v}`)
          .join(', ')}}`
      : '';
    const props = [classNameLine, styleLine].filter(Boolean).join(' ');

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeJsxString(node.content.src || '');
      const alt = escapeJsxString(node.name);
      return `${indent(depth)}<img src={'${src}'} alt={'${alt}'} ${props} />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder={'${placeholder}'} ${props} />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<label ${props}><input type="checkbox" />${label}</label>`;
    }
    if (node.type === NodeTypeEnum.SELECT) {
      const option = escapeJsxString(node.content.text || '请选择');
      return `${indent(depth)}<select ${props}><option>{'${option}'}</option></select>`;
    }
    if (node.type === NodeTypeEnum.VIDEO) {
      const src = escapeJsxString(node.content.src || '');
      return `${indent(depth)}<video src={'${src}'} ${props} controls />`;
    }

    const textContent = node.content.text || '';

    if (children.length === 0 && textContent) {
      return `${indent(depth)}<${tag} ${props}>{'${escapeJsxString(textContent)}'}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} ${props} />`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} ${props}>\n${inner}\n${indent(depth)}</${tag}>`;
  };

  const body = rootNodes.map((n) => renderNode(n, 2)).join('\n');
  return `// 注意：需要项目已集成 Tailwind CSS（v3+），import "tailwindcss"
// 无法完全映射的样式会保留为 inline style
import React from 'react';

const ExportedPage: React.FC = () => {
  return (
    <>
${body}
    </>
  );
};

export default ExportedPage;
`;
};

/**
 * 将任意值转换为有效的 Date，无效时回退到 epoch（1970-01-01）
 * 用于序列化/反序列化时防御性处理 meta.createdAt/updatedAt
 */
const toValidDate = (v: unknown): Date => {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? new Date(0) : v;
  }
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};

/**
 * 序列化节点：将 Date 对象转为 ISO 字符串，确保 JSON.stringify 稳定
 * 返回类型放宽为 Record<string, unknown>，因为 meta 中的 Date 被转为 string
 */
const serializeNodesForSchema = (nodes: Record<string, PageNode>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [id, node] of Object.entries(nodes)) {
    result[id] = {
      ...node,
      meta: {
        ...node.meta,
        createdAt: toValidDate(node.meta.createdAt).toISOString(),
        updatedAt: toValidDate(node.meta.updatedAt).toISOString(),
      }
    };
  }
  return result;
};

/**
 * 生成 JSON Schema（可被 loadNodes 反向加载）
 */
export const generateSchema = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const schema = {
    version: '1.0',
    type: 'visual-page-builder-schema',
    exportedAt: new Date().toISOString(),
    rootIds: rootNodes.map((n) => n.id),
    nodes: serializeNodesForSchema(nodes),
  };

  return JSON.stringify(schema, null, 2);
};

/** 下载文本文件 */
export const downloadTextFile = (filename: string, content: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Schema JSON 解析结果
 * - ok=false 时 error 描述失败原因
 * - ok=true 时 nodes 为可加载的节点映射
 */
export interface SchemaParseResult {
  ok: boolean;
  nodes?: Record<string, PageNode>;
  error?: string;
}

/**
 * 反向解析 generateSchema 输出的 JSON 字符串为可加载的 PageNode 映射
 *
 * 校验：
 * - 顶层必须是对象，且 type === 'visual-page-builder-schema'
 * - nodes 必须是非空对象
 * - 每个 node.meta.createdAt/updatedAt 必须能被 Date 解析
 *
 * 转换：将 meta.createdAt/updatedAt 从 ISO 字符串还原为 Date 对象
 * 严格模式：遇到任何结构异常都返回 { ok: false, error } 而不抛出
 */
export const parseSchema = (raw: string): SchemaParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${e instanceof Error ? e.message : String(e)}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Schema 必须是 JSON 对象' };
  }

  const schema = parsed as { type?: unknown; nodes?: unknown; rootIds?: unknown };
  if (schema.type !== 'visual-page-builder-schema') {
    return { ok: false, error: '缺少 type=visual-page-builder-schema 标识，可能不是可视化构建器导出的 schema' };
  }

  if (!schema.nodes || typeof schema.nodes !== 'object' || Array.isArray(schema.nodes)) {
    return { ok: false, error: 'nodes 字段缺失或不是对象' };
  }

  const sourceNodes = schema.nodes as Record<string, unknown>;

  // 结构安全校验：类型白名单、id 一致性、children 引用、循环引用、危险键
  const validation = validateNodeGraph(sourceNodes);
  if (!validation.ok) {
    return { ok: false, error: validation.error || '节点结构无效' };
  }

  const result: Record<string, PageNode> = Object.create(null);

  for (const [id, rawNode] of Object.entries(sourceNodes)) {
    if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
      return { ok: false, error: `节点 ${id} 不是有效对象` };
    }
    const node = rawNode as Record<string, unknown>;
    const meta = node.meta as { createdAt?: unknown; updatedAt?: unknown } | undefined;
    if (!meta) {
      return { ok: false, error: `节点 ${id} 缺少 meta 字段` };
    }

    const createdAtRaw = meta.createdAt;
    const updatedAtRaw = meta.updatedAt;
    const createdAt = toValidDate(createdAtRaw);
    const updatedAt = toValidDate(updatedAtRaw);
    // toValidDate 对无效日期回退到 epoch，这里检测原始值是否有效
    if ((createdAtRaw !== undefined && createdAtRaw !== null && Number.isNaN(new Date(createdAtRaw as string).getTime())) ||
        (updatedAtRaw !== undefined && updatedAtRaw !== null && Number.isNaN(new Date(updatedAtRaw as string).getTime()))) {
      return { ok: false, error: `节点 ${id} 的 meta.createdAt/updatedAt 不是有效日期` };
    }

    // 还原 Date 类型，其余字段保持原样（结构由 PageNode 类型约束）
    result[id] = {
      ...(node as unknown as PageNode),
      meta: {
        ...(node.meta as PageNode['meta']),
        createdAt,
        updatedAt,
      },
    };
  }

  if (Object.keys(result).length === 0) {
    return { ok: false, error: 'nodes 为空' };
  }

  return { ok: true, nodes: result };
};
