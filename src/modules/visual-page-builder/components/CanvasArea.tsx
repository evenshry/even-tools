import React, { useRef, useState, useMemo } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDragManager } from '../hooks/useDragManager';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import CanvasNode from './CanvasNode';
import AlignmentGuides from './AlignmentGuides';
import './CanvasArea.scss';

const CanvasArea: React.FC = () => {
  // 画布引用和状态
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);

  // 对齐参考线开关（来自 store，与拖拽逻辑共享）
  const alignmentGuidesVisible = useCanvasStore((s) => s.alignmentGuidesVisible);
  const toggleAlignmentGuides = useCanvasStore((s) => s.toggleAlignmentGuides);

  // 使用拖拽管理器（带性能优化配置）
  const dragManager = useDragManager(canvasRef as React.RefObject<HTMLDivElement>, zoom, {
    enableDebounce: true,
    debounceDelay: 16,
    enableBoundaryCheck: true,
    enableDragConstraints: true
  });

  // 仅订阅 nodes 引用（用于根节点列表）
  const nodes = useCanvasStore(s => s.nodes);

  // 启用键盘快捷键
  useKeyboardShortcuts(true);

  // 合并refs - 将拖拽管理器的drop引用与canvas引用合并
  const setCanvasRef = (element: HTMLDivElement | null) => {
    canvasRef.current = element;
    dragManager.drop(element);
  };

  // O(n) 过滤根节点（通过 parentId 字段）
  const rootNodes = useMemo(
    () => Object.values(nodes).filter((node) => !node.parentId),
    [nodes]
  );

  // 节点树容器的缩放样式（统一处理，避免每个节点单独 transform）
  const nodeTreeStyle: React.CSSProperties = useMemo(() => ({
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    width: `${100 / zoom}%`,
  }), [zoom]);

  return (
    <div className="canvas-area">
      {/* 画布工具栏 */}
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button className={`toolbar-btn ${gridVisible ? "active" : ""}`} onClick={() => setGridVisible(!gridVisible)} title="切换网格">
            📐
          </button>
          <button
            className={`toolbar-btn ${alignmentGuidesVisible ? "active" : ""}`}
            onClick={toggleAlignmentGuides}
            title="切换对齐参考线"
          >
            📏
          </button>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setZoom((z) => Math.min(z + 0.1, 3))} title="放大">
            🔍+
          </button>
          <button className="toolbar-btn" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.1))} title="缩小">
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
        ref={setCanvasRef}
        className={`canvas-container ${dragManager.isOver ? (dragManager.canDrop ? "drag-over-valid" : "drag-over-invalid") : ""}`}
        onClick={() => {
          useCanvasStore.getState().selectNode(null);
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

        {/* 节点树（缩放放在容器上，子节点不再单独 transform） */}
        {rootNodes.length > 0 ? (
          <div className="node-tree" style={nodeTreeStyle}>
            {rootNodes.map((node) => (
              <CanvasNode key={node.id} nodeId={node.id} zoom={zoom} dragManager={dragManager} />
            ))}
            {/* 对齐参考线 overlay（画布坐标系，跟随 .node-tree 的 scale） */}
            <AlignmentGuides />
          </div>
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
