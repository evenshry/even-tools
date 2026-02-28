import React, { useRef, useState } from 'react';
import { NodeType } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDragManager } from '../hooks/useDragManager';
import './CanvasArea.scss';

const CanvasArea: React.FC = () => {
  // 画布引用和状态
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);

  // 使用拖拽管理器（带性能优化配置）
  const dragManager = useDragManager(canvasRef as React.RefObject<HTMLDivElement>, zoom, {
    enableDebounce: true,
    debounceDelay: 16,
    enableBoundaryCheck: true,
    enableDragConstraints: true
  });
  
  // 从store获取状态
  const { nodes, selectedNodeId, hoveredNodeId } = useCanvasStore();

  // 合并refs - 将拖拽管理器的drop引用与canvas引用合并
  const setCanvasRef = (element: HTMLDivElement | null) => {
    canvasRef.current = element;
    dragManager.drop(element);

    if (element) {
      // 画布容器已设置ref
    }
  };

  /**
   * 渲染单个节点
   */
  const renderNode = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return null;

    const isSelected = selectedNodeId === nodeId;
    const isHovered = hoveredNodeId === nodeId;
    const isDragTarget = dragManager.dragTargetNodeId === nodeId;

    // 检查是否支持拖动：只有绝对定位和固定定位支持拖动
    const supportsDrag = node.layout.position === 'absolute' || node.layout.position === 'fixed';

    // 节点样式
    const nodeStyle: React.CSSProperties = {
      position: node.layout.position,
      left: node.style.left,
      top: node.style.top,
      width: node.style.width,
      height: node.style.height,
      backgroundColor: node.style.backgroundColor,
      border: node.style.border,
      borderRadius: node.style.borderRadius,
      padding: node.style.padding,
      margin: node.style.margin,
      transform: `scale(${zoom})`,
      transformOrigin: 'top left',
      zIndex: isSelected ? 1000 : isHovered ? 500 : 100,
    };

    // 节点内容
    let nodeContent: React.ReactNode;
    switch (node.type) {
      case NodeType.SECTION:
        nodeContent = <div className="section-content">内容区块</div>;
        break;
      case NodeType.CONTAINER:
        nodeContent = <div className="container-content">容器</div>;
        break;
      case NodeType.BUTTON:
        nodeContent = <button className="button-content">按钮</button>;
        break;
      case NodeType.TEXT:
        nodeContent = <div className="text-content">文本</div>;
        break;
      case NodeType.IMAGE:
        nodeContent = <div className="image-content">图片</div>;
        break;
      default:
        nodeContent = <div className="unknown-content">未知组件</div>;
    }

    return (
      <div
        key={nodeId}
        data-node-id={nodeId}
        className={`canvas-node ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""} ${dragManager.dragNodeId === nodeId ? "dragging" : ""} ${
          supportsDrag ? "draggable" : "flow-layout"
        } ${isDragTarget ? "drag-target" : ""}`}
        style={nodeStyle}
        onClick={(e) => {
          e.stopPropagation();
          // 使用store中的selectNode
          const { selectNode } = useCanvasStore.getState();
          selectNode(nodeId);
        }}
        onMouseDown={supportsDrag ? (e) => dragManager.handleNodeDragStart(e, nodeId) : undefined}
        onMouseEnter={() => {
          const { hoverNode } = useCanvasStore.getState();
          hoverNode(nodeId);
        }}
        onMouseLeave={() => {
          const { hoverNode } = useCanvasStore.getState();
          hoverNode(null);
        }}
      >
        {nodeContent}
        
        {/* 渲染子节点 */}
        {node.content.children && node.content.children.length > 0 && (
          <div className="node-children">
            {node.content.children.map((childId) => renderNode(childId))}
          </div>
        )}
      </div>
    );
  };

  // 过滤出根节点（没有父节点的节点）
  const rootNodes = Object.values(nodes).filter((node) => {
    const isChild = Object.values(nodes).some((parentNode) => 
      parentNode.content.children && parentNode.content.children.includes(node.id)
    );
    return !isChild;
  });

  return (
    <div className="canvas-area">
      {/* 画布工具栏 */}
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button className={`toolbar-btn ${gridVisible ? "active" : ""}`} onClick={() => setGridVisible(!gridVisible)} title="切换网格">
            📐
          </button>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setZoom((zoom) => Math.min(zoom + 0.1, 3))} title="放大">
            🔍+
          </button>
          <button className="toolbar-btn" onClick={() => setZoom((zoom) => Math.max(zoom - 0.1, 0.1))} title="缩小">
            🔍-
          </button>
          <button className="toolbar-btn" onClick={() => setZoom(1)} title="重置缩放">
            100%
          </button>

          <span className="zoom-info">缩放: {(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* 画布容器 */}
      <div
        ref={(node) => {
          // 画布容器ref绑定
          setCanvasRef(node);
        }}
        className={`canvas-container ${dragManager.isOver ? (dragManager.canDrop ? "drag-over-valid" : "drag-over-invalid") : ""}`}
        onClick={() => {
          const { selectNode } = useCanvasStore.getState();
          selectNode(null);
        }}
      >
        {/* 网格背景 */}
        {gridVisible && (
          <div
            className="grid-background"
            style={{
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            }}
          />
        )}

        {/* 节点树 */}
        {rootNodes.length > 0 ? (
          <div className="node-tree">{rootNodes.map((node) => renderNode(node.id))}</div>
        ) : (
          <div className="empty-canvas">
            <div className="empty-content">
              <div className="empty-icon">🎨</div>
              <h3>拖拽组件开始设计</h3>
              <p>从左侧面板拖拽组件到画布</p>
            </div>
          </div>
        )}

        {/* 拖拽提示 */}
        {dragManager.isOver && <div className={`drag-hint ${dragManager.canDrop ? "valid" : "invalid"}`}>{dragManager.canDrop ? "释放以添加组件" : "无法在此处放置"}</div>}
      </div>
    </div>
  );
};

export default CanvasArea;