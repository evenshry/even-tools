import React, { memo } from 'react';
import { NodeType } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';
import type { DragManager } from '../hooks/useDragManager';
import NodeContextMenu from './NodeContextMenu';
import ResizeHandles from './ResizeHandles';

// zIndex 层级常量
const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVERED = 500;
const Z_INDEX_DEFAULT = 100;

interface CanvasNodeProps {
  nodeId: string;
  zoom: number;
  dragManager: DragManager;
}

/**
 * 单个画布节点组件
 * 使用 React.memo 优化：只有 nodeId 变化时才重新渲染
 * 通过 useCanvasStore 精确订阅单个节点 + 选中/悬停状态
 */
const CanvasNodeInner: React.FC<CanvasNodeProps> = ({ nodeId, zoom, dragManager }) => {
  // 精确订阅单节点数据（其他节点变化不会触发本组件重渲染）
  const node = useCanvasStore(s => s.nodes[nodeId]);
  // 多选：检查 selectedNodeIds 是否包含本节点（同时兼容旧的 selectedNodeId 单选）
  const isSelected = useCanvasStore(s => s.selectedNodeIds.includes(nodeId) || s.selectedNodeId === nodeId);
  const isHovered = useCanvasStore(s => s.hoveredNodeId === nodeId);
  const isDragTarget = useCanvasStore(s => s.dragTargetNodeId === nodeId);

  if (!node) return null;

  const supportsDrag = node.layout.position === 'absolute' || node.layout.position === 'fixed';

  // 节点样式（zoom 由父容器统一 transform，不再放在单个节点上）
  // 应用 layout 布局属性（display/flex/grid），保证编辑模式所见即所得
  const nodeStyle: React.CSSProperties = {
    position: node.layout.position,
    display: node.layout.display,
    flexDirection: node.layout.flexDirection,
    flexWrap: node.layout.flexWrap,
    gridTemplateColumns: node.layout.gridTemplateColumns,
    gridTemplateRows: node.layout.gridTemplateRows,
    left: node.style.left,
    top: node.style.top,
    width: node.style.width,
    height: node.style.height,
    backgroundColor: node.style.backgroundColor,
    border: node.style.border,
    borderRadius: node.style.borderRadius,
    padding: node.style.padding,
    margin: node.style.margin,
    gap: node.style.gap,
    color: node.style.color,
    fontSize: node.style.fontSize,
    fontWeight: node.style.fontWeight,
    boxShadow: node.style.boxShadow,
    opacity: node.style.opacity,
    zIndex: isSelected ? Z_INDEX_SELECTED : isHovered ? Z_INDEX_HOVERED : Z_INDEX_DEFAULT,
  };

  // 节点内容
  let nodeContent: React.ReactNode;
  switch (node.type) {
    case NodeType.SECTION:
      nodeContent = <div className="section-content">内容区块</div>;
      break;
    case NodeType.CONTAINER:
    case NodeType.DIV:
    case NodeType.FORM:
    case NodeType.STACK:
      nodeContent = <div className={`${node.type}-placeholder`}>{node.type === 'form' ? '表单容器' : node.type === 'stack' ? '堆叠容器' : '容器'}</div>;
      break;
    case NodeType.FLEX:
      nodeContent = <div className="flex-placeholder">弹性布局</div>;
      break;
    case NodeType.GRID:
      nodeContent = <div className="grid-placeholder">网格布局</div>;
      break;
    case NodeType.BUTTON:
      nodeContent = <button className="button-content">{node.content.text || '按钮'}</button>;
      break;
    case NodeType.TEXT:
      nodeContent = <div className="text-content">{node.content.text || '文本'}</div>;
      break;
    case NodeType.HEADING:
      nodeContent = <h2 className="heading-content">{node.content.text || '标题'}</h2>;
      break;
    case NodeType.SPAN:
      nodeContent = <span className="span-content">{node.content.text || '行内文本'}</span>;
      break;
    case NodeType.INPUT:
      nodeContent = <input className="input-content" placeholder={node.content.text || '输入框'} readOnly />;
      break;
    case NodeType.SELECT:
      nodeContent = (
        <select className="select-content" disabled>
          <option>{node.content.text || '下拉选择'}</option>
        </select>
      );
      break;
    case NodeType.CHECKBOX:
      nodeContent = (
        <label className="checkbox-content">
          <input type="checkbox" disabled />
          <span>{node.content.text || '复选框'}</span>
        </label>
      );
      break;
    case NodeType.IMAGE:
      nodeContent = (
        <div className="image-placeholder">
          <span>🖼️</span>
          <span>图片</span>
        </div>
      );
      break;
    case NodeType.VIDEO:
      nodeContent = (
        <div className="image-placeholder">
          <span>🎬</span>
          <span>视频</span>
        </div>
      );
      break;
    case NodeType.ICON:
      nodeContent = (
        <div className="image-placeholder">
          <span>⭐</span>
          <span>图标</span>
        </div>
      );
      break;
    case NodeType.PAGE:
      nodeContent = <div className="page-placeholder">页面</div>;
      break;
    default:
      nodeContent = <div className="unknown-content">{node.type}</div>;
  }

  return (
    <NodeContextMenu nodeId={nodeId}>
      <div
        data-node-id={nodeId}
        className={`canvas-node ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""} ${dragManager.dragNodeId === nodeId ? "dragging" : ""} ${
          supportsDrag ? "draggable" : "flow-layout"
        } ${isDragTarget ? "drag-target" : ""}`}
        style={nodeStyle}
        onClick={(e) => {
          e.stopPropagation();
          // Shift+点击：追加到选中集合
          // Ctrl/Cmd+点击：切换选中状态
          // 普通点击：单选（清空其他）
          if (e.shiftKey) {
            useCanvasStore.getState().addToSelection(nodeId);
          } else if (e.ctrlKey || e.metaKey) {
            useCanvasStore.getState().toggleNodeSelection(nodeId);
          } else {
            useCanvasStore.getState().selectNode(nodeId);
          }
        }}
        onMouseDown={supportsDrag ? (e) => dragManager.handleNodeDragStart(e, nodeId) : undefined}
        onMouseEnter={() => {
          useCanvasStore.getState().hoverNode(nodeId);
        }}
        onMouseLeave={() => {
          useCanvasStore.getState().hoverNode(null);
        }}
      >
        {nodeContent}

        {/* 选中时显示缩放手柄（仅 canResize 节点） */}
        {isSelected && node.constraints.canResize && (
          <ResizeHandles nodeId={nodeId} zoom={zoom} />
        )}

        {/* 渲染子节点 */}
        {node.content.children && node.content.children.length > 0 && (
          <div className="node-children">
            {node.content.children.map((childId) => (
              <CanvasNode key={childId} nodeId={childId} zoom={zoom} dragManager={dragManager} />
            ))}
          </div>
        )}
      </div>
    </NodeContextMenu>
  );
};

/**
 * memo 比较：nodeId / zoom / dragManager 都不变时跳过重渲染
 * dragManager 是稳定引用（来自 useRef/useMemo）
 */
const CanvasNode = memo(CanvasNodeInner, (prev, next) => {
  return prev.nodeId === next.nodeId && prev.dragManager === next.dragManager && prev.zoom === next.zoom;
});

export default CanvasNode;
