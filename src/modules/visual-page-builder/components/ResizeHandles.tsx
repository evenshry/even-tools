import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { PageNode } from '../types';
import { parsePx } from '../utils/styleUtils';
import './ResizeHandles.scss';

/** 默认节点尺寸（parsePx 失败时回退） */
const DEFAULT_NODE_SIZE = 100;
/** 默认最小尺寸 */
const DEFAULT_MIN_SIZE = 10;

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
 *
 * 性能：useEffect 仅依赖 resizing（仅在 mousedown/mouseup 时变化），
 * 通过 nodeRef 读取最新节点，避免 resize 时每帧重绑 document 事件
 */
const ResizeHandles: React.FC<ResizeHandlesProps> = ({ nodeId, zoom }) => {
  const node = useCanvasStore((s) => s.nodes[nodeId]);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const resizingRef = useRef<ResizeState | null>(null);
  // 缓存最新的 node 和配置，供全局事件读取，避免每帧重绑
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const configRef = useRef({ nodeId, zoom, updateNode });
  configRef.current = { nodeId, zoom, updateNode };

  // 同步 ref（供全局事件读取最新值）
  useEffect(() => {
    resizingRef.current = resizing;
  }, [resizing]);

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
        startWidth: parsePx(node.style.width) || DEFAULT_NODE_SIZE,
        startHeight: parsePx(node.style.height) || DEFAULT_NODE_SIZE,
      };
      setResizing(start);
    },
    [node]
  );

  // 全局 mousemove / mouseup
  // 仅依赖 resizing（mousedown/mouseup 时变化），通过 nodeRef 读取最新 node
  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const state = resizingRef.current;
      const currentNode = nodeRef.current;
      const { nodeId: curNodeId, zoom: curZoom, updateNode: curUpdateNode } = configRef.current;
      if (!state || !currentNode) return;

      const deltaX = (e.clientX - state.startClientX) / curZoom;
      const deltaY = (e.clientY - state.startClientY) / curZoom;

      let { startLeft, startTop, startWidth, startHeight } = state;
      let newLeft = startLeft;
      let newTop = startTop;
      let newWidth = startWidth;
      let newHeight = startHeight;
      const dir = state.dir;

      // 当前节点的实时约束（可能因节点切换而变化）
      const curMinWidth = currentNode.constraints?.minWidth ?? DEFAULT_MIN_SIZE;
      const curMinHeight = currentNode.constraints?.minHeight ?? DEFAULT_MIN_SIZE;
      const curMaxWidth = currentNode.constraints?.maxWidth;
      const curMaxHeight = currentNode.constraints?.maxHeight;
      const curIsFlow = currentNode.layout.position !== 'absolute' && currentNode.layout.position !== 'fixed';

      // 水平方向
      if (dir.includes('e')) {
        newWidth = startWidth + deltaX;
      } else if (dir.includes('w')) {
        newWidth = startWidth - deltaX;
        newLeft = startLeft + deltaX;
      }

      // 垂直方向（流布局节点跳过）
      if (!curIsFlow) {
        if (dir.includes('s')) {
          newHeight = startHeight + deltaY;
        } else if (dir.includes('n')) {
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
        }
      }

      // 应用约束
      if (newWidth < curMinWidth) {
        if (dir.includes('w')) newLeft -= (curMinWidth - newWidth);
        newWidth = curMinWidth;
      }
      if (curMaxWidth !== undefined && newWidth > curMaxWidth) {
        if (dir.includes('w')) newLeft += (newWidth - curMaxWidth);
        newWidth = curMaxWidth;
      }
      if (!curIsFlow) {
        if (newHeight < curMinHeight) {
          if (dir.includes('n')) newTop -= (curMinHeight - newHeight);
          newHeight = curMinHeight;
        }
        if (curMaxHeight !== undefined && newHeight > curMaxHeight) {
          if (dir.includes('n')) newTop += (newHeight - curMaxHeight);
          newHeight = curMaxHeight;
        }
      }

      // 流布局节点不写 left/top/height
      const styleUpdate: Partial<PageNode['style']> = {
        ...currentNode.style,
        width: `${newWidth}px`,
      };
      if (!curIsFlow) {
        styleUpdate.left = `${newLeft}px`;
        styleUpdate.top = `${newTop}px`;
        styleUpdate.height = `${newHeight}px`;
      }

      curUpdateNode(curNodeId, { style: styleUpdate });
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
  }, [resizing]);

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
