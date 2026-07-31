import React, { useState, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import type { DragItem, PageNode } from '../types';
import type { RefObject } from 'react';
import { NodeType } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';

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

  // 从store获取状态和操作
  const { nodes, hoveredNodeId, dragTargetNodeId, addNode, selectNode, hoverNode, setDragTargetNodeId, updateNode } = useCanvasStore();

  // 节点拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  
  // 性能优化相关
  const lastHoverTimeRef = useRef<number>(0);
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
   * @param x 鼠标在画布中的X坐标
   * @param y 鼠标在画布中的Y坐标
   * @param nodeMap 节点映射表
   * @returns 找到的节点ID，如果没有找到则返回null
   */
  const findNodeAtPosition = useCallback((x: number, y: number, nodeMap: Record<string, PageNode>): string | null => {
    // 性能优化：使用 requestAnimationFrame 节流而非返回旧值
    const now = Date.now();
    if (enableDebounce && now - lastHoverTimeRef.current < debounceDelay) {
      // 仍执行查找，但不更新时间戳，避免阻塞悬停反馈
    }
    lastHoverTimeRef.current = now;

    /**
     * 递归查找节点树中的节点
     */
    const findNodeInTree = (nodeId: string, x: number, y: number, nodeMap: Record<string, PageNode>): string | null => {
      const node = nodeMap[nodeId];
      if (!node) return null;

      // 尝试获取节点的实际DOM元素尺寸
      const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
      
      if (nodeElement) {
        // 使用实际DOM元素尺寸进行精确检测
        const rect = nodeElement.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
          // 转换为相对于画布的坐标
          const left = rect.left - canvasRect.left + (canvasRef.current?.scrollLeft || 0);
          const top = rect.top - canvasRect.top + (canvasRef.current?.scrollTop || 0);
          const width = rect.width;
          const height = rect.height;
          
          const isInside = x >= left && x <= left + width && y >= top && y <= top + height;
          
          if (isInside) {
            // 检查子节点（深度优先搜索）
            if (node.content.children && node.content.children.length > 0) {
              for (const childId of node.content.children) {
                const childResult = findNodeInTree(childId, x, y, nodeMap);
                if (childResult) return childResult;
              }
            }
            return nodeId;
          }
        }
      } else {
        // 备用方法：如果无法获取DOM元素，使用样式计算
        let left = 0;
        let top = 0;
        let width = 100;
        let height = 100;

        // 根据布局类型计算位置
        if (node.layout.position === 'static' || node.layout.position === 'relative') {
          // 流布局节点：需要计算累积位置
          
          // 计算宽度
          if (node.style.width) {
            if (typeof node.style.width === 'string' && node.style.width.includes('%')) {
              const canvasWidth = canvasRef.current?.clientWidth || 722;
              width = (parseFloat(node.style.width) / 100) * canvasWidth;
            } else {
              width = parseFloat(String(node.style.width));
            }
          }
          
          // 计算高度 - 使用更合理的默认值
          if (node.style.height) {
            if (typeof node.style.height === 'string' && node.style.height === 'auto') {
              // 对于auto高度，根据内容类型使用不同的默认值
              switch (node.type) {
                case NodeType.SECTION:
                  height = 300; // 内容区块默认高度
                  break;
                case NodeType.CONTAINER:
                  height = 200; // 容器默认高度
                  break;
                default:
                  height = 100; // 其他组件默认高度
              }
            } else if (typeof node.style.height === 'string' && node.style.height.includes('%')) {
              const canvasHeight = canvasRef.current?.clientHeight || 769;
              height = (parseFloat(node.style.height) / 100) * canvasHeight;
            } else {
              height = parseFloat(String(node.style.height));
            }
          }
          
          // 流布局节点在文档流中，需要计算累积的top位置
          let accumulatedTop = 0;
          const rootNodeIds = Object.keys(nodeMap).filter(id => {
            return !Object.values(nodeMap).some(parentNode => 
              parentNode.content.children && parentNode.content.children.includes(id)
            );
          });
          
          for (const rootId of rootNodeIds) {
            if (rootId === nodeId) break;
            const currentNode = nodeMap[rootId];
            if (currentNode.layout.position === 'static' || currentNode.layout.position === 'relative') {
              let currentHeight = 100;
              if (currentNode.style.height) {
                if (typeof currentNode.style.height === 'string' && currentNode.style.height === 'auto') {
                  switch (currentNode.type) {
                    case NodeType.SECTION:
                      currentHeight = 300;
                      break;
                    case NodeType.CONTAINER:
                      currentHeight = 200;
                      break;
                    default:
                      currentHeight = 100;
                  }
                } else if (typeof currentNode.style.height === 'string' && currentNode.style.height.includes('%')) {
                  const canvasHeight = canvasRef.current?.clientHeight || 769;
                  currentHeight = (parseFloat(currentNode.style.height) / 100) * canvasHeight;
                } else {
                  currentHeight = parseFloat(String(currentNode.style.height));
                }
              }
              accumulatedTop += currentHeight + 20; // 加上margin
            }
          }
          
          top = accumulatedTop;
        } else {
          // 绝对定位节点：使用样式中的位置
          left = node.style.left ? parseFloat(String(node.style.left)) : 0;
          top = node.style.top ? parseFloat(String(node.style.top)) : 0;
          
          if (node.style.width) {
            if (typeof node.style.width === 'string' && node.style.width.includes('%')) {
              const canvasWidth = canvasRef.current?.clientWidth || 722;
              width = (parseFloat(node.style.width) / 100) * canvasWidth;
            } else {
              width = parseFloat(String(node.style.width));
            }
          }
          
          if (node.style.height) {
            if (typeof node.style.height === 'string' && node.style.height === 'auto') {
              height = 200;
            } else if (typeof node.style.height === 'string' && node.style.height.includes('%')) {
              const canvasHeight = canvasRef.current?.clientHeight || 769;
              height = (parseFloat(node.style.height) / 100) * canvasHeight;
            } else {
              height = parseFloat(String(node.style.height));
            }
          }
        }
        
        const nodeRect = { left, top, width, height };
        const isInside = x >= nodeRect.left && x <= nodeRect.left + nodeRect.width && y >= nodeRect.top && y <= nodeRect.top + nodeRect.height;
        
        if (isInside) {
          // 检查子节点
          if (node.content.children && node.content.children.length > 0) {
            for (const childId of node.content.children) {
              const childResult = findNodeInTree(childId, x, y, nodeMap);
              if (childResult) return childResult;
            }
          }
          return nodeId;
        }
      }
      
      return null;
    };

    // 从根节点开始查找
    const rootNodeIds = Object.keys(nodeMap).filter(id => {
      return !Object.values(nodeMap).some(parentNode => 
        parentNode.content.children && parentNode.content.children.includes(id)
      );
    });

    for (const rootId of rootNodeIds) {
      const result = findNodeInTree(rootId, x, y, nodeMap);
      if (result) return result;
    }

    return null;
  }, [canvasRef, enableDebounce, debounceDelay, hoveredNodeId]);

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
   * 处理节点拖拽移动（带边界检查）
   */
  const handleNodeDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragNodeId) return;

      const node = nodes && nodes[dragNodeId];
      if (!node) return;

      const deltaX = (e.clientX - dragStartPos.x) / zoom;
      const deltaY = (e.clientY - dragStartPos.y) / zoom;

      const newLeft = parseFloat(node.style.left?.toString() || "0") + deltaX;
      const newTop = parseFloat(node.style.top?.toString() || "0") + deltaY;

      // 边界检查
      const nodeWidth = parseFloat(node.style.width?.toString() || "100");
      const nodeHeight = parseFloat(node.style.height?.toString() || "100");
      
      const constrainedPos = checkBoundary(newLeft, newTop, nodeWidth, nodeHeight);

      try {
        updateNode(dragNodeId, {
          style: {
            ...node.style,
            left: `${constrainedPos.left}px`,
            top: `${constrainedPos.top}px`,
          },
        });
      } catch (error) {
        console.error('Failed to update node position:', error);
      }

      setDragStartPos({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragNodeId, dragStartPos, nodes, zoom, updateNode, checkBoundary]
  );

  /**
   * 处理节点拖拽结束
   */
  const handleNodeDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
  }, []);

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

  return {
    drop,
    isOver,
    canDrop,
    dragNodeId,
    dragTargetNodeId,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    findNodeAtPosition,
  };
};