import type { PageNode, NodeType } from '../types';
import { NodeType as NodeTypeEnum } from '../types';

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
 * JSX 字符串字面量转义：转义单引号和反斜杠，防止破坏 JSX 语法
 */
const escapeJsxString = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
};

/**
 * 判断值是否为有效非空（兼容 0 / '0' 等假值场景）
 */
const hasValue = (value: unknown): boolean => {
  return value !== undefined && value !== null && value !== '';
};

/**
 * 将 PageNode.style + layout 合并为单个 CSSProperties 对象
 * 用于代码生成时输出完整的 style
 */
const mergeStyleAndLayout = (node: PageNode): Record<string, string | number> => {
  const { style, layout } = node;
  const merged: Record<string, string | number> = {};

  // 基础样式（用 hasValue 兼容 0 值）
  if (hasValue(style.width)) merged.width = String(style.width);
  if (hasValue(style.height)) merged.height = String(style.height);
  if (hasValue(style.minWidth)) merged.minWidth = String(style.minWidth);
  if (hasValue(style.minHeight)) merged.minHeight = String(style.minHeight);
  if (hasValue(style.backgroundColor)) merged.backgroundColor = String(style.backgroundColor);
  if (hasValue(style.color)) merged.color = String(style.color);
  if (hasValue(style.fontSize)) merged.fontSize = String(style.fontSize);
  if (hasValue(style.fontWeight)) merged.fontWeight = String(style.fontWeight);
  if (hasValue(style.padding)) merged.padding = String(style.padding);
  if (hasValue(style.margin)) merged.margin = String(style.margin);
  if (hasValue(style.border)) merged.border = String(style.border);
  if (hasValue(style.borderRadius)) merged.borderRadius = String(style.borderRadius);
  if (hasValue(style.boxShadow)) merged.boxShadow = String(style.boxShadow);
  if (style.opacity !== undefined) merged.opacity = String(style.opacity);

  // 布局样式
  if (layout.display) merged.display = layout.display;
  if (layout.position) merged.position = layout.position;
  if (hasValue(style.left)) merged.left = String(style.left);
  if (hasValue(style.top)) merged.top = String(style.top);
  if (hasValue(style.right)) merged.right = String(style.right);
  if (hasValue(style.bottom)) merged.bottom = String(style.bottom);
  if (layout.flexDirection) merged.flexDirection = layout.flexDirection;
  if (layout.flexWrap) merged.flexWrap = layout.flexWrap;
  if (layout.gridTemplateColumns) merged.gridTemplateColumns = layout.gridTemplateColumns;
  if (layout.gridTemplateRows) merged.gridTemplateRows = layout.gridTemplateRows;

  return merged;
};

/** HTML 标签映射（覆盖所有 NodeType） */
const getHtmlTag = (type: NodeType): string => {
  switch (type) {
    case NodeTypeEnum.SECTION: return 'section';
    case NodeTypeEnum.HEADING: return 'h2';
    case NodeTypeEnum.BUTTON: return 'button';
    case NodeTypeEnum.IMAGE: return 'img';
    case NodeTypeEnum.INPUT: return 'input';
    case NodeTypeEnum.FORM: return 'form';
    case NodeTypeEnum.SPAN: return 'span';
    case NodeTypeEnum.SELECT: return 'select';
    case NodeTypeEnum.CHECKBOX: return 'input';
    case NodeTypeEnum.VIDEO: return 'video';
    case NodeTypeEnum.ICON: return 'i';
    default: return 'div';
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

    const childIds = node.content.children || [];
    const children = childIds
      .map((cid) => nodes[cid])
      .filter((n): n is PageNode => !!n);

    // 自闭合标签
    if (node.type === NodeTypeEnum.IMAGE) {
      const src = escapeHtml(node.content.src || '');
      const alt = escapeHtml(node.name);
      return `${indent(depth)}<img src="${src}" alt="${alt}" style="${styleStr}" />`;
    }
    if (node.type === NodeTypeEnum.INPUT) {
      const placeholder = escapeHtml(node.content.text || '');
      return `${indent(depth)}<input type="text" placeholder="${placeholder}" style="${styleStr}" />`;
    }
    if (node.type === NodeTypeEnum.CHECKBOX) {
      const label = escapeHtml(node.content.text || '');
      return `${indent(depth)}<label style="${styleStr}"><input type="checkbox" />${label}</label>`;
    }

    // 文本内容（转义防止 XSS）
    const textContent = escapeHtml(node.content.text || '');

    if (children.length === 0 && textContent) {
      return `${indent(depth)}<${tag} style="${styleStr}">${textContent}</${tag}>`;
    }
    if (children.length === 0) {
      return `${indent(depth)}<${tag} style="${styleStr}"></${tag}>`;
    }

    const inner = children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent(depth)}<${tag} style="${styleStr}">\n${inner}\n${indent(depth)}</${tag}>`;
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
 * 序列化节点：将 Date 对象转为 ISO 字符串，确保 JSON.stringify 稳定
 */
const serializeNodesForSchema = (nodes: Record<string, PageNode>): Record<string, PageNode> => {
  const result: Record<string, PageNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    result[id] = {
      ...node,
      meta: {
        ...node.meta,
        createdAt: node.meta.createdAt instanceof Date
          ? node.meta.createdAt.toISOString()
          : new Date(node.meta.createdAt as unknown as string).toISOString(),
        updatedAt: node.meta.updatedAt instanceof Date
          ? node.meta.updatedAt.toISOString()
          : new Date(node.meta.updatedAt as unknown as string).toISOString(),
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
