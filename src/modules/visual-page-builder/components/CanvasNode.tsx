import React, { memo } from 'react';
import { NodeType } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';
import type { PageNode } from '../types';
import { buildNodeStyle } from '../utils/styleUtils';
import NodeContextMenu from './NodeContextMenu';
import ResizeHandles from './ResizeHandles';

const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVERED = 500;
const Z_INDEX_DEFAULT = 100;

interface CanvasNodeProps {
  nodeId: string;
  zoom: number;
  /** 当前正在拖拽的节点 ID（用于 dragging 样式） */
  dragNodeId: string | null;
  /** 稳定的拖拽开始回调 */
  onNodeDragStart: (e: React.MouseEvent, nodeId: string) => void;
}

/** 空容器提示文字映射 */
const EMPTY_HINT: Record<string, string> = {
  [NodeType.SECTION]: '拖拽组件到此',
  [NodeType.CONTAINER]: '拖拽组件到此',
  [NodeType.DIV]: '拖拽组件到此',
  [NodeType.FORM]: '拖拽表单组件到此',
  [NodeType.STACK]: '拖拽组件到此',
  [NodeType.FLEX]: '拖拽组件到此',
  [NodeType.GRID]: '拖拽组件到此',
  [NodeType.PAGE]: '拖拽组件到此',
};

/** 需要子节点渲染的容器类型 */
const CONTAINER_TYPES = new Set<string>([
  NodeType.SECTION, NodeType.CONTAINER, NodeType.DIV, NodeType.FORM,
  NodeType.STACK, NodeType.FLEX, NodeType.GRID, NodeType.PAGE,
]);

/**
 * 文本类样式：颜色/字体等可继承属性
 * 只应用到内容元素，避免与 wrapper 上的 padding/border/margin 重复计算
 */
const getTextStyle = (node: PageNode): React.CSSProperties => ({
  color: node.style.color,
  fontSize: node.style.fontSize,
  fontWeight: node.style.fontWeight,
  fontFamily: node.style.fontFamily,
  lineHeight: node.style.lineHeight,
  letterSpacing: node.style.letterSpacing,
  textDecoration: node.style.textDecoration,
  whiteSpace: node.style.whiteSpace,
  textAlign: node.style.textAlign,
});

/**
 * 节点内容渲染
 * - 布局（display/flex/grid）与盒模型（padding/border/margin）统一由 wrapper 承担
 * - 内容元素只负责文本语义与字体颜色，避免样式重复应用
 */
const renderNodeContent = (node: PageNode, renderChildren: () => React.ReactNode): React.ReactNode => {
  const { type, content, style } = node;
  const children = content.children || [];
  const hasChildren = children.length > 0;
  const textStyle = getTextStyle(node);

  // DIV 既可包含子节点，也可直接承载文本
  if (type === NodeType.DIV) {
    return (
      <>
        {content.text ? <div style={textStyle}>{content.text}</div> : null}
        {renderChildren()}
        {!hasChildren && !content.text && <span className="empty-hint">{EMPTY_HINT[type]}</span>}
      </>
    );
  }

  // 容器类型：wrapper 已是 flex/grid 容器，直接渲染子节点
  if (CONTAINER_TYPES.has(type)) {
    return (
      <>
        {renderChildren()}
        {!hasChildren && <span className="empty-hint">{EMPTY_HINT[type]}</span>}
      </>
    );
  }

  // 内容节点
  switch (type) {
    case NodeType.BUTTON:
      return <button style={textStyle}>{content.text || '按钮'}</button>;
    case NodeType.TEXT:
      return <div style={textStyle}>{content.text || '文本'}</div>;
    case NodeType.HEADING:
      return <h2 style={textStyle}>{content.text || '标题'}</h2>;
    case NodeType.SPAN:
      return <span style={textStyle}>{content.text || '行内文本'}</span>;
    case NodeType.INPUT:
      return <input style={textStyle} placeholder={content.text || '输入框'} readOnly />;
    case NodeType.SELECT:
      return (
        <select style={textStyle} disabled>
          <option>{content.text || '下拉选择'}</option>
        </select>
      );
    case NodeType.CHECKBOX:
      return (
        <label style={textStyle}>
          <input type="checkbox" disabled />
          <span>{content.text || '复选框'}</span>
        </label>
      );
    case NodeType.IMAGE:
      return content.src ? (
        <img
          src={content.src}
          alt=""
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: style.objectFit ?? 'contain' }}
        />
      ) : (
        <div className="image-empty-hint">🖼️ 图片</div>
      );
    case NodeType.VIDEO:
      return content.src ? (
        <video src={content.src} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: style.objectFit }} controls />
      ) : (
        <div className="image-empty-hint">🎬 视频</div>
      );
    case NodeType.ICON:
      return <div className="image-empty-hint">{content.text || '⭐ 图标'}</div>;
    default:
      return <span className="empty-hint">{type}</span>;
  }
};

const CanvasNodeInner: React.FC<CanvasNodeProps> = ({ nodeId, zoom, dragNodeId, onNodeDragStart }) => {
  const node = useCanvasStore(s => s.nodes[nodeId]);
  const isSelected = useCanvasStore(s => s.selectedNodeIds.includes(nodeId));
  const isHovered = useCanvasStore(s => s.hoveredNodeId === nodeId);
  const isDragTarget = useCanvasStore(s => s.dragTargetNodeId === nodeId);

  if (!node) return null;

  const isLocked = !!node.constraints.locked;
  const supportsDrag = (node.layout.position === 'absolute' || node.layout.position === 'fixed') && !isLocked;
  const nodeStyle = buildNodeStyle(node);

  const renderChildren = () => {
    const childIds = node.content.children || [];
    if (childIds.length === 0) return null;
    return childIds.map((cid) => (
      <CanvasNode key={cid} nodeId={cid} zoom={zoom} dragNodeId={dragNodeId} onNodeDragStart={onNodeDragStart} />
    ));
  };

  const zIndex = isSelected ? Z_INDEX_SELECTED : isHovered ? Z_INDEX_HOVERED : Z_INDEX_DEFAULT;

  /** 选择逻辑统一放在 mousedown，避免拖拽开始时空多选 */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const store = useCanvasStore.getState();
    if (e.shiftKey) {
      store.addToSelection(nodeId);
    } else if (e.ctrlKey || e.metaKey) {
      store.toggleNodeSelection(nodeId);
    } else {
      store.selectNode(nodeId);
    }
    if (supportsDrag) {
      onNodeDragStart(e, nodeId);
    }
  };

  return (
    <NodeContextMenu nodeId={nodeId}>
      <div
        data-node-id={nodeId}
        className={`canvas-node ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""} ${dragNodeId === nodeId ? "dragging" : ""} ${
          supportsDrag ? "draggable" : "flow-layout"
        } ${isDragTarget ? "drag-target" : ""} ${
          node.layout.display === "flex" ? "flex-container" : ""
        } ${node.layout.display === "grid" ? "grid-container" : ""}`}
        style={{ ...nodeStyle, zIndex }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => useCanvasStore.getState().hoverNode(nodeId)}
        onMouseLeave={() => useCanvasStore.getState().hoverNode(null)}
      >
        {renderNodeContent(node, renderChildren)}

        {isSelected && !isLocked && node.constraints.canResize && (
          <ResizeHandles nodeId={nodeId} zoom={zoom} />
        )}
      </div>
    </NodeContextMenu>
  );
};

const CanvasNode = memo(CanvasNodeInner, (prev, next) => {
  return prev.nodeId === next.nodeId
    && prev.dragNodeId === next.dragNodeId
    && prev.zoom === next.zoom
    && prev.onNodeDragStart === next.onNodeDragStart;
});

export default CanvasNode;
