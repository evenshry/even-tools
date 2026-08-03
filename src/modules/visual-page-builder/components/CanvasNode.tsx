import React, { memo } from 'react';
import { NodeType } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';
import type { DragManager } from '../hooks/useDragManager';
import type { PageNode } from '../types';
import NodeContextMenu from './NodeContextMenu';
import ResizeHandles from './ResizeHandles';

const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVERED = 500;
const Z_INDEX_DEFAULT = 100;

interface CanvasNodeProps {
  nodeId: string;
  zoom: number;
  dragManager: DragManager;
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
 * 构建节点样式：将 PageNode.style 转为 React.CSSProperties
 * 编辑模式下同时应用 layout 属性（display/position 等），保证所见即所得
 */
const buildNodeStyle = (node: PageNode): React.CSSProperties => {
  const { style, layout } = node;
  return {
    display: layout.display,
    position: layout.position,
    flexDirection: layout.flexDirection,
    flexWrap: layout.flexWrap,
    gridTemplateColumns: layout.gridTemplateColumns,
    gridTemplateRows: layout.gridTemplateRows,
    left: style.left,
    top: style.top,
    width: style.width,
    height: style.height,
    backgroundColor: style.backgroundColor,
    border: style.border,
    borderRadius: style.borderRadius,
    padding: style.padding,
    margin: style.margin,
    gap: style.gap,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    boxShadow: style.boxShadow,
    opacity: style.opacity,
  };
};

/**
 * 节点内容渲染：对齐 PreviewRenderer 的渲染逻辑
 * - 容器节点：渲染子节点 + 空状态提示
 * - 内容节点：直接渲染语义元素 + 应用节点样式
 */
const renderNodeContent = (node: PageNode, renderChildren: () => React.ReactNode): React.ReactNode => {
  const { type, content, style, layout } = node;
  const children = content.children || [];
  const hasChildren = children.length > 0;
  const styleObj: React.CSSProperties = {
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    border: style.border,
    borderRadius: style.borderRadius,
    padding: style.padding,
    margin: style.margin,
    boxShadow: style.boxShadow,
    opacity: style.opacity,
  };

  // 容器类型：渲染子节点
  if (CONTAINER_TYPES.has(type)) {
    if (type === NodeType.FLEX) {
      return (
        <div style={{ display: 'flex', flexDirection: layout.flexDirection || 'row', flexWrap: layout.flexWrap || 'nowrap', gap: style.gap }}>
          {hasChildren ? renderChildren() : <span className="empty-hint">{EMPTY_HINT[type]}</span>}
        </div>
      );
    }
    if (type === NodeType.GRID) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: layout.gridTemplateColumns, gridTemplateRows: layout.gridTemplateRows, gap: style.gap }}>
          {hasChildren ? renderChildren() : <span className="empty-hint">{EMPTY_HINT[type]}</span>}
        </div>
      );
    }
    // 普通容器
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
      return <button style={styleObj}>{content.text || '按钮'}</button>;
    case NodeType.TEXT:
      return <div style={styleObj}>{content.text || '文本'}</div>;
    case NodeType.HEADING:
      return <h2 style={styleObj}>{content.text || '标题'}</h2>;
    case NodeType.SPAN:
      return <span style={styleObj}>{content.text || '行内文本'}</span>;
    case NodeType.INPUT:
      return <input style={styleObj} placeholder={content.text || '输入框'} readOnly />;
    case NodeType.SELECT:
      return (
        <select style={styleObj} disabled>
          <option>{content.text || '下拉选择'}</option>
        </select>
      );
    case NodeType.CHECKBOX:
      return (
        <label style={styleObj}>
          <input type="checkbox" disabled />
          <span>{content.text || '复选框'}</span>
        </label>
      );
    case NodeType.IMAGE:
      return content.src ? (
        <img src={content.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      ) : (
        <div className="image-empty-hint">🖼️ 图片</div>
      );
    case NodeType.VIDEO:
      return content.src ? (
        <video src={content.src} style={{ maxWidth: '100%', maxHeight: '100%' }} controls />
      ) : (
        <div className="image-empty-hint">🎬 视频</div>
      );
    case NodeType.ICON:
      return <div className="image-empty-hint">⭐ 图标</div>;
    default:
      return <span className="empty-hint">{type}</span>;
  }
};

const CanvasNodeInner: React.FC<CanvasNodeProps> = ({ nodeId, zoom, dragManager }) => {
  const node = useCanvasStore(s => s.nodes[nodeId]);
  const isSelected = useCanvasStore(s => s.selectedNodeIds.includes(nodeId) || s.selectedNodeId === nodeId);
  const isHovered = useCanvasStore(s => s.hoveredNodeId === nodeId);
  const isDragTarget = useCanvasStore(s => s.dragTargetNodeId === nodeId);

  if (!node) return null;

  const supportsDrag = node.layout.position === 'absolute' || node.layout.position === 'fixed';
  const nodeStyle = buildNodeStyle(node);

  const renderChildren = () => {
    const childIds = node.content.children || [];
    if (childIds.length === 0) return null;
    return childIds.map((cid) => (
      <CanvasNode key={cid} nodeId={cid} zoom={zoom} dragManager={dragManager} />
    ));
  };

  const zIndex = isSelected ? Z_INDEX_SELECTED : isHovered ? Z_INDEX_HOVERED : Z_INDEX_DEFAULT;

  return (
    <NodeContextMenu nodeId={nodeId}>
      <div
        data-node-id={nodeId}
        className={`canvas-node ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""} ${dragManager.dragNodeId === nodeId ? "dragging" : ""} ${
          supportsDrag ? "draggable" : "flow-layout"
        } ${isDragTarget ? "drag-target" : ""}`}
        style={{ ...nodeStyle, zIndex }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            useCanvasStore.getState().addToSelection(nodeId);
          } else if (e.ctrlKey || e.metaKey) {
            useCanvasStore.getState().toggleNodeSelection(nodeId);
          } else {
            useCanvasStore.getState().selectNode(nodeId);
          }
        }}
        onMouseDown={supportsDrag ? (e) => dragManager.handleNodeDragStart(e, nodeId) : undefined}
        onMouseEnter={() => useCanvasStore.getState().hoverNode(nodeId)}
        onMouseLeave={() => useCanvasStore.getState().hoverNode(null)}
      >
        {renderNodeContent(node, renderChildren)}

        {isSelected && node.constraints.canResize && (
          <ResizeHandles nodeId={nodeId} zoom={zoom} />
        )}
      </div>
    </NodeContextMenu>
  );
};

const CanvasNode = memo(CanvasNodeInner, (prev, next) => {
  return prev.nodeId === next.nodeId && prev.dragManager === next.dragManager && prev.zoom === next.zoom;
});

export default CanvasNode;
