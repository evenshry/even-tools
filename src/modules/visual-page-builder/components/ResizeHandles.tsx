import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { PageNode } from '../types';
import './ResizeHandles.scss';

/** 解析像素值 */
const parsePx = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : 0;
};

/** 8 个手柄方向 */
type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeHandlesProps {
  nodeId: string;
  zoom: number;
}

interface ResizeState {
  dir: HandleDir;
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
}

/**
 * 缩放手柄
 * - 选中节点时渲染 8 个手柄
 * - 仅绝对/固定定位节点支持全部 8 个方向
 * - 流布局节点（static/relative）只支持 'e'（右边）宽度调整
 * - mouseup 时通过 updateNode 提交一次变更，依赖 T1.2 的历史合并机制
 */
const ResizeHandles: React.FC<ResizeHandlesProps> = ({ nodeId, zoom }) => {
  const node = useCanvasStore((s) => s.nodes[nodeId]);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const resizingRef = useRef<ResizeState | null>(null);

  // 同步 ref（供全局事件读取最新值）
  useEffect(() => {
    resizingRef.current = resizing;
  }, [resizing]);

  // 节点约束
  const minWidth = node?.constraints?.minWidth ?? 10;
  const minHeight = node?.constraints?.minHeight ?? 10;
  const maxWidth = node?.constraints?.maxWidth;
  const maxHeight = node?.constraints?.maxHeight;

  // 是否流布局（只能改宽度）
  const isFlow = !node || (node.layout.position !== 'absolute' && node.layout.position !== 'fixed');

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dir: HandleDir) => {
      e.stopPropagation();
      e.preventDefault();
      if (!node) return;

      const start: ResizeState = {
        dir,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startLeft: parsePx(node.style.left),
        startTop: parsePx(node.style.top),
        startWidth: parsePx(node.style.width) || 100,
        startHeight: parsePx(node.style.height) || 100,
      };
      setResizing(start);
    },
    [node]
  );

  // 全局 mousemove / mouseup
  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const state = resizingRef.current;
      if (!state || !node) return;

      const deltaX = (e.clientX - state.startClientX) / zoom;
      const deltaY = (e.clientY - state.startClientY) / zoom;

      let { startLeft, startTop, startWidth, startHeight } = state;
      let newLeft = startLeft;
      let newTop = startTop;
      let newWidth = startWidth;
      let newHeight = startHeight;
      const dir = state.dir;

      // 水平方向
      if (dir.includes('e')) {
        newWidth = startWidth + deltaX;
      } else if (dir.includes('w')) {
        newWidth = startWidth - deltaX;
        newLeft = startLeft + deltaX;
      }

      // 垂直方向（流布局节点跳过）
      if (!isFlow) {
        if (dir.includes('s')) {
          newHeight = startHeight + deltaY;
        } else if (dir.includes('n')) {
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
        }
      }

      // 应用约束
      if (newWidth < minWidth) {
        if (dir.includes('w')) newLeft -= (minWidth - newWidth);
        newWidth = minWidth;
      }
      if (maxWidth !== undefined && newWidth > maxWidth) {
        if (dir.includes('w')) newLeft += (newWidth - maxWidth);
        newWidth = maxWidth;
      }
      if (!isFlow) {
        if (newHeight < minHeight) {
          if (dir.includes('n')) newTop -= (minHeight - newHeight);
          newHeight = minHeight;
        }
        if (maxHeight !== undefined && newHeight > maxHeight) {
          if (dir.includes('n')) newTop += (newHeight - maxHeight);
          newHeight = maxHeight;
        }
      }

      // 流布局节点不写 left/top/height
      const styleUpdate: Partial<PageNode['style']> = {
        ...node.style,
        width: `${newWidth}px`,
      };
      if (!isFlow) {
        styleUpdate.left = `${newLeft}px`;
        styleUpdate.top = `${newTop}px`;
        styleUpdate.height = `${newHeight}px`;
      }

      updateNode(nodeId, { style: styleUpdate });
    };

    const onMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing, node, nodeId, zoom, isFlow, minWidth, minHeight, maxWidth, maxHeight, updateNode]);

  if (!node) return null;

  // 流布局节点只渲染 'e' 手柄
  const dirs: HandleDir[] = isFlow ? ['e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <div className="resize-handles" aria-hidden>
      {dirs.map((dir) => (
        <div
          key={dir}
          className={`resize-handle resize-handle--${dir} ${isFlow ? 'resize-handle--flow' : ''}`}
          onMouseDown={(e) => handleMouseDown(e, dir)}
        />
      ))}
    </div>
  );
};

export default ResizeHandles;
