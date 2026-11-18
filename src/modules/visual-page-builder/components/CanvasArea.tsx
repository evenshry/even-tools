import React, { useRef, useState, useMemo, useCallback, useLayoutEffect } from 'react';
import { Button, Tooltip, Space } from 'antd';
import {
  BorderOuterOutlined,
  ColumnHeightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDragManager } from '../hooks/useDragManager';
import CanvasNode from './CanvasNode';
import AlignmentGuides from './AlignmentGuides';
import Ruler from './Ruler';
import './CanvasArea.scss';

interface CanvasAreaProps {
  extraActions?: React.ReactNode;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ extraActions }) => {
  // 画布引用和状态
  const canvasRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  // 节点树未缩放高度：用于放大时撑开滚动区域
  const [treeHeight, setTreeHeight] = useState(0);

  // 网格与对齐参考线开关统一来自 store，避免本地状态与 store 不同步
  const gridVisible = useCanvasStore((s) => s.gridVisible);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const alignmentGuidesVisible = useCanvasStore((s) => s.alignmentGuidesVisible);
  const toggleAlignmentGuides = useCanvasStore((s) => s.toggleAlignmentGuides);

  // 使用拖拽管理器（带性能优化配置）
  const dragManager = useDragManager(canvasRef as React.RefObject<HTMLDivElement>, zoom, {
    enableDebounce: true,
    debounceDelay: 16,
    enableBoundaryCheck: true,
  });

  // 页面设置：背景色、画布尺寸
  const pageSettings = useCanvasStore((s) => s.pageSettings);

  // 仅订阅 nodes 引用（用于根节点列表）
  const nodes = useCanvasStore(s => s.nodes);

  // 合并 refs - 通过 ref 读取最新 drop，避免 ref 回调每次拖拽都重新挂载
  const dropRef = useRef(dragManager.drop);
  dropRef.current = dragManager.drop;
  const setCanvasRef = useCallback((element: HTMLDivElement | null) => {
    canvasRef.current = element;
    dropRef.current(element);
  }, []);

  // 监听节点树尺寸，缩放后同步滚动高度
  useLayoutEffect(() => {
    const element = treeRef.current;
    if (!element) return;
    const updateHeight = () => setTreeHeight(element.offsetHeight);
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
    // transform 不改变布局尺寸，补充 margin 让滚动区域覆盖缩放后的内容
    marginBottom: `${treeHeight * (zoom - 1)}px`,
  }), [zoom, treeHeight]);

  return (
    <div className="canvas-area">
      {/* 画布工具栏 */}
      <div className="canvas-toolbar">
        <Space className="toolbar-group">
          <Tooltip title="切换网格">
            <Button
              size="small"
              type={gridVisible ? "primary" : "default"}
              icon={<BorderOuterOutlined />}
              onClick={toggleGrid}
            />
          </Tooltip>
          <Tooltip title="切换标尺与对齐参考线">
            <Button
              size="small"
              type={alignmentGuidesVisible ? "primary" : "default"}
              icon={<ColumnHeightOutlined />}
              onClick={toggleAlignmentGuides}
            />
          </Tooltip>
        </Space>

        {extraActions && <div className="toolbar-group toolbar-group--actions">{extraActions}</div>}

        <Space className="toolbar-group">
          <Tooltip title="放大">
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
            />
          </Tooltip>
          <Tooltip title="缩小">
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.1))}
            />
          </Tooltip>
          <Tooltip title="重置缩放">
            <Button
              size="small"
              icon={<AimOutlined />}
              onClick={() => setZoom(1)}
            />
          </Tooltip>
          <span className="zoom-info">缩放: {(zoom * 100).toFixed(0)}%</span>
        </Space>
      </div>

      {/* 标尺 + 画布 grid 布局（标尺开关时切换布局） */}
      <div className={`canvas-body ${alignmentGuidesVisible ? 'with-ruler' : ''}`}>
        {/* 标尺组件返回 corner + top + left 三个 grid 子元素 */}
        <Ruler zoom={zoom} />
        {/* 画布容器（grid 2,2 位置，由 CSS 自动定位） */}
        <div
          ref={setCanvasRef}
          className={`canvas-container ${dragManager.isOver ? (dragManager.canDrop ? "drag-over-valid" : "drag-over-invalid") : ""}`}
          onClick={() => {
            useCanvasStore.getState().selectNode(null);
          }}
          style={{
            backgroundColor: pageSettings.backgroundColor,
            width: pageSettings.canvasWidth ? `${pageSettings.canvasWidth}px` : '100%',
            minHeight: pageSettings.canvasMinHeight ? `${pageSettings.canvasMinHeight}px` : '100%',
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
            <div className="node-tree" ref={treeRef} style={nodeTreeStyle}>
              {rootNodes.map((node) => (
                <CanvasNode
                  key={node.id}
                  nodeId={node.id}
                  zoom={zoom}
                  dragNodeId={dragManager.dragNodeId}
                  onNodeDragStart={dragManager.handleNodeDragStart}
                />
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
    </div>
  );
};

export default CanvasArea;
