import { create } from 'zustand';
import type { CanvasState, PageNode, DragItem } from '../types';
import { NodeType, PreviewMode, LayoutType } from '../types';
import { componentLibrary } from '../data/componentLibrary';

interface CanvasStore extends CanvasState {
  // 节点操作
  addNode: (type: NodeType, x: number, y: number, parentId?: string) => void;
  updateNode: (id: string, updates: Partial<PageNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  
  // 选择操作
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setDragTargetNodeId: (id: string | null) => void;
  
  // 画布操作
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleAlignmentGuides: () => void;
  
  // 拖拽操作
  setDragItem: (item: DragItem | null) => void;
  
  // 预览操作
  setPreviewMode: (mode: PreviewMode) => void;
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  setPreviewScale: (scale: number) => void;
  togglePreview: () => void;
  
  // 重置画布
  resetCanvas: () => void;
}

// 创建默认节点
const createDefaultNode = (type: NodeType, id: string, name: string): PageNode => {
  const component = componentLibrary.find(c => c.type === type);
  const defaultProps = component?.defaultProps || {};
  
  // 合并布局配置
  const mergedLayout = {
    type: LayoutType.BLOCK,
    display: 'block',
    position: 'relative' as const,
    ...defaultProps.layout
  };
  
  // 根据布局类型决定样式
  const supportsDrag = mergedLayout.position === 'absolute' || mergedLayout.position === 'fixed';
  const baseStyle = supportsDrag ? {
    position: 'absolute' as const,
    left: 0,
    top: 0
  } : {};
  
  return {
    id,
    type,
    name,
    layout: mergedLayout,
    style: {
      ...baseStyle,
      ...defaultProps.style
    },
    content: {
      text: '',
      html: '',
      children: [],
      ...defaultProps.content
    },
    events: {},
    dataBinding: {
      type: 'static'
    },
    meta: {
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: 'user',
      tags: [],
      version: 1
    },
    constraints: {
      canDelete: true,
      canDuplicate: true,
      canResize: true,
      allowedChildren: [],
      ...defaultProps.constraints
    }
  };
};

// 创建初始状态
const createInitialState = (): CanvasState => {
  return {
    nodes: {},
    selectedNodeId: null,
    hoveredNodeId: null,
    dragTargetNodeId: null,
    zoom: 1,
    gridVisible: true,
    alignmentGuidesVisible: true,
    
    // 预览相关状态
    previewMode: PreviewMode.EDIT,
    previewDevice: 'desktop',
    previewScale: 1
  };
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...createInitialState(),
  
  // 添加节点
  addNode: (type: NodeType, x: number, y: number, parentId?: string) => {
    console.log('开始添加节点:', { type, x, y, parentId });
    const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const name = `${type}-${Object.keys(get().nodes).length}`;
    
    set((state) => {
      console.log('当前节点数量:', Object.keys(state.nodes).length);
      const newNode = createDefaultNode(type, id, name);
      
      // 只有支持拖动的组件（绝对定位和固定定位）才设置位置属性
      const supportsDrag = newNode.layout.position === 'absolute' || newNode.layout.position === 'fixed';
      if (supportsDrag) {
        newNode.style.left = `${x}px`;
        newNode.style.top = `${y}px`;
      } else {
        // 流布局组件移除位置属性，使用默认文档流
        delete newNode.style.left;
        delete newNode.style.top;
      }
      
      const updatedNodes = { ...state.nodes };
      
      if (parentId && updatedNodes[parentId]) {
        // 添加到父节点
        const parentNode = updatedNodes[parentId];
        const children = parentNode.content.children || [];
        
        // 如果父节点是流布局，调整子节点的样式
        const parentIsFlowLayout = parentNode.layout.position === 'static' || parentNode.layout.position === 'relative';
        if (parentIsFlowLayout) {
          // 流布局的子节点应该使用相对定位，移除绝对定位属性
          delete newNode.style.left;
          delete newNode.style.top;
          delete newNode.style.position;
          
          // 设置适合流布局的样式
          newNode.style.width = '100%';
          newNode.style.marginBottom = '10px';
        }
        
        updatedNodes[parentId] = {
          ...parentNode,
          content: {
            ...parentNode.content,
            children: [...children, id]
          }
        };
      }
      
      updatedNodes[id] = newNode;
      
      console.log('节点添加完成，新节点ID:', id, '总节点数:', Object.keys(updatedNodes).length);
      
      return {
        nodes: updatedNodes,
        selectedNodeId: id
      };
    });
  },
  
  // 更新节点
  updateNode: (id: string, updates: Partial<PageNode>) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;
      
      const updatedNodes = { ...state.nodes };
      updatedNodes[id] = {
        ...node,
        ...updates,
        meta: {
          ...node.meta,
          updatedAt: new Date(),
          version: node.meta.version + 1
        }
      };
      
      return { nodes: updatedNodes };
    });
  },
  
  // 删除节点
  deleteNode: (id: string) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node || !node.constraints.canDelete) return state;
      
      const updatedNodes = { ...state.nodes };
      
      // 递归删除子节点
      const deleteChildren = (nodeId: string) => {
        const childNode = updatedNodes[nodeId];
        if (childNode?.content.children) {
          childNode.content.children.forEach(childId => deleteChildren(childId));
        }
        delete updatedNodes[nodeId];
      };
      
      deleteChildren(id);
      
      // 从父节点中移除
      Object.values(updatedNodes).forEach(parentNode => {
        if (parentNode.content.children?.includes(id)) {
          parentNode.content.children = parentNode.content.children.filter(childId => childId !== id);
        }
      });
      
      return {
        nodes: updatedNodes,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
      };
    });
  },
  
  // 复制节点
  duplicateNode: (id: string) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node || !node.constraints.canDuplicate) return state;
      
      const newId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newNode = {
        ...node,
        id: newId,
        name: `${node.name}-copy`,
        style: {
          ...node.style,
          left: (node.style.left as number) + 20,
          top: (node.style.top as number) + 20
        },
        meta: {
          ...node.meta,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      };
      
      const updatedNodes = { ...state.nodes, [newId]: newNode };
      
      return {
        nodes: updatedNodes,
        selectedNodeId: newId
      };
    });
  },
  
  // 选择节点
  selectNode: (id: string | null) => {
    set({ selectedNodeId: id });
  },
  
  // 悬停节点
  hoverNode: (id: string | null) => {
    console.log('悬停节点:', id);
    set({ hoveredNodeId: id });
  },
  
  // 设置拖拽目标节点
  setDragTargetNodeId: (id: string | null) => {
    console.log('拖拽目标节点:', id);
    set({ dragTargetNodeId: id });
  },
  
  // 设置缩放
  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.1, Math.min(3, zoom)) });
  },
  
  // 切换网格显示
  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },
  
  // 切换对齐参考线
  toggleAlignmentGuides: () => {
    set((state) => ({ alignmentGuidesVisible: !state.alignmentGuidesVisible }));
  },
  
  // 设置拖拽项
  setDragItem: (item: DragItem | null) => {
    // 这里可以处理拖拽逻辑
    console.log('Drag item:', item);
  },
  
  // 重置画布
  resetCanvas: () => {
    set(createInitialState());
  },
  
  // 预览操作
  setPreviewMode: (mode: PreviewMode) => {
    set({ previewMode: mode });
  },
  
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => {
    set({ previewDevice: device });
  },
  
  setPreviewScale: (scale: number) => {
    set({ previewScale: Math.max(0.1, Math.min(2, scale)) });
  },
  
  togglePreview: () => {
    set((state) => ({
      previewMode: state.previewMode === PreviewMode.EDIT ? PreviewMode.PREVIEW : PreviewMode.EDIT
    }));
  }
}));