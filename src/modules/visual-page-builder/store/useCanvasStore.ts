import { create } from 'zustand';
import type { CanvasState, PageNode, AlignmentGuides } from '../types';
import { NodeType, PreviewMode, LayoutType } from '../types';
import { componentLibrary } from '../data/componentLibrary';
import { cloneTemplateNodes } from '../data/templates';
import { pageDB, DEFAULT_PAGE_ID, DEFAULT_PAGE_NAME, type SavedPage, type SavedTemplate } from './usePagePersistence';
import { parsePx, parsePxStrict } from '../utils/styleUtils';
import { validateNodeGraph } from '../utils/nodeValidation';

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
 * 显式历史批次状态
 * 拖拽/缩放开始时开启，期间无论持续多久都只记录一条快照
 */
let historyBatchActive = false;
let historyBatchPushed = false;

/**
 * 复制/粘贴节点时绝对定位节点的偏移量（px）
 * 流布局节点不偏移（清除 left/top）
 */
const DUPLICATE_OFFSET_PX = 20;

/**
 * 创建历史快照（深拷贝当前 nodes + selectedNodeId）
 * 使用 structuredClone 保留 Date 对象类型（JSON.parse/stringify 会把 Date 转为 string）
 */
const createSnapshot = (nodes: Record<string, PageNode>, selectedNodeId: string | null): Snapshot => {
  return {
    nodes: structuredClone(nodes),
    selectedNodeId,
    timestamp: Date.now()
  };
};

interface CanvasStore extends CanvasState {
  // 节点操作
  addNode: (type: NodeType, x: number, y: number, parentId?: string, insertIndex?: number) => void;
  updateNode: (id: string, updates: Partial<PageNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  /**
   * 移动节点到新父节点下的指定位置（用于图层面板拖拽 / 上移下移）
   * - newParentId 为 undefined 表示移到根层级
   * - newIndex 为在新父节点 children 中的目标索引（-1 表示追加到末尾）
   * - 防止将节点移动到自身或其后代下（避免环）
   */
  moveNode: (id: string, newParentId: string | undefined, newIndex?: number) => void;
  
  // 选择操作
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setDragTargetNodeId: (id: string | null) => void;
  
  // 画布操作
  toggleGrid: () => void;
  toggleAlignmentGuides: () => void;
  /** 设置当前对齐参考线（拖动中实时调用，传 null 清空） */
  setAlignmentGuides: (guides: AlignmentGuides | null) => void;
  
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
  /** 页面首次创建时间（保存时保留，不被覆盖） */
  pageCreatedAt: number;
  isDirty: boolean;
  isSaving: boolean;
  loadPage: (id?: string) => Promise<void>;
  saveCurrentPage: () => Promise<void>;
  loadNodes: (nodes: Record<string, PageNode>) => void;
  markDirty: () => void;

  // 模板操作（T4.2）
  /** 应用模板：克隆节点 + 推入历史 + 替换画布 */
  applyTemplate: (templateNodes: Record<string, PageNode>, templateRootId: string) => void;
  /** 将当前画布另存为模板 */
  saveTemplate: (name: string, description?: string) => Promise<SavedTemplate>;
  /** 列出所有用户自定义模板 */
  listTemplates: () => Promise<SavedTemplate[]>;
  /** 删除用户自定义模板 */
  deleteTemplate: (id: string) => Promise<void>;

  // 撤销/重做
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  beginHistoryBatch: () => void;
  commitHistoryBatch: () => void;

  // 剪贴板（用于 Ctrl+C / Ctrl+V）
  clipboardNodeId: string | null;
  /** 复制时保存的子树快照，粘贴时从快照克隆，避免源节点被修改或删除后粘贴出错 */
  clipboardNodes: Record<string, PageNode> | null;
  copyNode: (id: string) => void;
  pasteNode: () => void;

  // 多选与批量操作（T4.3）
  /** 当前多选节点 ID 列表（selectedNodeId 始终等于 selectedNodeIds[0] 或 null） */
  selectedNodeIds: string[];
  /** 设置多选（同时更新 selectedNodeId 为首个） */
  setSelectedNodeIds: (ids: string[]) => void;
  /** 切换某节点的选中状态（Ctrl/Cmd+点击） */
  toggleNodeSelection: (id: string) => void;
  /** 添加节点到选中集合（Shift+点击追加） */
  addToSelection: (id: string) => void;
  /** 清空多选 */
  clearSelection: () => void;
  /** 全选根节点（或全选同级节点） */
  selectAllRootNodes: () => void;
  /** 批量删除选中节点 */
  deleteSelected: () => void;
  /** 批量复制选中节点 */
  duplicateSelected: () => void;
  /**
   * 批量对齐选中节点
   * @param align 'left' | 'right' | 'top' | 'bottom' | 'centerHorizontal' | 'centerVertical'
   * 仅对绝对/固定定位节点生效
   */
  alignSelected: (align: 'left' | 'right' | 'top' | 'bottom' | 'centerHorizontal' | 'centerVertical') => void;
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
    gridVisible: true,
    alignmentGuidesVisible: true,
    alignmentGuides: null,

    // 预览相关状态
    previewMode: PreviewMode.EDIT,
    previewDevice: 'desktop',
    previewScale: 1
  };
};

/**
 * 多选相关的初始状态（与 CanvasState 分离，因为 selectedNodeIds 是 store 扩展字段）
 */
const multiSelectInitialState = {
  selectedNodeIds: [] as string[],
};

// 持久化初始字段
const persistenceInitialState = {
  pageId: DEFAULT_PAGE_ID,
  pageName: DEFAULT_PAGE_NAME,
  pageCreatedAt: Date.now(),
  isDirty: false,
  isSaving: false,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
  canUndo: false,
  canRedo: false,
  clipboardNodeId: null as string | null,
  clipboardNodes: null as Record<string, PageNode> | null,
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

/**
 * 加载前的基本结构校验与默认值补齐
 * 结构安全由 validateNodeGraph 统一校验（与 Schema 导入共用）
 */
const sanitizeLoadedNodes = (nodes: Record<string, PageNode>): Record<string, PageNode> | null => {
  const validation = validateNodeGraph(nodes as unknown as Record<string, unknown>);
  if (!validation.ok) {
    console.error('节点结构校验失败：', validation.error);
    return null;
  }

  const result: Record<string, PageNode> = Object.create(null);

  for (const [id, raw] of Object.entries(nodes)) {
    const node = raw as Partial<PageNode>;

    result[id] = {
      ...(raw as PageNode),
      id,
      style: node.style ?? {},
      layout: node.layout ?? { type: LayoutType.BLOCK, display: 'block', position: 'relative' },
      content: {
        text: '',
        html: '',
        ...(node.content ?? {}),
        children: [...(node.content?.children ?? [])],
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        ...(node.constraints ?? {}),
      },
      meta: {
        ...(node.meta ?? {}),
        createdAt: node.meta?.createdAt ?? new Date(),
        updatedAt: node.meta?.updatedAt ?? new Date(),
        creator: node.meta?.creator ?? 'user',
        tags: Array.isArray(node.meta?.tags) ? node.meta.tags : [],
        version: node.meta?.version ?? 1,
      },
    };
  }

  // 清理失效的 parentId（父节点可能已被删除）
  for (const node of Object.values(result)) {
    if (node.parentId && !result[node.parentId]) {
      node.parentId = undefined;
    }
  }

  return result;
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...createInitialState(),
  ...persistenceInitialState,
  ...multiSelectInitialState,
  
  // 添加节点
  addNode: (type: NodeType, x: number, y: number, parentId?: string, insertIndex?: number) => {
    const id = generateNodeId();
    const name = `${type}-${Object.keys(get().nodes).length}`;

    set((state) => {
      const newNode = createDefaultNode(type, id, name);

      const supportsDrag = newNode.layout.position === 'absolute' || newNode.layout.position === 'fixed';
      const parentNode = parentId ? state.nodes[parentId] : undefined;
      const parentIsFlowLayout = parentNode
        ? parentNode.layout.position === 'static' || parentNode.layout.position === 'relative'
        : false;

      if (supportsDrag) {
        // 画布坐标 → 父容器相对坐标：累加所有绝对定位祖先的 left/top
        let offsetLeft = 0;
        let offsetTop = 0;
        let ancestor: PageNode | undefined = parentNode;
        while (ancestor) {
          if (ancestor.layout.position === 'absolute' || ancestor.layout.position === 'fixed') {
            offsetLeft += parsePxStrict(ancestor.style.left) ?? 0;
            offsetTop += parsePxStrict(ancestor.style.top) ?? 0;
          }
          ancestor = ancestor.parentId ? state.nodes[ancestor.parentId] : undefined;
        }
        newNode.style.left = `${x - offsetLeft}px`;
        newNode.style.top = `${y - offsetTop}px`;
      } else {
        delete newNode.style.left;
        delete newNode.style.top;
      }

      const updatedNodes = { ...state.nodes };

      if (parentId && updatedNodes[parentId]) {
        const targetParent = updatedNodes[parentId];
        const children = targetParent.content.children || [];

        if (parentIsFlowLayout) {
          delete newNode.style.left;
          delete newNode.style.top;
          delete newNode.style.position;
          // 绝对定位节点放入流式容器时改为相对定位，参与 flex/grid/块级布局
          newNode.layout = { ...newNode.layout, position: 'relative' };
          // 块级容器中撑满宽度；flex/grid 容器保持自适应，避免破坏多列布局
          if (targetParent.layout.display !== 'flex' && targetParent.layout.display !== 'grid') {
            newNode.style.width = '100%';
          }
        }

        // 维护 parentId
        newNode.parentId = parentId;

        // flex/grid 容器按落点插入到指定顺序，其余情况追加到末尾
        const nextChildren = [...children];
        if (
          typeof insertIndex === 'number' &&
          insertIndex >= 0 &&
          insertIndex <= nextChildren.length
        ) {
          nextChildren.splice(insertIndex, 0, id);
        } else {
          nextChildren.push(id);
        }

        updatedNodes[parentId] = {
          ...targetParent,
          content: {
            ...targetParent.content,
            children: nextChildren
          }
        };
      }

      updatedNodes[id] = newNode;

      // 推入历史快照
      const past = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

      return {
        nodes: updatedNodes,
        selectedNodeId: id,
        selectedNodeIds: [id],
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
          version: (Number.isFinite(node.meta.version) ? node.meta.version : 0) + 1
        }
      };

      // 历史合并：显式批次内只记录一次；否则按时间窗口合并
      const now = Date.now();
      const lastSnapshot = state.past[state.past.length - 1];
      const shouldMerge = !historyBatchActive && !!lastSnapshot && (now - lastSnapshot.timestamp) < HISTORY_MERGE_WINDOW;
      const shouldPush = historyBatchActive ? !historyBatchPushed : !shouldMerge;
      const past = shouldPush
        ? [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT)
        : state.past;
      if (historyBatchActive) historyBatchPushed = true;

      return {
        nodes: updatedNodes,
        isDirty: true,
        past,
        future: [],
        canUndo: true,
        canRedo: false
      };
    });
  },

  // 删除节点
  deleteNode: (id: string) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node || !node.constraints.canDelete) return state;

      const updatedNodes = { ...state.nodes };

      // 递归删除子节点（同时清理 parentId）
      const deleteChildren = (nodeId: string) => {
        const childNode = updatedNodes[nodeId];
        if (childNode?.content.children) {
          childNode.content.children.forEach(childId => deleteChildren(childId));
        }
        delete updatedNodes[nodeId];
      };

      deleteChildren(id);

      // 从父节点中移除（O(1)：通过 parentId 直接定位父节点）
      const parentId = node.parentId;
      if (parentId && updatedNodes[parentId]) {
        const parentNode = updatedNodes[parentId];
        updatedNodes[parentId] = {
          ...parentNode,
          content: {
            ...parentNode.content,
            children: (parentNode.content.children || []).filter(childId => childId !== id)
          }
        };
      }

      // 同步多选：从 selectedNodeIds 中移除被删节点
      const newSelectedIds = state.selectedNodeIds.filter((sid) => sid !== id && !!updatedNodes[sid]);
      const newSelectedId = state.selectedNodeId === id ? null : state.selectedNodeId;

      return {
        nodes: updatedNodes,
        selectedNodeId: newSelectedId,
        selectedNodeIds: newSelectedIds,
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
      // parentCloneId: 当前克隆节点的父节点（克隆后的新 ID），用于维护 parentId
      const cloneNode = (sourceId: string, parentCloneId: string | undefined, newName?: string): string => {
        const source = updatedNodes[sourceId];
        if (!source) return '';

        const newId = generateNodeId();
        const isAbsolute = source.layout.position === 'absolute' || source.layout.position === 'fixed';

        // 计算偏移：绝对定位节点偏移 DUPLICATE_OFFSET_PX，流布局节点不设置 left/top
        const style = { ...source.style };
        if (isAbsolute) {
          // 百分比/auto 无法精确偏移，回退到 0，避免把 "50%" 解析成 50px
          style.left = `${(parsePxStrict(source.style.left) ?? 0) + DUPLICATE_OFFSET_PX}px`;
          style.top = `${(parsePxStrict(source.style.top) ?? 0) + DUPLICATE_OFFSET_PX}px`;
        } else {
          delete style.left;
          delete style.top;
        }

        // 递归克隆子节点，建立新的 children 引用
        const oldChildren = source.content.children || [];
        const newChildren: string[] = oldChildren.map(childId => cloneNode(childId, newId));

        const newNode: PageNode = {
          ...source,
          id: newId,
          name: newName || `${source.name}-copy`,
          parentId: parentCloneId, // 维护 parentId：根克隆节点为 undefined，子克隆节点为父克隆 ID
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

      const originalParentId = node.parentId;
      const newRootId = cloneNode(id, originalParentId);

      // 复制后的根节点挂回原父级，保持层级与相对坐标
      if (originalParentId && updatedNodes[originalParentId]) {
        const parentNode = updatedNodes[originalParentId];
        updatedNodes[originalParentId] = {
          ...parentNode,
          content: {
            ...parentNode.content,
            children: [...(parentNode.content.children || []), newRootId],
          },
        };
      }

      return {
        nodes: updatedNodes,
        selectedNodeId: newRootId,
        selectedNodeIds: [newRootId],
        isDirty: true,
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false
      };
    });
  },

  // 移动节点到新父节点下的指定位置
  moveNode: (id: string, newParentId: string | undefined, newIndex: number = -1) => {
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      // 防止移动到自身
      if (id === newParentId) return state;

      // 防止移动到自己的后代下（避免环）
      const isDescendant = (ancestorId: string, possibleDescendantId: string): boolean => {
        if (!possibleDescendantId) return false;
        const cur = state.nodes[possibleDescendantId];
        if (!cur) return false;
        if (cur.id === ancestorId) return true;
        return cur.parentId ? isDescendant(ancestorId, cur.parentId) : false;
      };
      if (newParentId && isDescendant(id, newParentId)) return state;

      // 校验目标父节点是否允许该类型子节点（undefined = 允许任意，[] = 叶子节点）
      if (newParentId) {
        const targetParent = state.nodes[newParentId];
        if (!targetParent) return state;
        const allowed = targetParent.constraints.allowedChildren;
        if (allowed !== undefined && !allowed.includes(node.type)) return state;
      }

      const updatedNodes = { ...state.nodes };

      // 1. 从原父节点 children 中移除
      const oldParentId = node.parentId;
      if (oldParentId && updatedNodes[oldParentId]) {
        const oldParent = updatedNodes[oldParentId];
        updatedNodes[oldParentId] = {
          ...oldParent,
          content: {
            ...oldParent.content,
            children: (oldParent.content.children || []).filter(cid => cid !== id)
          }
        };
      }

      // 2. 更新被移动节点的 parentId，并在换父级时换算绝对定位坐标
      const isAbsoluteNode = node.layout.position === 'absolute' || node.layout.position === 'fixed';
      const newParentNode = newParentId ? state.nodes[newParentId] : undefined;
      const newParentIsFlowLayout = !!newParentNode && (
        !newParentNode.layout.position ||
        newParentNode.layout.position === 'static' ||
        newParentNode.layout.position === 'relative'
      );
      if (isAbsoluteNode && oldParentId !== newParentId && newParentIsFlowLayout && newParentNode) {
        // 绝对定位节点移入流布局容器：转为相对定位并清除坐标，作为普通子项参与布局
        updatedNodes[id] = {
          ...node,
          parentId: newParentId,
          layout: { ...node.layout, position: 'relative' },
          style: {
            ...node.style,
            left: undefined,
            top: undefined,
            position: undefined,
            ...(newParentNode.layout.display !== 'flex' && newParentNode.layout.display !== 'grid'
              ? { width: '100%' }
              : {}),
          },
        };
      } else if (isAbsoluteNode && oldParentId !== newParentId) {
        const getParentOffset = (pid: string | undefined): { left: number; top: number } => {
          let left = 0;
          let top = 0;
          let ancestor = pid ? state.nodes[pid] : undefined;
          while (ancestor) {
            if (ancestor.layout.position === 'absolute' || ancestor.layout.position === 'fixed') {
              left += parsePxStrict(ancestor.style.left) ?? 0;
              top += parsePxStrict(ancestor.style.top) ?? 0;
            }
            ancestor = ancestor.parentId ? state.nodes[ancestor.parentId] : undefined;
          }
          return { left, top };
        };
        const oldOffset = getParentOffset(oldParentId);
        const newOffset = getParentOffset(newParentId);
        const absoluteLeft = (parsePxStrict(node.style.left) ?? 0) + oldOffset.left;
        const absoluteTop = (parsePxStrict(node.style.top) ?? 0) + oldOffset.top;
        updatedNodes[id] = {
          ...node,
          parentId: newParentId,
          style: {
            ...node.style,
            left: `${absoluteLeft - newOffset.left}px`,
            top: `${absoluteTop - newOffset.top}px`,
          },
        };
      } else {
        updatedNodes[id] = { ...node, parentId: newParentId };
      }

      // 3. 插入到新父节点 children 的指定位置
      if (newParentId) {
        const newParent = updatedNodes[newParentId];
        const newChildren = [...(newParent.content.children || [])];
        if (newIndex < 0 || newIndex > newChildren.length) {
          newChildren.push(id);
        } else {
          newChildren.splice(newIndex, 0, id);
        }
        updatedNodes[newParentId] = {
          ...newParent,
          content: { ...newParent.content, children: newChildren }
        };
      }
      // newParentId === undefined 时，节点变为根节点，无需更新任何父节点的 children

      return {
        nodes: updatedNodes,
        isDirty: true,
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false
      };
    });
  },
  
  // 选择节点（单选，同步清空多选）
  selectNode: (id: string | null) => {
    set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [] });
  },
  
  // 悬停节点
  hoverNode: (id: string | null) => {
    set({ hoveredNodeId: id });
  },

  // 设置拖拽目标节点
  setDragTargetNodeId: (id: string | null) => {
    set({ dragTargetNodeId: id });
  },
  
  // 切换网格显示
  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },
  
  // 切换对齐参考线
  toggleAlignmentGuides: () => {
    set((state) => ({ alignmentGuidesVisible: !state.alignmentGuidesVisible }));
  },

  // 设置当前对齐参考线（拖动中实时调用，传 null 清空）
  setAlignmentGuides: (guides: AlignmentGuides | null) => {
    set({ alignmentGuides: guides });
  },
  
  // 重置画布
  resetCanvas: () => {
    set((state) => ({
      ...createInitialState(),
      ...multiSelectInitialState,
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

  // ===== 模板操作（T4.2） =====

  // 应用模板：克隆节点（重新生成 ID）+ 推入历史 + 替换画布
  applyTemplate: (templateNodes: Record<string, PageNode>, templateRootId: string) => {
    set((state) => {
      const { nodes } = cloneTemplateNodes(templateNodes, templateRootId);
      return {
        nodes,
        selectedNodeId: null,
        selectedNodeIds: [],
        hoveredNodeId: null,
        dragTargetNodeId: null,
        alignmentGuides: null,
        isDirty: true,
        // 推入历史，允许撤销恢复到应用模板前的状态
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  // 将当前画布另存为模板
  saveTemplate: async (name: string, description?: string) => {
    const state = get();
    const now = Date.now();
    const template: SavedTemplate = {
      id: `tpl-user-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      nodes: serializeNodes(state.nodes),
      rootIds: Object.keys(state.nodes).filter((id) => !state.nodes[id].parentId),
      createdAt: now,
      updatedAt: now,
    };
    await pageDB.saveTemplate(template);
    return template;
  },

  // 列出所有用户自定义模板
  listTemplates: async () => {
    try {
      return await pageDB.listTemplates();
    } catch (error) {
      console.error('Failed to list templates:', error);
      return [];
    }
  },

  // 删除用户自定义模板
  deleteTemplate: async (id: string) => {
    try {
      await pageDB.deleteTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  },

  // 加载节点到画布（替换当前画布）
  loadNodes: (nodes: Record<string, PageNode>) => {
    const sanitized = sanitizeLoadedNodes(nodes);
    if (!sanitized) {
      console.error('加载失败：节点结构无效');
      return;
    }
    set({
      nodes: sanitized,
      selectedNodeId: null,
      selectedNodeIds: [],
      hoveredNodeId: null,
      dragTargetNodeId: null,
      // 导入的内容尚未写入 IndexedDB，标记为脏数据以触发自动保存
      isDirty: true,
      // 切换画布后旧历史不再适用，清空避免撤销回上一份内容
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
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
        const sanitized = sanitizeLoadedNodes(page.nodes);
        if (!sanitized) {
          console.error('加载失败：页面节点结构无效');
          return;
        }
        set({
          pageId: page.id,
          pageName: page.name,
          pageCreatedAt: page.createdAt,
          nodes: sanitized,
          selectedNodeId: null,
          selectedNodeIds: [],
          hoveredNodeId: null,
          dragTargetNodeId: null,
          isDirty: false,
          // 切换页面后清空历史，防止 Ctrl+Z 恢复到上一个页面的节点
          past: [],
          future: [],
          canUndo: false,
          canRedo: false,
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

    // 记录本次保存的节点引用，保存完成后用于判断期间是否又有新编辑
    const nodesAtSave = state.nodes;
    set({ isSaving: true });
    try {
      const now = Date.now();
      const page: SavedPage = {
        id: state.pageId,
        name: state.pageName,
        nodes: serializeNodes(state.nodes),
        // 保留首次创建时间，仅更新 updatedAt
        createdAt: state.pageCreatedAt || now,
        updatedAt: now
      };
      await pageDB.savePage(page);
      set((current) => ({
        // 保存期间节点发生变化时保持 dirty，避免新编辑被误判为已保存
        isDirty: current.nodes === nodesAtSave ? false : current.isDirty,
        isSaving: false,
      }));
    } catch (error) {
      console.error('Failed to save page:', error);
      set({ isSaving: false });
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
        selectedNodeIds: previous.selectedNodeId ? [previous.selectedNodeId] : [],
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
        selectedNodeIds: next.selectedNodeId ? [next.selectedNodeId] : [],
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

  // 显式开启历史批次（拖拽/缩放开始时调用）
  beginHistoryBatch: () => {
    historyBatchActive = true;
    historyBatchPushed = false;
  },

  // 提交历史批次（拖拽/缩放结束时调用）
  commitHistoryBatch: () => {
    historyBatchActive = false;
    historyBatchPushed = false;
  },

  // 复制节点到剪贴板（保存子树快照）
  copyNode: (id: string) => {
    const { nodes } = get();
    if (!nodes[id]) return;

    const snapshot: Record<string, PageNode> = {};
    const walk = (nodeId: string) => {
      const node = nodes[nodeId];
      if (!node) return;
      snapshot[nodeId] = {
        ...node,
        style: { ...node.style },
        layout: { ...node.layout },
        content: { ...node.content, children: [...(node.content.children || [])] },
        constraints: { ...node.constraints },
        meta: { ...node.meta, tags: [...node.meta.tags] },
      };
      (node.content.children || []).forEach(walk);
    };
    walk(id);

    set({ clipboardNodeId: id, clipboardNodes: snapshot });
  },

  // 粘贴节点（从剪贴板快照克隆，重新生成 ID）
  pasteNode: () => {
    set((state) => {
      const { clipboardNodes, clipboardNodeId } = state;
      if (!clipboardNodes || !clipboardNodeId) return state;
      if (!clipboardNodes[clipboardNodeId]) {
        return { clipboardNodeId: null, clipboardNodes: null };
      }

      const cloned: Record<string, PageNode> = {};

      const cloneNode = (oldId: string, parentNewId?: string): string => {
        const source = clipboardNodes[oldId];
        if (!source) return '';

        const newId = generateNodeId();
        const isAbsolute = source.layout.position === 'absolute' || source.layout.position === 'fixed';
        const style = { ...source.style };

        // 仅根节点做偏移，子节点保持相对父节点的位置
        if (parentNewId === undefined && isAbsolute) {
          style.left = `${(parsePxStrict(source.style.left) ?? 0) + DUPLICATE_OFFSET_PX}px`;
          style.top = `${(parsePxStrict(source.style.top) ?? 0) + DUPLICATE_OFFSET_PX}px`;
        }

        const newChildren = (source.content.children || [])
          .map((cid) => cloneNode(cid, newId))
          .filter(Boolean);

        cloned[newId] = {
          ...source,
          id: newId,
          parentId: parentNewId,
          style,
          content: { ...source.content, children: newChildren },
          meta: {
            ...source.meta,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          },
        };
        return newId;
      };

      const newRootId = cloneNode(clipboardNodeId);
      if (!newRootId) return state;

      return {
        nodes: { ...state.nodes, ...cloned },
        selectedNodeId: newRootId,
        selectedNodeIds: [newRootId],
        isDirty: true,
        past: [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  // ===== 多选与批量操作（T4.3） =====

  // 设置多选（同步 selectedNodeId 为首个）
  setSelectedNodeIds: (ids: string[]) => {
    const validIds = ids.filter((id) => !!get().nodes[id]);
    set({
      selectedNodeIds: validIds,
      selectedNodeId: validIds.length > 0 ? validIds[0] : null,
    });
  },

  // 切换某节点的选中状态（Ctrl/Cmd+点击）
  toggleNodeSelection: (id: string) => {
    if (!get().nodes[id]) return;
    set((state) => {
      const exists = state.selectedNodeIds.includes(id);
      const newIds = exists
        ? state.selectedNodeIds.filter((sid) => sid !== id)
        : [...state.selectedNodeIds, id];
      return {
        selectedNodeIds: newIds,
        selectedNodeId: newIds.length > 0 ? newIds[0] : null,
      };
    });
  },

  // 添加节点到选中集合（Shift+点击追加）
  addToSelection: (id: string) => {
    if (!get().nodes[id]) return;
    set((state) => {
      if (state.selectedNodeIds.includes(id)) return state;
      const newIds = [...state.selectedNodeIds, id];
      return {
        selectedNodeIds: newIds,
        selectedNodeId: newIds.length > 0 ? newIds[0] : null,
      };
    });
  },

  // 清空多选
  clearSelection: () => {
    set({ selectedNodeIds: [], selectedNodeId: null });
  },

  // 全选根节点（无父节点的节点）
  selectAllRootNodes: () => {
    const rootIds = Object.values(get().nodes)
      .filter((n) => !n.parentId)
      .map((n) => n.id);
    set({
      selectedNodeIds: rootIds,
      selectedNodeId: rootIds.length > 0 ? rootIds[0] : null,
    });
  },

  // 批量删除选中节点
  deleteSelected: () => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length === 0) return;

    // 推入一条历史快照（整批作为一次撤销单位）
    const past = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

    const updatedNodes = { ...state.nodes };

    // 递归删除子节点
    const deleteRecursive = (nodeId: string) => {
      const node = updatedNodes[nodeId];
      if (!node) return;
      if (node.content.children) {
        node.content.children.forEach(deleteRecursive);
      }
      delete updatedNodes[nodeId];
    };

    // 从各自父节点的 children 中移除
    ids.forEach((id) => {
      const node = updatedNodes[id];
      if (!node) return;
      if (node.constraints && !node.constraints.canDelete) return;
      if (node.type === 'page') return; // PAGE 特殊保护

      const parentId = node.parentId;
      if (parentId && updatedNodes[parentId]) {
        const parentNode = updatedNodes[parentId];
        updatedNodes[parentId] = {
          ...parentNode,
          content: {
            ...parentNode.content,
            children: (parentNode.content.children || []).filter((cid) => cid !== id),
          },
        };
      }
      deleteRecursive(id);
    });

    set({
      nodes: updatedNodes,
      selectedNodeIds: [],
      selectedNodeId: null,
      isDirty: true,
      past,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  // 批量复制选中节点
  duplicateSelected: () => {
    const state = get();
    // 祖先也在选中集合时跳过，避免同一子树被重复克隆
    const ids = state.selectedNodeIds.filter((id) => {
      const node = state.nodes[id];
      if (!node) return false;
      let parentId = node.parentId;
      while (parentId) {
        if (state.selectedNodeIds.includes(parentId)) return false;
        parentId = state.nodes[parentId]?.parentId;
      }
      return true;
    });
    if (ids.length === 0) return;

    // 推入一条历史快照
    const past = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

    const updatedNodes = { ...state.nodes };
    const newRootIds: string[] = [];

    // 复用 duplicateNode 内部的 cloneNode 逻辑（这里重新实现以批量处理）
    const cloneNode = (sourceId: string, parentCloneId: string | undefined): string => {
      const source = updatedNodes[sourceId];
      if (!source) return '';
      if (!source.constraints.canDuplicate) return '';

      const newId = generateNodeId();
      const isAbsolute = source.layout.position === 'absolute' || source.layout.position === 'fixed';
      const style = { ...source.style };
      if (isAbsolute) {
        style.left = `${parsePx(source.style.left) + 20}px`;
        style.top = `${parsePx(source.style.top) + 20}px`;
      } else {
        delete style.left;
        delete style.top;
      }

      const oldChildren = source.content.children || [];
      const newChildren = oldChildren.map((cid) => cloneNode(cid, newId)).filter(Boolean);

      updatedNodes[newId] = {
        ...source,
        id: newId,
        name: `${source.name}-copy`,
        parentId: parentCloneId,
        style,
        content: { ...source.content, children: newChildren },
        meta: {
          ...source.meta,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      };
      return newId;
    };

    ids.forEach((id) => {
      const parentId = state.nodes[id]?.parentId;
      const newId = cloneNode(id, parentId);
      if (!newId) return;
      newRootIds.push(newId);

      // 复制后的根节点挂回原父级
      if (parentId && updatedNodes[parentId]) {
        const parentNode = updatedNodes[parentId];
        updatedNodes[parentId] = {
          ...parentNode,
          content: {
            ...parentNode.content,
            children: [...(parentNode.content.children || []), newId],
          },
        };
      }
    });

    set({
      nodes: updatedNodes,
      selectedNodeIds: newRootIds,
      selectedNodeId: newRootIds[0] || null,
      isDirty: true,
      past,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  // 批量对齐选中节点（仅对绝对/固定定位节点生效）
  alignSelected: (align) => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length < 2) return;

    // 仅保留可对齐的节点（绝对/固定定位）
    const alignableNodes = ids
      .map((id) => state.nodes[id])
      .filter((n) => n && (n.layout.position === 'absolute' || n.layout.position === 'fixed'));
    if (alignableNodes.length < 2) return;

    // 推入一条历史快照
    const past = [...state.past, createSnapshot(state.nodes, state.selectedNodeId)].slice(-HISTORY_LIMIT);

    // 计算对齐基准值
    // parsePxStrict 仅解析像素值（跳过 %/auto/em 等非像素单位），返回 null 表示不可对齐
    const rects = alignableNodes
      .map((n) => {
        const left = parsePxStrict(n.style.left);
        const top = parsePxStrict(n.style.top);
        // left/top 必须为有效像素值才能对齐
        if (left === null || top === null) return null;
        return {
          id: n.id,
          left,
          top,
          // width/height 用于 right/bottom/center 对齐，若非像素值则按 0 处理（仅影响该节点的偏移计算）
          width: parsePxStrict(n.style.width) ?? 0,
          height: parsePxStrict(n.style.height) ?? 0,
        };
      })
      .filter((r): r is { id: string; left: number; top: number; width: number; height: number } => r !== null);
    if (rects.length < 2) return;

    const updatedNodes = { ...state.nodes };

    switch (align) {
      case 'left': {
        const target = Math.min(...rects.map((r) => r.left));
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, left: `${target}px` },
          };
        });
        break;
      }
      case 'right': {
        const target = Math.max(...rects.map((r) => r.left + r.width));
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, left: `${target - r.width}px` },
          };
        });
        break;
      }
      case 'top': {
        const target = Math.min(...rects.map((r) => r.top));
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, top: `${target}px` },
          };
        });
        break;
      }
      case 'bottom': {
        const target = Math.max(...rects.map((r) => r.top + r.height));
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, top: `${target - r.height}px` },
          };
        });
        break;
      }
      case 'centerHorizontal': {
        const centers = rects.map((r) => r.left + r.width / 2);
        const target = (Math.min(...centers) + Math.max(...centers)) / 2;
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, left: `${target - r.width / 2}px` },
          };
        });
        break;
      }
      case 'centerVertical': {
        const centers = rects.map((r) => r.top + r.height / 2);
        const target = (Math.min(...centers) + Math.max(...centers)) / 2;
        rects.forEach((r) => {
          updatedNodes[r.id] = {
            ...updatedNodes[r.id],
            style: { ...updatedNodes[r.id].style, top: `${target - r.height / 2}px` },
          };
        });
        break;
      }
    }

    set({
      nodes: updatedNodes,
      isDirty: true,
      past,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  }
}));