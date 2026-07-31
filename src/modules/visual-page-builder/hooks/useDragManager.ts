import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import type { DragItem, PageNode, AlignmentGuides } from '../types';
import type { RefObject } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';

/**
 * 解析像素值（"100px" / 100 / undefined → number）
 */
const parsePx = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : 0;
};

/** 对齐吸附阈值（画布坐标，未缩放） */
const ALIGN_THRESHOLD = 5;

/**
 * 计算拖动节点与其他节点的对齐参考线 + 吸附偏移
 *
 * 参考线类型：
 * - 垂直方向：left / center / right 三条 x 坐标
 * - 水平方向：top / middle / bottom 三条 y 坐标
 *
 * 当被拖节点某条线与任一目标节点的某条线差值 < ALIGN_THRESHOLD 时：
 * 1. 吸附：将 left/top 修正到对齐位置
 * 2. 显示参考线：在目标位置绘制红色线
 *
 * @returns { left, top, guides } 吸附后的 left/top 与应显示的参考线
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

  // 候选吸附：记录最小的差值及对应的吸附后位置
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

    // 垂直方向：dragLeft / dragCenterX / dragRight 与 oLeft / oCenterX / oRight 对齐
    const dragXs: Array<{ value: number; line: number }> = [
      { value: dragLeft, line: 0 },
      { value: dragCenterX, line: 1 },
      { value: dragRight, line: 2 },
    ];
    const targetXs: Array<{ value: number; line: number }> = [
      { value: oLeft, line: 0 },
      { value: oCenterX, line: 1 },
      { value: oRight, line: 2 },
    ];
    dragXs.forEach((dx) => {
      targetXs.forEach((tx) => {
        const diff = Math.abs(dx.value - tx.value);
        if (diff < ALIGN_THRESHOLD && diff < bestDX) {
          bestDX = diff;
          // 吸附后的 left = 目标 x - (dx.value - dragLeft)
          snapLeft = tx.value - (dx.value - dragLeft);
          verticalGuideSet.clear();
          verticalGuideSet.add(tx.value);
        } else if (diff < ALIGN_THRESHOLD) {
          verticalGuideSet.add(tx.value);
        }
      });
    });

    // 水平方向
    const dragYs: Array<{ value: number; line: number }> = [
      { value: dragTop, line: 0 },
      { value: dragCenterY, line: 1 },
      { value: dragBottom, line: 2 },
    ];
    const targetYs: Array<{ value: number; line: number }> = [
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
  /** React-DnD drop引用，用于绑定拖拽区域 */
  drop: (element: HTMLDivElement | null) => void;
  /** 是否正在拖拽悬停在画布上 */
  isOver: boolean;
  /** 是否可以放置到当前悬停位置 */
  canDrop: boolean;
  /** 当前正在拖拽的节点ID */
  dragNodeId: string | null;
  /** 当前悬停的拖拽目标节点ID */
  dragTargetNodeId: string | null;
  /** 处理节点拖拽开始 */
  handleNodeDragStart: (e: React.MouseEvent, nodeId: string) => void;
  /** 处理节点拖拽移动 */
  handleNodeDragMove: (e: React.MouseEvent) => void;
  /** 处理节点拖拽结束 */
  handleNodeDragEnd: () => void;
  /** 查找指定位置的节点 */
  findNodeAtPosition: (x: number, y: number, nodeMap: Record<string, PageNode>) => string | null;
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
  /** 是否启用拖拽限制 */
  enableDragConstraints?: boolean;
}

/**
 * 拖拽管理器 - 封装所有拖拽相关的逻辑
 * 
 * @param canvasRef 画布容器的引用
 * @param zoom 当前画布缩放比例
 * @param options 配置选项
 * @returns 拖拽管理器实例
 */
export const useDragManager = (
  canvasRef: RefObject<HTMLDivElement>,
  zoom: number,
  options: DragManagerOptions = {}
): DragManager => {
  const {
    enableDebounce = true,
    debounceDelay = 16, // 约60fps
    enableBoundaryCheck = true
  } = options;

  // 从store获取状态和操作（按字段精确订阅，避免任意 store 变化触发重渲染）
  const nodes = useCanvasStore(s => s.nodes);
  const hoveredNodeId = useCanvasStore(s => s.hoveredNodeId);
  const dragTargetNodeId = useCanvasStore(s => s.dragTargetNodeId);
  const alignmentGuidesVisible = useCanvasStore(s => s.alignmentGuidesVisible);
  const addNode = useCanvasStore(s => s.addNode);
  const selectNode = useCanvasStore(s => s.selectNode);
  const hoverNode = useCanvasStore(s => s.hoverNode);
  const setDragTargetNodeId = useCanvasStore(s => s.setDragTargetNodeId);
  const setAlignmentGuides = useCanvasStore(s => s.setAlignmentGuides);
  const updateNode = useCanvasStore(s => s.updateNode);

  // 节点拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  
  // 性能优化相关
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 边界检查 - 确保节点不会移出画布
   */
  const checkBoundary = useCallback((newLeft: number, newTop: number, nodeWidth: number, nodeHeight: number) => {
    if (!enableBoundaryCheck || !canvasRef.current) {
      return { left: newLeft, top: newTop };
    }

    const canvasWidth = canvasRef.current.clientWidth / zoom;
    const canvasHeight = canvasRef.current.clientHeight / zoom;

    // 确保节点不会移出画布边界
    const constrainedLeft = Math.max(0, Math.min(newLeft, canvasWidth - nodeWidth));
    const constrainedTop = Math.max(0, Math.min(newTop, canvasHeight - nodeHeight));

    return { left: constrainedLeft, top: constrainedTop };
  }, [enableBoundaryCheck, canvasRef, zoom]);

  /**
   * 查找指定位置的节点
   *
   * 性能优化方案：
   * 1. 批量 DOM 查询（querySelectorAll 一次），避免每个节点单独 querySelector
   * 2. 直接读 getBoundingClientRect，浏览器已计算累积位置
   * 3. 按 DOM 顺序从后往前命中测试（后渲染的节点在视觉上更靠前）
   *
   * @param x 鼠标在画布中的X坐标（已除以 zoom）
   * @param y 鼠标在画布中的Y坐标（已除以 zoom）
   * @param nodeMap 节点映射表（保留参数兼容性，内部未使用）
   * @returns 找到的节点ID，如果没有找到则返回null
   */
  const findNodeAtPosition = useCallback((x: number, y: number, _nodeMap?: Record<string, PageNode>): string | null => {
    if (!canvasRef.current) return null;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    // 鼠标在屏幕中的坐标
    const clientX = canvasRect.left + x * zoom + (canvasRef.current.scrollLeft || 0);
    const clientY = canvasRect.top + y * zoom + (canvasRef.current.scrollTop || 0);

    // 一次性查询所有节点 DOM
    const nodeElements = canvasRef.current.querySelectorAll<HTMLElement>('[data-node-id]');
    if (nodeElements.length === 0) return null;

    // 从后往前遍历（DOM 顺序后面的节点视觉上更靠前）
    for (let i = nodeElements.length - 1; i >= 0; i--) {
      const el = nodeElements[i];
      const rect = el.getBoundingClientRect();
      // 命中测试
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return el.dataset.nodeId || null;
      }
    }

    return null;
  }, [canvasRef, zoom]);

  /**
   * 判断拖拽项是否可以放置到当前悬停位置
   * - 没有悬停目标（落到画布空白）：允许，作为根节点
   * - 悬停节点允许该类型子节点：允许
   * - 否则：禁止
   */
  const canDropToCurrent = useCallback((item: DragItem): boolean => {
    if (!item.componentType) return false;
    if (!hoveredNodeId) return true; // 画布空白处
    const hovered = nodes?.[hoveredNodeId];
    if (!hovered) return true;
    const allowed = hovered.constraints.allowedChildren || [];
    return allowed.length === 0 ? false : allowed.includes(item.componentType);
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

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (clientOffset.x - canvasRect.left) / zoom;
    const y = (clientOffset.y - canvasRect.top) / zoom;

    const newHoveredNodeId = findNodeAtPosition(x, y, nodes);

    if (newHoveredNodeId !== hoveredNodeId) {
      hoverNode(newHoveredNodeId);
    }

    // 同步更新拖拽目标状态（与 canDrop 保持一致）
    if (newHoveredNodeId && item.componentType && nodes?.[newHoveredNodeId]) {
      const hovered = nodes[newHoveredNodeId];
      const allowed = hovered.constraints.allowedChildren || [];
      const canDropToNode = allowed.length > 0 && allowed.includes(item.componentType);
      setDragTargetNodeId(canDropToNode ? newHoveredNodeId : null);
    } else {
      setDragTargetNodeId(null);
    }
  }, [canvasRef, zoom, nodes, hoveredNodeId, hoverNode, setDragTargetNodeId, findNodeAtPosition]);

  /**
   * 防抖化的 hover 处理器
   * 使用 useRef 缓存防抖函数，避免每次依赖变化时重建导致防抖失效
   */
  const debouncedHoverRef = useRef<((item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => void) | null>(null);
  if (debouncedHoverRef.current === null) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastItem: DragItem | null = null;
    let lastMonitor: { getClientOffset: () => { x: number; y: number } | null } | null = null;
    debouncedHoverRef.current = (item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => {
      lastItem = item;
      lastMonitor = monitor;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (lastItem && lastMonitor) {
          handleHoverCore(lastItem, lastMonitor);
        }
        timer = null;
      }, debounceDelay);
    };
  }

  /**
   * 处理组件拖拽放置
   */
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "component",

    /**
     * canDrop 谓词 - 决定拖拽时是否显示"可放置"状态
     */
    canDrop: (item: DragItem) => canDropToCurrent(item),

    /**
     * 拖拽放置处理函数
     */
    drop: (item: DragItem, monitor) => {
      if (!canvasRef.current) return;

      const offset = monitor.getSourceClientOffset();
      if (!offset || !item.componentType) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x = (offset.x - canvasRect.left) / zoom;
      const y = (offset.y - canvasRect.top) / zoom;

      // 检查是否有可放置的父节点
      let parentId: string | undefined = undefined;
      if (hoveredNodeId && nodes?.[hoveredNodeId]) {
        const hovered = nodes[hoveredNodeId];
        const allowed = hovered.constraints.allowedChildren || [];
        if (allowed.includes(item.componentType)) {
          parentId = hoveredNodeId;
        }
      }

      try {
        addNode(item.componentType, x, y, parentId);
      } catch (error) {
        console.error('Failed to add node:', error);
      }
    },

    /**
     * 拖拽悬停处理函数
     */
    hover: enableDebounce
      ? debouncedHoverRef.current!
      : handleHoverCore,

    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [zoom, nodes, hoveredNodeId, addNode, hoverNode, setDragTargetNodeId, findNodeAtPosition, enableDebounce, debounceDelay, canDropToCurrent, handleHoverCore]);

  /**
   * 处理节点拖拽开始
   */
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // 验证节点是否存在
    if (!nodes || !nodes[nodeId]) {
      console.warn(`Node with id ${nodeId} not found`);
      return;
    }
    
    setIsDragging(true);
    setDragNodeId(nodeId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    selectNode(nodeId);
  }, [selectNode, nodes]);

  /**
   * 处理节点拖拽移动（带边界检查 + 对齐吸附）
   */
  const handleNodeDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragNodeId) return;

      const node = nodes && nodes[dragNodeId];
      if (!node) return;

      const deltaX = (e.clientX - dragStartPos.x) / zoom;
      const deltaY = (e.clientY - dragStartPos.y) / zoom;

      const nodeWidth = parsePx(node.style.width) || 100;
      const nodeHeight = parsePx(node.style.height) || 100;
      let newLeft = parsePx(node.style.left) + deltaX;
      let newTop = parsePx(node.style.top) + deltaY;

      // 边界检查
      const constrainedPos = checkBoundary(newLeft, newTop, nodeWidth, nodeHeight);
      newLeft = constrainedPos.left;
      newTop = constrainedPos.top;

      // 对齐吸附 + 参考线（仅在对齐参考线开关打开时计算）
      let guides: AlignmentGuides | null = null;
      if (alignmentGuidesVisible && nodes) {
        const others: Array<{ id: string; left: number; top: number; width: number; height: number }> = [];
        Object.values(nodes).forEach((n) => {
          if (n.id === dragNodeId) return;
          // 仅绝对/固定定位的可见节点参与对齐
          if (n.layout.position !== 'absolute' && n.layout.position !== 'fixed') return;
          if (n.layout.display === 'none') return;
          others.push({
            id: n.id,
            left: parsePx(n.style.left),
            top: parsePx(n.style.top),
            width: parsePx(n.style.width) || 100,
            height: parsePx(n.style.height) || 100,
          });
        });

        if (others.length > 0) {
          const result = computeAlignment(newLeft, newTop, nodeWidth, nodeHeight, others);
          newLeft = result.left;
          newTop = result.top;
          guides = result.guides;
        }
      }

      try {
        updateNode(dragNodeId, {
          style: {
            ...node.style,
            left: `${newLeft}px`,
            top: `${newTop}px`,
          },
        });
        // 同步参考线（仅当有参考线时设置；无则清空）
        if (guides && (guides.horizontal.length > 0 || guides.vertical.length > 0)) {
          setAlignmentGuides(guides);
        } else if (useCanvasStore.getState().alignmentGuides) {
          setAlignmentGuides(null);
        }
      } catch (error) {
        console.error('Failed to update node position:', error);
      }

      setDragStartPos({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragNodeId, dragStartPos, nodes, zoom, updateNode, checkBoundary, alignmentGuidesVisible, setAlignmentGuides]
  );

  /**
   * 处理节点拖拽结束
   */
  const handleNodeDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
    // 清空对齐参考线
    if (useCanvasStore.getState().alignmentGuides) {
      setAlignmentGuides(null);
    }
  }, [setAlignmentGuides]);

  // 添加全局鼠标事件监听器
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleNodeDragMove(e as unknown as React.MouseEvent);
    };

    const handleMouseUp = () => {
      handleNodeDragEnd();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      
      // 清理防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDragging, handleNodeDragMove, handleNodeDragEnd]);

  // 使用 useMemo 稳定返回对象引用，避免每帧新建导致子组件 memo 失效
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