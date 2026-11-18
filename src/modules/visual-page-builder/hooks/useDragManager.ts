import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import type { DragItem, PageNode, AlignmentGuides, NodeType } from '../types';
import type { RefObject } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { CANVAS_PADDING, parsePxStrict } from '../utils/styleUtils';

/** 对齐吸附阈值（画布坐标，未缩放） */
const ALIGN_THRESHOLD = 5;

/**
 * 将客户端坐标转换为画布坐标（未缩放）
 * 需要扣除画布容器的 border（拖拽高亮时出现）与 padding（16px）
 */
const toCanvasPoint = (
  canvas: HTMLDivElement,
  clientX: number,
  clientY: number,
  zoom: number
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const originX = rect.left + canvas.clientLeft + CANVAS_PADDING;
  const originY = rect.top + canvas.clientTop + CANVAS_PADDING;
  return {
    x: (clientX - originX) / zoom,
    y: (clientY - originY) / zoom,
  };
};

/** 判断 nodeId 是否为 ancestorId 的后代 */
const isDescendantOf = (
  nodes: Record<string, PageNode>,
  ancestorId: string,
  nodeId: string
): boolean => {
  let current = nodes[nodeId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = nodes[current.parentId];
  }
  return false;
};

/**
 * 从悬停节点向上查找可接受该类型的容器
 * - allowedChildren === undefined：允许任意子节点
 * - allowedChildren 为空数组：叶子节点，继续向上查找
 */
const resolveDropParentId = (
  nodes: Record<string, PageNode>,
  startId: string | null,
  type: NodeType
): string | null => {
  let current = startId ? nodes[startId] : undefined;
  while (current) {
    const allowed = current.constraints.allowedChildren;
    if (allowed === undefined || allowed.includes(type)) return current.id;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return null;
};

/**
 * 计算拖动节点与其他节点的对齐参考线 + 吸附偏移
 */
const computeAlignment = (
  dragLeft: number,
  dragTop: number,
  dragWidth: number,
  dragHeight: number,
  others: Array<{ id: string; left: number; top: number; width: number; height: number }>
): { left: number; top: number; guides: AlignmentGuides } => {
  const dragRight = dragLeft + dragWidth;
  const dragCenterX = dragLeft + dragWidth / 2;
  const dragBottom = dragTop + dragHeight;
  const dragCenterY = dragTop + dragHeight / 2;

  let bestDX = ALIGN_THRESHOLD + 1;
  let snapLeft: number | null = null;
  let bestDY = ALIGN_THRESHOLD + 1;
  let snapTop: number | null = null;

  const verticalGuideSet = new Set<number>();
  const horizontalGuideSet = new Set<number>();

  others.forEach((other) => {
    const oLeft = other.left;
    const oRight = other.left + other.width;
    const oCenterX = other.left + other.width / 2;
    const oTop = other.top;
    const oBottom = other.top + other.height;
    const oCenterY = other.top + other.height / 2;

    const dragXs = [
      { value: dragLeft, line: 0 },
      { value: dragCenterX, line: 1 },
      { value: dragRight, line: 2 },
    ];
    const targetXs = [
      { value: oLeft, line: 0 },
      { value: oCenterX, line: 1 },
      { value: oRight, line: 2 },
    ];
    dragXs.forEach((dx) => {
      targetXs.forEach((tx) => {
        const diff = Math.abs(dx.value - tx.value);
        if (diff < ALIGN_THRESHOLD && diff < bestDX) {
          bestDX = diff;
          snapLeft = tx.value - (dx.value - dragLeft);
          verticalGuideSet.clear();
          verticalGuideSet.add(tx.value);
        } else if (diff < ALIGN_THRESHOLD) {
          verticalGuideSet.add(tx.value);
        }
      });
    });

    const dragYs = [
      { value: dragTop, line: 0 },
      { value: dragCenterY, line: 1 },
      { value: dragBottom, line: 2 },
    ];
    const targetYs = [
      { value: oTop, line: 0 },
      { value: oCenterY, line: 1 },
      { value: oBottom, line: 2 },
    ];
    dragYs.forEach((dy) => {
      targetYs.forEach((ty) => {
        const diff = Math.abs(dy.value - ty.value);
        if (diff < ALIGN_THRESHOLD && diff < bestDY) {
          bestDY = diff;
          snapTop = ty.value - (dy.value - dragTop);
          horizontalGuideSet.clear();
          horizontalGuideSet.add(ty.value);
        } else if (diff < ALIGN_THRESHOLD) {
          horizontalGuideSet.add(ty.value);
        }
      });
    });
  });

  return {
    left: snapLeft !== null ? snapLeft : dragLeft,
    top: snapTop !== null ? snapTop : dragTop,
    guides: {
      horizontal: Array.from(horizontalGuideSet),
      vertical: Array.from(verticalGuideSet),
    },
  };
};

/**
 * 拖拽管理器接口定义
 */
export interface DragManager {
  drop: (element: HTMLDivElement | null) => void;
  isOver: boolean;
  canDrop: boolean;
  dragNodeId: string | null;
  dragTargetNodeId: string | null;
  handleNodeDragStart: (e: React.MouseEvent, nodeId: string) => void;
  handleNodeDragMove: (e: React.MouseEvent) => void;
  handleNodeDragEnd: () => void;
  findNodeAtPosition: (x: number, y: number, nodeMap?: Record<string, PageNode>) => string | null;
}

/**
 * 拖拽管理器配置选项
 */
interface DragManagerOptions {
  /** 是否启用防抖优化 */
  enableDebounce?: boolean;
  /** 防抖延迟时间（毫秒） */
  debounceDelay?: number;
  /** 是否启用边界检查 */
  enableBoundaryCheck?: boolean;
}

/** 一次拖拽会话中缓存的初始位置 */
interface DragSession {
  ids: string[];
  startClientX: number;
  startClientY: number;
  starts: Record<string, { left: number; top: number; width: number; height: number }>;
}

/**
 * 拖拽管理器 - 封装所有拖拽相关的逻辑
 */
export const useDragManager = (
  canvasRef: RefObject<HTMLDivElement>,
  zoom: number,
  options: DragManagerOptions = {}
): DragManager => {
  const {
    enableDebounce = true,
    debounceDelay = 16,
    enableBoundaryCheck = true
  } = options;

  // 从 store 获取状态和操作（按字段精确订阅）
  const nodes = useCanvasStore(s => s.nodes);
  const hoveredNodeId = useCanvasStore(s => s.hoveredNodeId);
  const dragTargetNodeId = useCanvasStore(s => s.dragTargetNodeId);
  const alignmentGuidesVisible = useCanvasStore(s => s.alignmentGuidesVisible);
  const addNode = useCanvasStore(s => s.addNode);
  const hoverNode = useCanvasStore(s => s.hoverNode);
  const setDragTargetNodeId = useCanvasStore(s => s.setDragTargetNodeId);
  const setAlignmentGuides = useCanvasStore(s => s.setAlignmentGuides);
  const updateNode = useCanvasStore(s => s.updateNode);

  // 当前拖拽的主节点 ID（用于样式与状态）
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  // 拖拽会话（包含多选节点及初始位置），用 ref 避免每帧 setState
  const dragSessionRef = useRef<DragSession | null>(null);
  // zoom 用 ref 读取，保证 handleNodeDragStart 保持稳定引用
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const handleNodeDragMoveRef = useRef<(e: React.MouseEvent) => void>(() => {});
  const handleNodeDragEndRef = useRef<() => void>(() => {});

  /**
   * 边界检查 - 确保节点不会移出画布内容区
   */
  const checkBoundary = useCallback((newLeft: number, newTop: number, nodeWidth: number, nodeHeight: number) => {
    if (!enableBoundaryCheck || !canvasRef.current) {
      return { left: newLeft, top: newTop };
    }

    // clientWidth 包含 padding，需要扣除左右 16px；宽高均为未缩放画布坐标
    const canvasWidth = (canvasRef.current.clientWidth - CANVAS_PADDING * 2) / zoom;
    const canvasHeight = (canvasRef.current.clientHeight - CANVAS_PADDING * 2) / zoom;

    const constrainedLeft = Math.max(0, Math.min(newLeft, Math.max(0, canvasWidth - nodeWidth)));
    const constrainedTop = Math.max(0, Math.min(newTop, Math.max(0, canvasHeight - nodeHeight)));

    return { left: constrainedLeft, top: constrainedTop };
  }, [enableBoundaryCheck, canvasRef, zoom]);

  /**
   * 查找指定位置的节点
   * @param x 画布坐标 X（已扣除 padding 并除以 zoom）
   * @param y 画布坐标 Y（已扣除 padding 并除以 zoom）
   */
  const findNodeAtPosition = useCallback((x: number, y: number, _nodeMap?: Record<string, PageNode>): string | null => {
    if (!canvasRef.current) return null;

    const nodeElements = canvasRef.current.querySelectorAll<HTMLElement>('[data-node-id]');
    if (nodeElements.length === 0) return null;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const clientX = canvasRect.left + canvasRef.current.clientLeft + CANVAS_PADDING + x * zoom;
    const clientY = canvasRect.top + canvasRef.current.clientTop + CANVAS_PADDING + y * zoom;

    // 从后往前遍历（DOM 顺序后面的节点视觉上更靠前）
    for (let i = nodeElements.length - 1; i >= 0; i--) {
      const el = nodeElements[i];
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return el.dataset.nodeId || null;
      }
    }

    return null;
  }, [canvasRef, zoom]);

  /**
   * 计算组件在 flex/grid 容器中的插入位置
   * - flex：按主轴方向比较子项中心点
   * - grid：按阅读顺序（先行后列）比较
   * - 非 flex/grid 容器返回 -1（追加到末尾）
   */
  const getDropInsertIndex = useCallback((parentId: string, clientX: number, clientY: number): number => {
    const canvas = canvasRef.current;
    const parentNode = nodes[parentId];
    if (!canvas || !parentNode) return -1;

    const display = parentNode.layout.display;
    if (display !== 'flex' && display !== 'grid') return -1;

    const parentEl = canvas.querySelector<HTMLElement>(`[data-node-id="${parentId}"]`);
    if (!parentEl) return -1;

    const childEls = Array.from(parentEl.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.nodeId
    );
    if (childEls.length === 0) return 0;

    const direction = parentNode.layout.flexDirection || 'row';
    const isColumn = display === 'flex' && (direction === 'column' || direction === 'column-reverse');

    for (let i = 0; i < childEls.length; i++) {
      const rect = childEls[i].getBoundingClientRect();
      if (display === 'grid') {
        // 落在该行上方 → 插到当前项之前；同一行内按水平中线判断
        if (clientY < rect.top) return i;
        if (clientY <= rect.bottom && clientX < rect.left + rect.width / 2) return i;
      } else if (isColumn) {
        if (clientY < rect.top + rect.height / 2) return i;
      } else {
        if (clientX < rect.left + rect.width / 2) return i;
      }
    }

    return childEls.length;
  }, [canvasRef, nodes]);

  /**
   * 判断拖拽项是否可以放置到当前悬停位置
   */
  const canDropToCurrent = useCallback((item: DragItem): boolean => {
    if (!item.componentType) return false;
    if (!hoveredNodeId) return true; // 画布空白处
    return resolveDropParentId(nodes, hoveredNodeId, item.componentType) !== null;
  }, [hoveredNodeId, nodes]);

  /**
   * 处理 hover 事件的核心逻辑（无防抖，由外部包装）
   */
  const handleHoverCore = useCallback((item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => {
    const clientOffset = monitor.getClientOffset();

    if (!clientOffset || !canvasRef.current) {
      hoverNode(null);
      setDragTargetNodeId(null);
      return;
    }

    const { x, y } = toCanvasPoint(canvasRef.current, clientOffset.x, clientOffset.y, zoom);
    const newHoveredNodeId = findNodeAtPosition(x, y, nodes);

    if (newHoveredNodeId !== hoveredNodeId) {
      hoverNode(newHoveredNodeId);
    }

    if (newHoveredNodeId && item.componentType) {
      const dropParentId = resolveDropParentId(nodes, newHoveredNodeId, item.componentType);
      setDragTargetNodeId(dropParentId);
    } else {
      setDragTargetNodeId(null);
    }
  }, [canvasRef, zoom, nodes, hoveredNodeId, hoverNode, setDragTargetNodeId, findNodeAtPosition]);

  // 通过 ref 读取最新 hover 逻辑，避免闭包陷阱
  const handleHoverCoreRef = useRef(handleHoverCore);
  handleHoverCoreRef.current = handleHoverCore;

  // 防抖定时器需要在卸载时清理
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  const hoverHandler = useMemo(() => {
    if (!enableDebounce) return handleHoverCore;
    return (item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        handleHoverCoreRef.current(item, monitor);
        hoverTimerRef.current = null;
      }, debounceDelay);
    };
  }, [enableDebounce, debounceDelay, handleHoverCore]);

  /**
   * 处理组件拖拽放置
   */
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "component",
    canDrop: (item: DragItem) => canDropToCurrent(item),
    drop: (item: DragItem, monitor) => {
      if (!canvasRef.current) return;

      // 优先使用光标位置；getSourceClientOffset 是元素左上角，会额外偏移
      const clientOffset = monitor.getClientOffset() ?? monitor.getSourceClientOffset();
      if (!clientOffset || !item.componentType) return;

      const { x, y } = toCanvasPoint(canvasRef.current, clientOffset.x, clientOffset.y, zoom);
      const parentId = resolveDropParentId(nodes, hoveredNodeId, item.componentType) ?? undefined;

      // flex/grid 容器按落点计算插入顺序，其余容器由 store 追加到末尾
      const insertIndex = parentId
        ? getDropInsertIndex(parentId, clientOffset.x, clientOffset.y)
        : -1;

      try {
        addNode(item.componentType, x, y, parentId, insertIndex >= 0 ? insertIndex : undefined);
      } catch (error) {
        console.error('Failed to add node:', error);
      }
    },
    hover: hoverHandler,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [zoom, nodes, hoveredNodeId, addNode, canDropToCurrent, hoverHandler, getDropInsertIndex]);

  /**
   * 处理节点拖拽开始
   * - 支持 Shift/Ctrl 多选后整体拖动（仅 absolute/fixed 节点）
   * - 稳定引用，避免 CanvasNode memo 失效
   */
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const state = useCanvasStore.getState();
    const node = state.nodes[nodeId];
    if (!node) return;

    // Ctrl/Cmd 点击取消选中后不再启动拖拽
    if ((e.ctrlKey || e.metaKey) && !state.selectedNodeIds.includes(nodeId)) return;

    const selected = state.selectedNodeIds.filter((id) => {
      const n = state.nodes[id];
      if (!n) return false;
      if (n.layout.position !== 'absolute' && n.layout.position !== 'fixed') return false;
      // 祖先也被选中时跳过，避免子树被移动两次
      let parentId = n.parentId;
      while (parentId) {
        if (state.selectedNodeIds.includes(parentId)) return false;
        parentId = state.nodes[parentId]?.parentId;
      }
      return true;
    });
    const ids = selected.includes(nodeId) ? selected : [nodeId];

    const starts: DragSession['starts'] = {};
    ids.forEach((id) => {
      const n = state.nodes[id];
      if (!n) return;
      starts[id] = {
        left: parsePxStrict(n.style.left) ?? 0,
        top: parsePxStrict(n.style.top) ?? 0,
        width: parsePxStrict(n.style.width) ?? 100,
        height: parsePxStrict(n.style.height) ?? 100,
      };
    });

    dragSessionRef.current = {
      ids,
      startClientX: e.clientX,
      startClientY: e.clientY,
      starts,
    };
    setDragNodeId(nodeId);
    state.beginHistoryBatch();
  }, []);

  /**
   * 处理节点拖拽移动（带边界检查 + 对齐吸附）
   * 使用会话初始位置 + 总位移计算，避免同帧多次 mousemove 丢失位移
   */
  const handleNodeDragMove = useCallback((e: React.MouseEvent) => {
    const session = dragSessionRef.current;
    if (!session || !dragNodeId) return;

    const deltaX = (e.clientX - session.startClientX) / zoom;
    const deltaY = (e.clientY - session.startClientY) / zoom;

    // 用容器对象保存回调内的赋值，避免 TS 控制流把 guides 收窄为 null
    const guideHolder: { value: AlignmentGuides | null } = { value: null };

    session.ids.forEach((id) => {
      const node = nodes[id];
      const start = session.starts[id];
      if (!node || !start) return;

      let newLeft = start.left + deltaX;
      let newTop = start.top + deltaY;

      // 仅主节点参与边界检查与对齐吸附
      if (id === dragNodeId) {
        const constrained = checkBoundary(newLeft, newTop, start.width, start.height);
        newLeft = constrained.left;
        newTop = constrained.top;

        if (alignmentGuidesVisible) {
          const others: Array<{ id: string; left: number; top: number; width: number; height: number }> = [];
          Object.values(nodes).forEach((n) => {
            if (session.ids.includes(n.id)) return;
            if (n.layout.position !== 'absolute' && n.layout.position !== 'fixed') return;
            if (n.layout.display === 'none') return;
            // 只在同一父级坐标系内比较，并排除被拖节点的后代
            if (n.parentId !== node.parentId) return;
            if (isDescendantOf(nodes, dragNodeId, n.id)) return;

            const left = parsePxStrict(n.style.left);
            const top = parsePxStrict(n.style.top);
            if (left === null || top === null) return;

            others.push({
              id: n.id,
              left,
              top,
              width: parsePxStrict(n.style.width) ?? 100,
              height: parsePxStrict(n.style.height) ?? 100,
            });
          });

          if (others.length > 0) {
            const result = computeAlignment(newLeft, newTop, start.width, start.height, others);
            newLeft = result.left;
            newTop = result.top;
            guideHolder.value = result.guides;
          }
        }
      }

      updateNode(id, {
        style: {
          ...node.style,
          left: `${newLeft}px`,
          top: `${newTop}px`,
        },
      });
    });

    const guides = guideHolder.value;
    if (guides && (guides.horizontal.length > 0 || guides.vertical.length > 0)) {
      setAlignmentGuides(guides);
    } else if (useCanvasStore.getState().alignmentGuides) {
      setAlignmentGuides(null);
    }
  }, [dragNodeId, nodes, zoom, updateNode, checkBoundary, alignmentGuidesVisible, setAlignmentGuides]);

  /**
   * 处理节点拖拽结束
   */
  const handleNodeDragEnd = useCallback(() => {
    dragSessionRef.current = null;
    setDragNodeId(null);
    setAlignmentGuides(null);
    useCanvasStore.getState().commitHistoryBatch();
  }, [setAlignmentGuides]);

  handleNodeDragMoveRef.current = handleNodeDragMove;
  handleNodeDragEndRef.current = handleNodeDragEnd;

  // 仅在拖拽开始/结束时绑定全局事件
  useEffect(() => {
    if (!dragNodeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleNodeDragMoveRef.current(e as unknown as React.MouseEvent);
    };

    const handleMouseUp = () => {
      handleNodeDragEndRef.current();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragNodeId]);

  return useMemo<DragManager>(() => ({
    drop,
    isOver,
    canDrop,
    dragNodeId,
    dragTargetNodeId,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    findNodeAtPosition,
  }), [drop, isOver, canDrop, dragNodeId, dragTargetNodeId, handleNodeDragStart, handleNodeDragMove, handleNodeDragEnd, findNodeAtPosition]);
};
