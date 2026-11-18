import { NodeType, type PageNode } from '../types';

/** 合法节点类型白名单 */
const VALID_NODE_TYPES = new Set<string>(Object.values(NodeType));

/** 会污染原型链的键 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export interface NodeGraphValidation {
  ok: boolean;
  error?: string;
}

/**
 * 校验节点图的结构安全
 * - type 必须属于白名单
 * - key 必须与 node.id 一致
 * - children 必须引用存在的节点
 * - 拒绝循环引用与 __proto__ 等危险键
 *
 * 供 Schema 导入与本地持久化加载共用
 */
export const validateNodeGraph = (rawNodes: Record<string, unknown>): NodeGraphValidation => {
  const ids = Object.keys(rawNodes);
  if (ids.length === 0) return { ok: false, error: 'nodes 为空' };

  const childrenMap = new Map<string, string[]>();

  for (const id of ids) {
    if (FORBIDDEN_KEYS.has(id)) {
      return { ok: false, error: `非法节点 ID：${id}` };
    }

    const raw = rawNodes[id];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: `节点 ${id} 不是有效对象` };
    }

    const node = raw as Partial<PageNode>;
    if (!node.type || !VALID_NODE_TYPES.has(node.type)) {
      return { ok: false, error: `节点 ${id} 的 type 无效` };
    }
    if (node.id !== undefined && node.id !== id) {
      return { ok: false, error: `节点 ${id} 的 id 与 key 不一致` };
    }

    const children = node.content?.children;
    if (children !== undefined && !Array.isArray(children)) {
      return { ok: false, error: `节点 ${id} 的 children 不是数组` };
    }

    const childIds: string[] = [];
    for (const childId of children ?? []) {
      if (typeof childId !== 'string' || !rawNodes[childId]) {
        return { ok: false, error: `节点 ${id} 引用了不存在的子节点` };
      }
      childIds.push(childId);
    }
    childrenMap.set(id, childIds);
  }

  // 环检测（DFS 三色标记）
  const visitState = new Map<string, 1 | 2>();
  const hasCycle = (startId: string): boolean => {
    const status = visitState.get(startId);
    if (status === 1) return true;
    if (status === 2) return false;
    visitState.set(startId, 1);
    for (const childId of childrenMap.get(startId) || []) {
      if (hasCycle(childId)) return true;
    }
    visitState.set(startId, 2);
    return false;
  };
  for (const id of ids) {
    if (hasCycle(id)) return { ok: false, error: '节点存在循环引用' };
  }

  return { ok: true };
};
