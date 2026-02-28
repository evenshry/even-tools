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

// CSS属性接口
export interface CSSProperties extends ReactCSSProperties {
  [key: string]: string | number | undefined;
}

// 事件处理器
export type EventHandler = (event: React.SyntheticEvent) => void;

// 页面节点接口
export interface PageNode {
  // 基础标识
  id: string;
  type: NodeType;
  name: string;
  alias?: string;
  
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
  
  // 交互属性
  events: {
    onClick?: EventHandler;
    onHover?: EventHandler;
  };
  
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

// 主题配置
export interface ThemeConfig {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily: Record<string, string>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
  };
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
}

// 断点配置
export interface BreakpointConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// 自定义组件
export interface CustomComponent {
  id: string;
  name: string;
  component: React.ComponentType;
  props: Record<string, unknown>;
  slots?: Record<string, string>;
}

// 外部依赖
export interface ExternalDependency {
  name: string;
  version: string;
  url: string;
  type: 'css' | 'js' | 'module';
}

// 数据源
export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'localStorage' | 'indexedDB' | 'mock';
  endpoint?: string;
  schema?: Record<string, unknown>;
}

// 页面元数据
export interface PageMeta {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

// 页面数据结构
export interface PageSchema {
  id: string;
  title: string;
  description: string;
  rootNode: PageNode;
  
  // 全局样式
  globalStyles: {
    theme: ThemeConfig;
    variables: Record<string, string>;
    breakpoints: BreakpointConfig;
  };
  
  // 组件库引用
  components: {
    local: Record<string, CustomComponent>;
    external: ExternalDependency[];
  };
  
  // 数据源配置
  dataSources: DataSource[];
  
  // 路由配置
  routing: {
    path: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  
  // 元数据
  meta: PageMeta;
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
  PREVIEW: 'preview',
  LIVE: 'live'
} as const;

export type PreviewMode = typeof PreviewMode[keyof typeof PreviewMode];

// 画布状态
export interface CanvasState {
  nodes: Record<string, PageNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  dragTargetNodeId: string | null;
  zoom: number;
  gridVisible: boolean;
  alignmentGuidesVisible: boolean;
  
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