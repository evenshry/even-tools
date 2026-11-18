import type { PageNode, NodeType } from '../types';
import { NodeType as NodeTypeEnum } from '../types';
import { NODE_STYLE_KEYS } from './styleUtils';
import { validateNodeGraph } from './nodeValidation';

/**
 * HTML 转义：防止 XSS，转义 & < > " '
 */
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * JSX 字符串字面量转义：转义反斜杠、引号、换行等，防止破坏 JSX 语法
 */
const escapeJsxString = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/'/g, "\\'");
};

/**
 * 判断值是否为有效非空（兼容 0 / '0' 等假值场景）
 */
const hasValue = (value: unknown): boolean => {
  return value !== undefined && value !== null && value !== '';
};

/**
 * 将 PageNode.style + layout 合并为单个 CSSProperties 对象
 * 与画布/预览共用 NODE_STYLE_KEYS 白名单，保证导出视觉一致
 */
const mergeStyleAndLayout = (node: PageNode): Record<string, string | number> => {
  const { style, layout } = node;
  const merged: Record<string, string | number> = {};

  for (const key of NODE_STYLE_KEYS) {
    const value = style[key];
    if (hasValue(value)) {
      merged[key] = typeof value === 'number' ? value : String(value);
    }
  }

  // 布局属性：以 layout 为准（覆盖 style 中的同名值）
  if (layout.display) merged.display = layout.display;
  if (layout.position) merged.position = layout.position;
  if (layout.flexDirection) merged.flexDirection = layout.flexDirection;
  if (layout.flexWrap) merged.flexWrap = layout.flexWrap;
  if (layout.justifyContent) merged.justifyContent = layout.justifyContent;
  if (layout.alignItems) merged.alignItems = layout.alignItems;
  if (layout.alignContent) merged.alignContent = layout.alignContent;
  if (layout.gridTemplateColumns) merged.gridTemplateColumns = layout.gridTemplateColumns;
  if (layout.gridTemplateRows) merged.gridTemplateRows = layout.gridTemplateRows;
  if (layout.gridAutoFlow) merged.gridAutoFlow = layout.gridAutoFlow;
  if (layout.gridAutoRows) merged.gridAutoRows = layout.gridAutoRows;
  if (layout.gridAutoColumns) merged.gridAutoColumns = layout.gridAutoColumns;

  return merged;
};

/** HTML 标签映射（显式覆盖所有 NodeType，避免 default fallback 隐藏语义错误） */
const getHtmlTag = (type: NodeType): string => {
  switch (type) {
    case NodeTypeEnum.SECTION: return 'section';
    case NodeTypeEnum.HEADING: return 'h2';
    case NodeTypeEnum.BUTTON: return 'button';
    case NodeTypeEnum.IMAGE: return 'img';
    case NodeTypeEnum.INPUT: return 'input';
    case NodeTypeEnum.FORM: return 'form';
    case NodeTypeEnum.SPAN: return 'span';
    case NodeTypeEnum.TEXT: return 'div';
    case NodeTypeEnum.SELECT: return 'select';
    case NodeTypeEnum.CHECKBOX: return 'input';
    case NodeTypeEnum.VIDEO: return 'video';
    case NodeTypeEnum.ICON: return 'i';
    // 容器类节点统一用 div，布局差异通过 style.display 表达
    case NodeTypeEnum.PAGE:
    case NodeTypeEnum.CONTAINER:
    case NodeTypeEnum.GRID:
    case NodeTypeEnum.FLEX:
    case NodeTypeEnum.STACK:
    case NodeTypeEnum.DIV:
    case NodeTypeEnum.CUSTOM:
      return 'div';
    default:
      // 兜底：未知类型用 div，避免崩溃
      return 'div';
  }
};

/** 缩进工具 */
const indent = (depth: number): string => '  '.repeat(depth);

/**
 * 生成内联 HTML 字符串
 * - 所有 style 内联到 style 属性
 * - 容器节点递归渲染子节点
 */
export const generateHTML = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const renderNode = (node: PageNode, depth: number): string => {
    const tag = getHtmlTag(node.type);
    const style = mergeStyleAndLayout(node);
    const styleStr = Object.entries(style)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`)
      .join('; ');
    // style 内容可能来自用户输入，写入属性前统一转义
    const safeStyle = escapeHtml(styleStr);

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    // 自闭合标签
    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeHtml(node.content.src || '');
      const alt = escapeHtml(node.name);
      return `${indent(depth)}<img src="${src}" alt="${alt}" style="${safeStyle}" />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeHtml(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder="${placeholder}" style="${safeStyle}" />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeHtml(node.content.text || '');
      return `${indent(depth)}<label style="${safeStyle}"><input type="checkbox" />${label}</label>`;
    }
    if (node.type === NodeTypeEnum.SELECT) {
      const option = escapeHtml(node.content.text || '请选择');
      return `${indent(depth)}<select style="${safeStyle}"><option>${option}</option></select>`;
    }
    if (node.type === NodeTypeEnum.VIDEO) {
      const src = escapeHtml(node.content.src || '');
      return `${indent(depth)}<video src="${src}" style="${safeStyle}" controls></video>`;
    }

    // 文本内容（转义防止 XSS）
    const textContent = escapeHtml(node.content.text || '');

    if (children.length === 0 && textContent) {
      return `${indent(depth)}<${tag} style="${safeStyle}">${textContent}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} style="${safeStyle}"></${tag}>`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} style="${safeStyle}">\n${inner}\n${indent(depth)}</${tag}>`;
  };

  const body = rootNodes.map((n) => renderNode(n, 1)).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>导出页面</title>
</head>
<body>
${body}
</body>
</html>`;
};

/**
 * 生成 React JSX 代码
 * - style 提取为对象写法
 * - className 使用 node.name 的 kebab-case
 */
export const generateReact = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const renderNode = (node: PageNode, depth: number): string => {
    const tag = getHtmlTag(node.type);
    const style = mergeStyleAndLayout(node);
    const styleStr = '{' + Object.entries(style)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${escapeJsxString(v)}'` : v}`)
      .join(', ') + '}';

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeJsxString(node.content.src || '');
      const alt = escapeJsxString(node.name);
      return `${indent(depth)}<img src={'${src}'} alt={'${alt}'} style={${styleStr}} />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder={'${placeholder}'} style={${styleStr}} />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeJsxString(node.content.text || '');
      return `${indent(depth)}<label style={${styleStr}}><input type="checkbox" />${label}</label>`;
    }
    if (node.type === NodeTypeEnum.SELECT) {
      const option = escapeJsxString(node.content.text || '请选择');
      return `${indent(depth)}<select style={${styleStr}}><option>{'${option}'}</option></select>`;
    }
    if (node.type === NodeTypeEnum.VIDEO) {
      const src = escapeJsxString(node.content.src || '');
      return `${indent(depth)}<video src={'${src}'} style={${styleStr}} controls />`;
    }

    const textContent = node.content.text || '';

    if (children.length === 0 && textContent) {
      // 文本节点用 {'...'} 包裹，防止 < > 破坏 JSX
      return `${indent(depth)}<${tag} style={${styleStr}}>{'${escapeJsxString(textContent)}'}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} style={${styleStr}} />`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} style={${styleStr}}>\n${inner}\n${indent(depth)}</${tag}>`;
  };

  const body = rootNodes.map((n) => renderNode(n, 2)).join('\n');
  return `import React from 'react';

const ExportedPage: React.FC = () => {
  return (
    <>
${body}
    </>
  );
};

export default ExportedPage;
`;
};

/**
 * 将任意值转换为有效的 Date，无效时回退到 epoch（1970-01-01）
 * 用于序列化/反序列化时防御性处理 meta.createdAt/updatedAt
 */
const toValidDate = (v: unknown): Date => {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? new Date(0) : v;
  }
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};

/**
 * 序列化节点：将 Date 对象转为 ISO 字符串，确保 JSON.stringify 稳定
 * 返回类型放宽为 Record<string, unknown>，因为 meta 中的 Date 被转为 string
 */
const serializeNodesForSchema = (nodes: Record<string, PageNode>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [id, node] of Object.entries(nodes)) {
    result[id] = {
      ...node,
      meta: {
        ...node.meta,
        createdAt: toValidDate(node.meta.createdAt).toISOString(),
        updatedAt: toValidDate(node.meta.updatedAt).toISOString(),
      }
    };
  }
  return result;
};

/**
 * 生成 JSON Schema（可被 loadNodes 反向加载）
 */
export const generateSchema = (nodes: Record<string, PageNode>, rootId?: string): string => {
  const rootNodes = rootId
    ? [nodes[rootId]].filter(Boolean)
    : Object.values(nodes).filter((n) => !n.parentId);

  const schema = {
    version: '1.0',
    type: 'visual-page-builder-schema',
    exportedAt: new Date().toISOString(),
    rootIds: rootNodes.map((n) => n.id),
    nodes: serializeNodesForSchema(nodes),
  };

  return JSON.stringify(schema, null, 2);
};

/** 下载文本文件 */
export const downloadTextFile = (filename: string, content: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Schema JSON 解析结果
 * - ok=false 时 error 描述失败原因
 * - ok=true 时 nodes 为可加载的节点映射
 */
export interface SchemaParseResult {
  ok: boolean;
  nodes?: Record<string, PageNode>;
  error?: string;
}

/**
 * 反向解析 generateSchema 输出的 JSON 字符串为可加载的 PageNode 映射
 *
 * 校验：
 * - 顶层必须是对象，且 type === 'visual-page-builder-schema'
 * - nodes 必须是非空对象
 * - 每个 node.meta.createdAt/updatedAt 必须能被 Date 解析
 *
 * 转换：将 meta.createdAt/updatedAt 从 ISO 字符串还原为 Date 对象
 * 严格模式：遇到任何结构异常都返回 { ok: false, error } 而不抛出
 */
export const parseSchema = (raw: string): SchemaParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${e instanceof Error ? e.message : String(e)}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Schema 必须是 JSON 对象' };
  }

  const schema = parsed as { type?: unknown; nodes?: unknown; rootIds?: unknown };
  if (schema.type !== 'visual-page-builder-schema') {
    return { ok: false, error: '缺少 type=visual-page-builder-schema 标识，可能不是可视化构建器导出的 schema' };
  }

  if (!schema.nodes || typeof schema.nodes !== 'object' || Array.isArray(schema.nodes)) {
    return { ok: false, error: 'nodes 字段缺失或不是对象' };
  }

  const sourceNodes = schema.nodes as Record<string, unknown>;

  // 结构安全校验：类型白名单、id 一致性、children 引用、循环引用、危险键
  const validation = validateNodeGraph(sourceNodes);
  if (!validation.ok) {
    return { ok: false, error: validation.error || '节点结构无效' };
  }

  const result: Record<string, PageNode> = Object.create(null);

  for (const [id, rawNode] of Object.entries(sourceNodes)) {
    if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
      return { ok: false, error: `节点 ${id} 不是有效对象` };
    }
    const node = rawNode as Record<string, unknown>;
    const meta = node.meta as { createdAt?: unknown; updatedAt?: unknown } | undefined;
    if (!meta) {
      return { ok: false, error: `节点 ${id} 缺少 meta 字段` };
    }

    const createdAtRaw = meta.createdAt;
    const updatedAtRaw = meta.updatedAt;
    const createdAt = toValidDate(createdAtRaw);
    const updatedAt = toValidDate(updatedAtRaw);
    // toValidDate 对无效日期回退到 epoch，这里检测原始值是否有效
    if ((createdAtRaw !== undefined && createdAtRaw !== null && Number.isNaN(new Date(createdAtRaw as string).getTime())) ||
        (updatedAtRaw !== undefined && updatedAtRaw !== null && Number.isNaN(new Date(updatedAtRaw as string).getTime()))) {
      return { ok: false, error: `节点 ${id} 的 meta.createdAt/updatedAt 不是有效日期` };
    }

    // 还原 Date 类型，其余字段保持原样（结构由 PageNode 类型约束）
    result[id] = {
      ...(node as unknown as PageNode),
      meta: {
        ...(node.meta as PageNode['meta']),
        createdAt,
        updatedAt,
      },
    };
  }

  if (Object.keys(result).length === 0) {
    return { ok: false, error: 'nodes 为空' };
  }

  return { ok: true, nodes: result };
};
