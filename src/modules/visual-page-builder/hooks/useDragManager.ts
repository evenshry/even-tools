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
   * 防抖函数 - 优化频繁触发的事件
   */
  const debounce = useCallback(<T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
    return (...args: T) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => fn(...args), delay);
    };
  }, []);

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
    // 性能优化：避免过于频繁的检测
    const now = Date.now();
    if (enableDebounce && now - lastHoverTimeRef.current < debounceDelay) {
      return hoveredNodeId;
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
   * 处理组件拖拽放置
   */
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "component",
    
    /**
     * 拖拽放置处理函数
     */
    drop: (item: DragItem, monitor) => {
      // 检查React-DnD是否已完全初始化
      if (!canvasRef.current) {
        console.warn('Canvas ref not available for drop operation');
        return;
      }
      
      const offset = monitor.getSourceClientOffset();

      if (offset && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // 转换为画布相对坐标，考虑缩放比例
        const x = (offset.x - canvasRect.left) / zoom;
        const y = (offset.y - canvasRect.top) / zoom;

        if (item.componentType) {
          // 检查是否有悬停的父节点
          let parentId: string | undefined = undefined;
          if (hoveredNodeId && nodes && nodes[hoveredNodeId]) {
            const hoveredNode = nodes[hoveredNodeId];
            // 检查悬停节点是否允许添加该类型的子节点
            const allowedChildren = hoveredNode.constraints.allowedChildren || [];
            if (allowedChildren.includes(item.componentType)) {
              parentId = hoveredNodeId;
            }
          }

          // 如果没有合适的父节点，直接添加到画布（作为根节点）
          try {
            addNode(item.componentType, x, y, parentId);
          } catch (error) {
            console.error('Failed to add node:', error);
          }
        }
      }
    },
    
    /**
     * 拖拽悬停处理函数（防抖优化）
     */
    hover: enableDebounce 
      ? debounce((item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => {
          const clientOffset = monitor.getClientOffset();
          
          if (!clientOffset || !canvasRef.current) {
            hoverNode(null);
            setDragTargetNodeId(null);
            return;
          }

          const canvasRect = canvasRef.current.getBoundingClientRect();
          
          // 计算鼠标在画布中的相对位置
          const x = (clientOffset.x - canvasRect.left) / zoom;
          const y = (clientOffset.y - canvasRect.top) / zoom;
          
          // 查找鼠标位置下的节点
          const nodeMap = nodes;
          const newHoveredNodeId = findNodeAtPosition(x, y, nodeMap);
          
          if (newHoveredNodeId !== hoveredNodeId) {
            hoverNode(newHoveredNodeId);
          }
          
          // 检查是否可以放置到悬停的节点
          if (newHoveredNodeId && item.componentType && nodes && nodes[newHoveredNodeId]) {
            const hoveredNode = nodes[newHoveredNodeId];
            // 检查悬停节点是否允许添加该类型的子节点
            const allowedChildren = hoveredNode.constraints.allowedChildren || [];
            const canDropToNode = allowedChildren.includes(item.componentType);
            
            if (canDropToNode) {
              setDragTargetNodeId(newHoveredNodeId);
            } else {
              setDragTargetNodeId(null);
            }
          } else {
            setDragTargetNodeId(null);
          }
        }, debounceDelay)
      : (item: DragItem, monitor: { getClientOffset: () => { x: number; y: number } | null }) => {
          const clientOffset = monitor.getClientOffset();
          
          if (!clientOffset || !canvasRef.current) {
            hoverNode(null);
            setDragTargetNodeId(null);
            return;
          }

          const canvasRect = canvasRef.current.getBoundingClientRect();
          
          // 计算鼠标在画布中的相对位置
          const x = (clientOffset.x - canvasRect.left) / zoom;
          const y = (clientOffset.y - canvasRect.top) / zoom;
          
          // 查找鼠标位置下的节点
          const nodeMap = nodes;
          const newHoveredNodeId = findNodeAtPosition(x, y, nodeMap);
          
          if (newHoveredNodeId !== hoveredNodeId) {
            hoverNode(newHoveredNodeId);
          }
          
          // 检查是否可以放置到悬停的节点
          if (newHoveredNodeId && item.componentType && nodes && nodes[newHoveredNodeId]) {
            const hoveredNode = nodes[newHoveredNodeId];
            // 检查悬停节点是否允许添加该类型的子节点
            const allowedChildren = hoveredNode.constraints.allowedChildren || [];
            const canDropToNode = allowedChildren.includes(item.componentType);
            
            // 更新拖拽目标状态
            setDragTargetNodeId(canDropToNode ? newHoveredNodeId : null);
          } else {
            setDragTargetNodeId(null);
          }
        },
    
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [zoom, nodes, hoveredNodeId, addNode, hoverNode, setDragTargetNodeId, findNodeAtPosition, enableDebounce, debounce, debounceDelay]);

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