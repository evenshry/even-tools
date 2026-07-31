import { create } from 'zustand';
import type { CanvasState, PageNode, DragItem } from '../types';
import { NodeType, PreviewMode, LayoutType } from '../types';
import { componentLibrary } from '../data/componentLibrary';
import { pageDB, DEFAULT_PAGE_ID, DEFAULT_PAGE_NAME, type SavedPage } from './usePagePersistence';

/**
 * 解析像素值（支持 "100px" / 100 / undefined）
 */
const parsePx = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * 生成唯一节点 ID
 */
const generateNodeId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `node-${crypto.randomUUID()}`;
  }
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * 历史快照
 */
interface Snapshot {
  nodes: Record<string, PageNode>;
  selectedNodeId: string | null;
  timestamp: number;
}

/**
 * 历史栈上限
 */
const HISTORY_LIMIT = 50;

/**
 * 拖拽期间连续 style 变更的合并窗口（ms）
 */
const HISTORY_MERGE_WINDOW = 500;

/**
 * 创建历史快照（深拷贝当前 nodes + selectedNodeId）
 */
const createSnapshot = (nodes: Record<string, PageNode>, selectedNodeId: string | null): Snapshot => {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    selectedNodeId,
    timestamp: Date.now()
  };
};

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

  // 持久化操作
  pageId: string;
  pageName: string;
  isDirty: boolean;
  isSaving: boolean;
  loadPage: (id?: string) => Promise<void>;
  saveCurrentPage: () => Promise<void>;
  listPages: () => Promise<SavedPage[]>;
  deletePage: (id: string) => Promise<void>;
  loadNodes: (nodes: Record<string, PageNode>) => void;
  markDirty: () => void;

  // 撤销/重做
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  beginHistoryBatch: () => void;
  commitHistoryBatch: () => void;
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

// 持久化初始字段
const persistenceInitialState = {
  pageId: DEFAULT_PAGE_ID,
  pageName: DEFAULT_PAGE_NAME,
  isDirty: false,
  isSaving: false,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
  canUndo: false,
  canRedo: false
};

/**
 * 将节点树序列化为可存储的纯对象（剥离函数等不可序列化字段）
 */
const serializeNodes = (nodes: Record<string, PageNode>): Record<string, PageNode> => {
  const result: Record<string, PageNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    result[id] = {
      ...node,
      // events 字段目前可能含函数，序列化时清空（T2.5 重构为可序列化配置）
      events: {},
      meta: {
        ...node.meta,
        createdAt: node.meta.createdAt instanceof Date ? node.meta.createdAt : new Date(node.meta.createdAt as unknown as string),
        updatedAt: node.meta.updatedAt instanceof Date ? node.meta.updatedAt : new Date(node.meta.updatedAt as unknown as string),
      }
    };
  }
  return result;
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...createInitialState(),
  ...persistenceInitialState,
  
  // 添加节点
  addNode: (type: NodeType, x: number, y: number, parentId?: string) => {
    const id = generateNodeId();
    const name = `${type}-${Object.keys(get().nodes).length}`;

    set((state) => {
      const newNode = createDefaultNode(type, id, name);

      const supportsDrag = newNode.layout.position === 'absolute' || newNode.layout.position === 'fixed';
      if (supportsDrag) {
        newNode.style.left = `${x}px`;
        newNode.style.top = `${y}px`;
      } else {
        delete newNode.style.left;
        delete newNode.style.top;
      }

      const updatedNodes = { ...state.nodes };

      if (parentId && updatedNodes[parentId]) {
        const parentNode = updatedNodes[parentId];
        const children = parentNode.content.children || [];

        const parentIsFlowLayout = parentNode.layout.position === 'static' || parentNode.layout.position === 'relative';
        if (parentIsFlowLayout) {
          delete newNode.style.left;
          delete newNode.style.top;
          delete newNode.style.position;
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

      // 推入历史快照
      const past = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

      return {
        nodes: updatedNodes,
        selectedNodeId: id,
        isDirty: true,
        past,
        future: [],
        canUndo: true,
        canRedo: false
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

      // 历史合并：若上次快照在合并窗口内且同为 updateNode，则不新增快照
      const now = Date.now();
      const lastSnapshot = state.past[state.past.length - 1];
      const shouldMerge = lastSnapshot && (now - lastSnapshot.timestamp) < HISTORY_MERGE_WINDOW;
      const past = shouldMerge
        ? state.past
        : [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

      return {
        nodes: updatedNodes,
        isDirty: true,
        past,
        future: shouldMerge ? state.future : [],
        canUndo: true,
        canRedo: shouldMerge ? state.canRedo : false
      };
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
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        isDirty: true,
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false
      };
    });
  },

  // 复制节点（深拷贝，递归复制子节点）
  duplicateNode: (id: string) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node || !node.constraints.canDuplicate) return state;

      const updatedNodes = { ...state.nodes };

      // 递归复制节点及其所有子节点，返回新节点 ID
      const cloneNode = (sourceId: string, newName?: string): string => {
        const source = updatedNodes[sourceId];
        if (!source) return '';

        const newId = generateNodeId();
        const isAbsolute = source.layout.position === 'absolute' || source.layout.position === 'fixed';

        // 计算偏移：绝对定位节点偏移 20px，流布局节点不设置 left/top
        const style = { ...source.style };
        if (isAbsolute) {
          style.left = `${parsePx(source.style.left) + 20}px`;
          style.top = `${parsePx(source.style.top) + 20}px`;
        } else {
          delete style.left;
          delete style.top;
        }

        // 递归克隆子节点，建立新的 children 引用
        const oldChildren = source.content.children || [];
        const newChildren: string[] = oldChildren.map(childId => cloneNode(childId));

        const newNode: PageNode = {
          ...source,
          id: newId,
          name: newName || `${source.name}-copy`,
          style,
          content: {
            ...source.content,
            children: newChildren
          },
          meta: {
            ...source.meta,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          }
        };

        updatedNodes[newId] = newNode;
        return newId;
      };

      const newRootId = cloneNode(id);

      return {
        nodes: updatedNodes,
        selectedNodeId: newRootId,
        isDirty: true,
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false
      };
    });
  },
  
  // 选择节点
  selectNode: (id: string | null) => {
    set({ selectedNodeId: id });
  },
  
  // 悬停节点
  hoverNode: (id: string | null) => {
    set({ hoveredNodeId: id });
  },

  // 设置拖拽目标节点
  setDragTargetNodeId: (id: string | null) => {
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
  
  // 设置拖拽项（预留接口，暂无使用）
  setDragItem: (_item: DragItem | null) => {
    // 预留：未来用于跨画布拖拽或剪贴板
  },
  
  // 重置画布
  resetCanvas: () => {
    set((state) => ({
      ...createInitialState(),
      isDirty: true,
      past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
      future: [],
      canUndo: true,
      canRedo: false
    }));
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
  },

  // ===== 持久化操作 =====

  // 标记为脏数据（需要保存）
  markDirty: () => {
    set({ isDirty: true });
  },

  // 加载节点到画布（替换当前画布）
  loadNodes: (nodes: Record<string, PageNode>) => {
    set({
      nodes,
      selectedNodeId: null,
      hoveredNodeId: null,
      dragTargetNodeId: null,
      isDirty: false
    });
  },

  // 加载页面（默认加载最近的页面）
  loadPage: async (id?: string) => {
    try {
      let page: SavedPage | undefined;
      if (id) {
        page = await pageDB.getPage(id);
      } else {
        page = await pageDB.getLatestPage();
      }

      if (page) {
        set({
          pageId: page.id,
          pageName: page.name,
          nodes: page.nodes,
          selectedNodeId: null,
          hoveredNodeId: null,
          dragTargetNodeId: null,
          isDirty: false
        });
      }
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  },

  // 保存当前页面
  saveCurrentPage: async () => {
    const state = get();
    if (state.isSaving) return;

    set({ isSaving: true });
    try {
      const now = Date.now();
      const page: SavedPage = {
        id: state.pageId,
        name: state.pageName,
        nodes: serializeNodes(state.nodes),
        createdAt: now,
        updatedAt: now
      };
      await pageDB.savePage(page);
      set({ isDirty: false, isSaving: false });
    } catch (error) {
      console.error('Failed to save page:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  // 列出所有页面
  listPages: async () => {
    try {
      return await pageDB.listPages();
    } catch (error) {
      console.error('Failed to list pages:', error);
      return [];
    }
  },

  // 删除页面
  deletePage: async (id: string) => {
    try {
      await pageDB.deletePage(id);
    } catch (error) {
      console.error('Failed to delete page:', error);
      throw error;
    }
  },

  // ===== 撤销/重做 =====

  // 撤销
  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      // 当前状态推入 future
      const newFuture = [createSnapshot(state.nodes, state.selectedNodeId), ...state.future].slice(0, HISTORY_LIMIT);

      return {
        nodes: previous.nodes,
        selectedNodeId: previous.selectedNodeId,
        hoveredNodeId: null,
        dragTargetNodeId: null,
        isDirty: true,
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true
      };
    });
  },

  // 重做
  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      // 当前状态推入 past
      const newPast = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

      return {
        nodes: next.nodes,
        selectedNodeId: next.selectedNodeId,
        hoveredNodeId: null,
        dragTargetNodeId: null,
        isDirty: true,
        past: newPast,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0
      };
    });
  },

  // 显式开启历史批次（预留：拖拽开始时调用，标记时间戳用于合并）
  beginHistoryBatch: () => {
    // 当前实现：updateNode 已通过时间窗口自动合并
    // 此接口预留给未来显式批次控制
  },

  // 提交历史批次（预留）
  commitHistoryBatch: () => {
    // 同上
  }
}));