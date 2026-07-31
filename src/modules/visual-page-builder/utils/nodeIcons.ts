import { NodeType } from '../types';

/**
 * 节点类型 → 图标 emoji 映射
 *
 * 单一来源：LayerPanel / PropertyPanel / MultiSelectToolbar 等共享
 * 覆盖所有 NodeType 枚举值
 */
export const nodeTypeIconMap: Record<string, string> = {
  [NodeType.TEXT]: '📝',
  [NodeType.HEADING]: '📋',
  [NodeType.BUTTON]: '🔘',
  [NodeType.IMAGE]: '🖼️',
  [NodeType.DIV]: '🧱',
  [NodeType.SECTION]: '📦',
  [NodeType.CONTAINER]: '📁',
  [NodeType.FLEX]: '📐',
  [NodeType.GRID]: '🔲',
  [NodeType.STACK]: '📚',
  [NodeType.SPAN]: '🔗',
  [NodeType.FORM]: '📝',
  [NodeType.INPUT]: '⌨️',
  [NodeType.SELECT]: '🔽',
  [NodeType.CHECKBOX]: '☑️',
  [NodeType.VIDEO]: '🎥',
  [NodeType.ICON]: '🔣',
  [NodeType.CUSTOM]: '🔧',
  [NodeType.PAGE]: '📄',
};

/** 默认兜底图标（未知节点类型） */
export const DEFAULT_NODE_ICON = '🔹';

/**
 * 获取节点类型对应的图标 emoji
 * 未知类型返回 DEFAULT_NODE_ICON
 */
export const getNodeTypeIcon = (type: string): string => {
  return nodeTypeIconMap[type] || DEFAULT_NODE_ICON;
};
