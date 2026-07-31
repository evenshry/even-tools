import type { CSSProperties as ReactCSSProperties } from 'react';

// 节点类型枚举
export const NodeType = {
  // 布局节点
  PAGE: 'page',
  SECTION: 'section',
  CONTAINER: 'container',
  GRID: 'grid',
  FLEX: 'flex',
  STACK: 'stack',
  
  // 基础节点
  DIV: 'div',
  SPAN: 'span',
  TEXT: 'text',
  HEADING: 'heading',
  
  // 表单节点
  BUTTON: 'button',
  INPUT: 'input',
  FORM: 'form',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  
  // 媒体节点
  IMAGE: 'image',
  VIDEO: 'video',
  ICON: 'icon',
  
  // 自定义节点
  CUSTOM: 'custom'
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

// 布局类型
export const LayoutType = {
  BLOCK: 'block',
  INLINE: 'inline',
  FLEX: 'flex',
  GRID: 'grid',
  ABSOLUTE: 'absolute'
} as const;

export type LayoutType = typeof LayoutType[keyof typeof LayoutType];

// CSS属性接口（直接使用 React.CSSProperties，移除索引签名以保留类型安全）
export type CSSProperties = ReactCSSProperties;

/**
 * 事件配置（可序列化，运行时映射到真实 handler）
 * 替代旧的 EventHandler 函数引用，使 nodes 可被 JSON.stringify 持久化
 */
export interface EventConfig {
  /** 事件类型 */
  actionType: 'navigate' | 'alert' | 'toggleVisibility' | 'custom';
  /** 动作参数（如跳转 URL、提示文本） */
  payload?: string;
}

// 事件配置映射
export interface EventsConfig {
  onClick?: EventConfig;
  onHover?: EventConfig;
}

// 页面节点接口
export interface PageNode {
  // 基础标识
  id: string;
  type: NodeType;
  name: string;
  alias?: string;

  /** 父节点 ID（根节点为 undefined）- 用于 O(1) 查找根节点 */
  parentId?: string;

  // 布局属性
  layout: {
    type: LayoutType;
    display: string;
    position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
  };

  // 样式属性
  style: CSSProperties;
  className?: string[];

  // 内容属性
  content: {
    text?: string;
    html?: string;
    src?: string;
    children?: string[]; // 子节点ID数组
  };

  // 交互属性（可序列化配置，运行时映射到 handler）
  events: EventsConfig;

  // 数据绑定
  dataBinding: {
    model?: string;
    prop?: string;
    type: 'static' | 'dynamic' | 'computed';
  };

  // 元数据
  meta: {
    createdAt: Date;
    updatedAt: Date;
    creator: string;
    tags: string[];
    version: number;
  };

  // 约束条件
  constraints: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    canDelete: boolean;
    canDuplicate: boolean;
    canResize: boolean;
    allowedChildren?: NodeType[];
  };
}

// 组件库项
export interface ComponentLibraryItem {
  id: string;
  name: string;
  type: NodeType;
  icon: string;
  category: string;
  description: string;
  defaultProps: Partial<PageNode>;
}

// 预览模式枚举
export const PreviewMode = {
  EDIT: 'edit',
  PREVIEW: 'preview'
} as const;

export type PreviewMode = typeof PreviewMode[keyof typeof PreviewMode];

// 对齐参考线（拖动时显示，画布坐标系，未缩放）
export interface AlignmentGuides {
  /** 水平参考线的 y 坐标数组（画布坐标） */
  horizontal: number[];
  /** 垂直参考线的 x 坐标数组（画布坐标） */
  vertical: number[];
}

// 画布状态
export interface CanvasState {
  nodes: Record<string, PageNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  dragTargetNodeId: string | null;
  zoom: number;
  gridVisible: boolean;
  alignmentGuidesVisible: boolean;
  /** 当前显示的对齐参考线（拖动结束自动清空） */
  alignmentGuides: AlignmentGuides | null;

  // 预览相关状态
  previewMode: PreviewMode;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  previewScale: number;
}

// 拖拽项
export interface DragItem {
  type: 'node' | 'component';
  id: string;
  componentType?: NodeType;
  name?: string;
  icon?: string;
  node?: PageNode;
}