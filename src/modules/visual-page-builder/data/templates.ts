import type { PageNode } from '../types';
import { NodeType, LayoutType } from '../types';

/**
 * 页面模板（预置 + 用户自定义共用此结构）
 *
 * 与 SavedTemplate 的区别：
 * - 此结构用于运行时（含 type guard），不持久化 createdAt/updatedAt
 * - 持久化时由 store 层包装为 SavedTemplate
 */
export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  /** 缩略图 emoji（避免依赖图片资源） */
  thumbnail: string;
  /** 是否为预置模板（不可删除） */
  builtin: boolean;
  /** 模板节点（key 为节点 ID，应用时会重新生成 ID） */
  nodes: Record<string, PageNode>;
  /** 根节点 ID */
  rootId: string;
}

/**
 * 创建节点的辅助工厂（保持代码简洁）
 * 不含 parentId / meta.createdAt 等运行时字段，应用模板时会重新生成
 */
type NodeSeed = Omit<PageNode, 'parentId' | 'meta'> & { meta?: Partial<PageNode['meta']> };

const seedToNode = (seed: NodeSeed, id: string): PageNode => ({
  ...seed,
  id,
  parentId: undefined,
  meta: {
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: 'template',
    tags: [],
    version: 1,
    ...seed.meta,
  },
});

/**
 * 构建模板：将 seed 节点列表 + 父子关系转为完整 PageNode 字典
 *
 * @param seeds 节点种子（按 id 索引）
 * @param relations [childId, parentId][] 关系列表（parentId 为 null 表示根节点）
 */
const buildTemplate = (
  seeds: Record<string, NodeSeed>,
  relations: Array<[string, string | null]>
): { nodes: Record<string, PageNode>; rootId: string } => {
  const nodes: Record<string, PageNode> = {};
  let rootId = '';

  // 第一遍：创建节点
  for (const [id, seed] of Object.entries(seeds)) {
    nodes[id] = seedToNode(seed, id);
  }

  // 第二遍：维护 parentId 与 children
  for (const [childId, parentId] of relations) {
    if (parentId === null) {
      rootId = childId;
    } else {
      const child = nodes[childId];
      const parent = nodes[parentId];
      if (child && parent) {
        child.parentId = parentId;
        if (!parent.content.children) parent.content.children = [];
        parent.content.children.push(childId);
      }
    }
  }

  return { nodes, rootId };
};

// ==================== 预置模板 ====================

/** 模板 1：空白页（单 PAGE 根节点） */
const blankTemplate = (): PageTemplate => {
  const rootId = 'tpl-blank-root';
  const seeds: Record<string, NodeSeed> = {
    [rootId]: {
      id: rootId,
      type: NodeType.SECTION,
      name: '页面根节点',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', minHeight: '100vh', padding: '24px', backgroundColor: '#ffffff' },
      content: { text: '', html: '', children: [] },
      events: {},
      dataBinding: { type: 'static' },
      constraints: {
        canDelete: false,
        canDuplicate: false,
        canResize: true,
        allowedChildren: [
          NodeType.SECTION, NodeType.CONTAINER, NodeType.DIV, NodeType.HEADING,
          NodeType.TEXT, NodeType.BUTTON, NodeType.IMAGE, NodeType.FORM, NodeType.FLEX, NodeType.GRID,
        ],
      },
    },
  };
  const { nodes, rootId: rid } = buildTemplate(seeds, [[rootId, null]]);
  return {
    id: 'builtin-blank',
    name: '空白页',
    description: '从零开始的空白画布',
    thumbnail: '📄',
    builtin: true,
    nodes,
    rootId: rid,
  };
};

/** 模板 2：落地页（Hero + 特性 + CTA） */
const landingTemplate = (): PageTemplate => {
  const rootId = 'tpl-landing-root';
  const heroId = 'tpl-landing-hero';
  const heroTitleId = 'tpl-landing-hero-title';
  const heroSubId = 'tpl-landing-hero-sub';
  const heroCtaId = 'tpl-landing-hero-cta';
  const featuresId = 'tpl-landing-features';
  const feat1Id = 'tpl-landing-feat1';
  const feat2Id = 'tpl-landing-feat2';
  const feat3Id = 'tpl-landing-feat3';
  const ctaId = 'tpl-landing-cta';
  const ctaTextId = 'tpl-landing-cta-text';
  const ctaBtnId = 'tpl-landing-cta-btn';

  const seeds: Record<string, NodeSeed> = {
    [rootId]: {
      id: rootId, type: NodeType.SECTION, name: '页面',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', minHeight: '100vh', backgroundColor: '#ffffff' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: false, canDuplicate: false, canResize: true, allowedChildren: [NodeType.SECTION] },
    },
    [heroId]: {
      id: heroId, type: NodeType.SECTION, name: 'Hero 区',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '80px 24px', backgroundColor: '#1890ff', color: '#ffffff', textAlign: 'center' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.HEADING, NodeType.TEXT, NodeType.BUTTON] },
    },
    [heroTitleId]: {
      id: heroTitleId, type: NodeType.HEADING, name: '主标题',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '48px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 16px 0' },
      content: { text: '一键构建你的落地页' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [heroSubId]: {
      id: heroSubId, type: NodeType.TEXT, name: '副标题',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '18px', color: '#ffffff', opacity: 0.85, margin: '0 0 32px 0' },
      content: { text: '可视化拖拽，无需代码，几分钟上线专业页面' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [heroCtaId]: {
      id: heroCtaId, type: NodeType.BUTTON, name: '主 CTA',
      layout: { type: LayoutType.INLINE, display: 'inline-block' },
      style: { padding: '12px 32px', backgroundColor: '#ffffff', color: '#1890ff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
      content: { text: '立即开始' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [featuresId]: {
      id: featuresId, type: NodeType.GRID, name: '特性区',
      layout: { type: LayoutType.GRID, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto' },
      style: { width: '100%', padding: '64px 24px', backgroundColor: '#f8f9fa', gap: '24px' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.DIV] },
    },
    [feat1Id]: {
      id: feat1Id, type: NodeType.DIV, name: '特性 1',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '8px', textAlign: 'center' },
      content: { text: '🎨 丰富的组件库\n拖拽即用，覆盖常见布局与表单' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [feat2Id]: {
      id: feat2Id, type: NodeType.DIV, name: '特性 2',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '8px', textAlign: 'center' },
      content: { text: '⚡ 实时预览\n所见即所得，边编辑边看效果' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [feat3Id]: {
      id: feat3Id, type: NodeType.DIV, name: '特性 3',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '8px', textAlign: 'center' },
      content: { text: '📦 一键导出\n支持 HTML / React / Schema 三种格式' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [ctaId]: {
      id: ctaId, type: NodeType.SECTION, name: 'CTA 区',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '64px 24px', backgroundColor: '#262626', textAlign: 'center' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.HEADING, NodeType.BUTTON] },
    },
    [ctaTextId]: {
      id: ctaTextId, type: NodeType.HEADING, name: 'CTA 标题',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 24px 0' },
      content: { text: '准备好开始了吗？' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [ctaBtnId]: {
      id: ctaBtnId, type: NodeType.BUTTON, name: 'CTA 按钮',
      layout: { type: LayoutType.INLINE, display: 'inline-block' },
      style: { padding: '12px 32px', backgroundColor: '#1890ff', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
      content: { text: '免费试用' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
  };

  const relations: Array<[string, string | null]> = [
    [rootId, null],
    [heroId, rootId], [heroTitleId, heroId], [heroSubId, heroId], [heroCtaId, heroId],
    [featuresId, rootId], [feat1Id, featuresId], [feat2Id, featuresId], [feat3Id, featuresId],
    [ctaId, rootId], [ctaTextId, ctaId], [ctaBtnId, ctaId],
  ];
  const { nodes, rootId: rid } = buildTemplate(seeds, relations);
  return {
    id: 'builtin-landing',
    name: '落地页',
    description: 'Hero + 特性卡片 + CTA，适合产品宣传',
    thumbnail: '🚀',
    builtin: true,
    nodes,
    rootId: rid,
  };
};

/** 模板 3：表单页（标题 + 表单容器 + 多个输入项 + 提交按钮） */
const formTemplate = (): PageTemplate => {
  const rootId = 'tpl-form-root';
  const formId = 'tpl-form-form';
  const titleId = 'tpl-form-title';
  const row1Id = 'tpl-form-row1';
  const label1Id = 'tpl-form-label1';
  const input1Id = 'tpl-form-input1';
  const row2Id = 'tpl-form-row2';
  const label2Id = 'tpl-form-label2';
  const input2Id = 'tpl-form-input2';
  const row3Id = 'tpl-form-row3';
  const label3Id = 'tpl-form-label3';
  const input3Id = 'tpl-form-input3';
  const submitId = 'tpl-form-submit';

  const seeds: Record<string, NodeSeed> = {
    [rootId]: {
      id: rootId, type: NodeType.SECTION, name: '页面',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', minHeight: '100vh', padding: '40px 24px', backgroundColor: '#f8f9fa' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: false, canDuplicate: false, canResize: true, allowedChildren: [NodeType.CONTAINER, NodeType.FORM] },
    },
    [formId]: {
      id: formId, type: NodeType.FORM, name: '表单容器',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '480px', maxWidth: '100%', margin: '0 auto', padding: '32px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.HEADING, NodeType.DIV, NodeType.BUTTON, NodeType.INPUT] },
    },
    [titleId]: {
      id: titleId, type: NodeType.HEADING, name: '表单标题',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '24px', fontWeight: 'bold', color: '#262626', margin: '0 0 24px 0', textAlign: 'center' },
      content: { text: '联系我们' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [row1Id]: {
      id: row1Id, type: NodeType.DIV, name: '姓名行',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { marginBottom: '16px' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.TEXT, NodeType.INPUT] },
    },
    [label1Id]: {
      id: label1Id, type: NodeType.TEXT, name: '姓名标签',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { display: 'block', fontSize: '14px', color: '#595959', marginBottom: '6px' },
      content: { text: '姓名' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [input1Id]: {
      id: input1Id, type: NodeType.INPUT, name: '姓名输入',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' },
      content: { text: '请输入姓名' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [row2Id]: {
      id: row2Id, type: NodeType.DIV, name: '邮箱行',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { marginBottom: '16px' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.TEXT, NodeType.INPUT] },
    },
    [label2Id]: {
      id: label2Id, type: NodeType.TEXT, name: '邮箱标签',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { display: 'block', fontSize: '14px', color: '#595959', marginBottom: '6px' },
      content: { text: '邮箱' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [input2Id]: {
      id: input2Id, type: NodeType.INPUT, name: '邮箱输入',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' },
      content: { text: 'name@example.com' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [row3Id]: {
      id: row3Id, type: NodeType.DIV, name: '留言行',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { marginBottom: '24px' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.TEXT, NodeType.INPUT] },
    },
    [label3Id]: {
      id: label3Id, type: NodeType.TEXT, name: '留言标签',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { display: 'block', fontSize: '14px', color: '#595959', marginBottom: '6px' },
      content: { text: '留言' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [input3Id]: {
      id: input3Id, type: NodeType.INPUT, name: '留言输入',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px', minHeight: '80px' },
      content: { text: '请输入留言内容' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [submitId]: {
      id: submitId, type: NodeType.BUTTON, name: '提交按钮',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', padding: '10px 16px', backgroundColor: '#1890ff', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
      content: { text: '提交' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
  };

  const relations: Array<[string, string | null]> = [
    [rootId, null],
    [formId, rootId],
    [titleId, formId],
    [row1Id, formId], [label1Id, row1Id], [input1Id, row1Id],
    [row2Id, formId], [label2Id, row2Id], [input2Id, row2Id],
    [row3Id, formId], [label3Id, row3Id], [input3Id, row3Id],
    [submitId, formId],
  ];
  const { nodes, rootId: rid } = buildTemplate(seeds, relations);
  return {
    id: 'builtin-form',
    name: '表单页',
    description: '联系表单，含 3 个输入字段与提交按钮',
    thumbnail: '📝',
    builtin: true,
    nodes,
    rootId: rid,
  };
};

/** 模板 4：文章页（标题 + 元信息 + 正文段落 + 图片） */
const articleTemplate = (): PageTemplate => {
  const rootId = 'tpl-article-root';
  const articleId = 'tpl-article';
  const titleId = 'tpl-article-title';
  const metaId = 'tpl-article-meta';
  const para1Id = 'tpl-article-para1';
  const imageId = 'tpl-article-image';
  const para2Id = 'tpl-article-para2';

  const seeds: Record<string, NodeSeed> = {
    [rootId]: {
      id: rootId, type: NodeType.SECTION, name: '页面',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', minHeight: '100vh', padding: '40px 24px', backgroundColor: '#ffffff' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: false, canDuplicate: false, canResize: true, allowedChildren: [NodeType.CONTAINER] },
    },
    [articleId]: {
      id: articleId, type: NodeType.CONTAINER, name: '文章容器',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '720px', maxWidth: '100%', margin: '0 auto' },
      content: { children: [] }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [NodeType.HEADING, NodeType.TEXT, NodeType.IMAGE] },
    },
    [titleId]: {
      id: titleId, type: NodeType.HEADING, name: '文章标题',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '36px', fontWeight: 'bold', color: '#262626', margin: '0 0 12px 0', lineHeight: '1.3' },
      content: { text: '一篇关于可视化构建的思考' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [metaId]: {
      id: metaId, type: NodeType.TEXT, name: '元信息',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '13px', color: '#8c8c8c', margin: '0 0 32px 0' },
      content: { text: '作者：Visual Builder · 2026-07-31 · 阅读 5 分钟' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [para1Id]: {
      id: para1Id, type: NodeType.TEXT, name: '段落 1',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '16px', color: '#595959', lineHeight: '1.8', margin: '0 0 24px 0' },
      content: { text: '可视化页面构建器降低了页面制作的门槛。通过拖拽组件、配置属性，任何人都可以在几分钟内搭建出专业的网页布局，而无需编写一行代码。' },
      events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [imageId]: {
      id: imageId, type: NodeType.IMAGE, name: '配图',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { width: '100%', height: 'auto', minHeight: '320px', backgroundColor: '#f0f2f5', borderRadius: '8px', margin: '0 0 24px 0' },
      content: { src: '', text: '配图占位' }, events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
    [para2Id]: {
      id: para2Id, type: NodeType.TEXT, name: '段落 2',
      layout: { type: LayoutType.BLOCK, display: 'block' },
      style: { fontSize: '16px', color: '#595959', lineHeight: '1.8', margin: '0' },
      content: { text: '本文探讨了可视化构建工具的设计原则、技术选型以及常见挑战，并分享了一些实践中的经验教训。' },
      events: {}, dataBinding: { type: 'static' },
      constraints: { canDelete: true, canDuplicate: true, canResize: true, allowedChildren: [] },
    },
  };

  const relations: Array<[string, string | null]> = [
    [rootId, null],
    [articleId, rootId],
    [titleId, articleId],
    [metaId, articleId],
    [para1Id, articleId],
    [imageId, articleId],
    [para2Id, articleId],
  ];
  const { nodes, rootId: rid } = buildTemplate(seeds, relations);
  return {
    id: 'builtin-article',
    name: '文章页',
    description: '标题 + 元信息 + 正文 + 配图，适合博客文章',
    thumbnail: '📖',
    builtin: true,
    nodes,
    rootId: rid,
  };
};

/**
 * 所有预置模板（id → template）
 * 用工厂函数惰性创建，避免模块加载时即生成大量 Date 对象
 */
export const builtinTemplates: PageTemplate[] = [
  blankTemplate(),
  landingTemplate(),
  formTemplate(),
  articleTemplate(),
];

/**
 * 将模板节点克隆为新的节点字典（重新生成 ID，避免与画布已有节点冲突）
 *
 * @param templateNodes 模板内的节点字典
 * @param templateRootId 模板的根节点 ID
 * @returns { nodes, rootId } 新的节点字典与新的根 ID
 */
export const cloneTemplateNodes = (
  templateNodes: Record<string, PageNode>,
  templateRootId: string
): { nodes: Record<string, PageNode>; rootId: string } => {
  // 旧 ID → 新 ID 映射
  const idMap = new Map<string, string>();
  const now = new Date();

  for (const oldId of Object.keys(templateNodes)) {
    const newId = `node-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}-${oldId}`;
    idMap.set(oldId, newId);
  }

  const nodes: Record<string, PageNode> = {};
  for (const [oldId, node] of Object.entries(templateNodes)) {
    const newId = idMap.get(oldId)!;
    const newParentId = node.parentId ? idMap.get(node.parentId) : undefined;
    const newChildren = (node.content.children || []).map((cid) => idMap.get(cid)).filter(Boolean) as string[];

    nodes[newId] = {
      ...node,
      id: newId,
      parentId: newParentId,
      content: { ...node.content, children: newChildren },
      meta: { ...node.meta, createdAt: now, updatedAt: now, version: 1 },
    };
  }

  return {
    nodes,
    rootId: idMap.get(templateRootId) || '',
  };
};
