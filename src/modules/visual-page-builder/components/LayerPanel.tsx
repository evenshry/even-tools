import React, { useMemo } from 'react';
import { Tree, Empty, Dropdown, Tooltip, message } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import type { PageNode } from '../types';
import { getNodeTypeIcon } from '../utils/nodeIcons';
import './LayerPanel.scss';

interface LayerPanelProps {}

/**
 * 层级面板（图层管理）
 * - 树形展示节点层级
 * - 点击选中、拖拽调整层级、显隐切换、右键菜单
 */
const LayerPanel: React.FC<LayerPanelProps> = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const moveNode = useCanvasStore((s) => s.moveNode);

  // 计算同层兄弟节点（用于上移/下移 disable 判断）
  const getSiblingIds = (node: PageNode): string[] => {
    if (node.parentId) {
      return nodes[node.parentId]?.content.children || [];
    }
    return Object.values(nodes)
      .filter((n) => !n.parentId)
      .map((n) => n.id);
  };

  // 右键菜单项
  const contextMenuItems = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return [];
    const siblings = getSiblingIds(node);
    const index = siblings.indexOf(nodeId);
    return [
      {
        key: 'up',
        label: '上移一层',
        icon: <ArrowUpOutlined />,
        disabled: index <= 0,
        onClick: () => moveNode(nodeId, node.parentId, index - 1),
      },
      {
        key: 'down',
        label: '下移一层',
        icon: <ArrowDownOutlined />,
        disabled: index >= siblings.length - 1,
        onClick: () => moveNode(nodeId, node.parentId, index + 2),
      },
      { type: 'divider' as const },
      {
        key: 'duplicate',
        label: '复制',
        icon: <CopyOutlined />,
        disabled: !node.constraints.canDuplicate,
        onClick: () => duplicateNode(nodeId),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: !node.constraints.canDelete,
        onClick: () => deleteNode(nodeId),
      },
    ];
  };

  // 构建树数据（O(n) 一次遍历 + 子节点组装）
  const treeData = useMemo<TreeDataNode[]>(() => {
    const rootNodes = Object.values(nodes).filter((n) => !n.parentId);
    const buildNode = (node: PageNode): TreeDataNode => {
      const childIds = node.content.children || [];
      const children = childIds
        .map((cid) => nodes[cid])
        .filter((n): n is PageNode => !!n)
        .map(buildNode);
      const isHidden = node.layout.display === 'none';
      const titleContent = (
        <Dropdown
          trigger={['contextMenu']}
          menu={{ items: contextMenuItems(node.id) }}
        >
          <div
            className="layer-node-title"
            onContextMenu={(e) => {
              // 右键时同步选中
              e.stopPropagation();
              selectNode(node.id);
            }}
          >
            <span className="layer-node-icon">{getNodeTypeIcon(node.type)}</span>
            <span className={`layer-node-name ${isHidden ? 'is-hidden' : ''}`}>{node.name}</span>
            <Tooltip title={isHidden ? '显示' : '隐藏'}>
              <span
                className="layer-node-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  updateNode(node.id, {
                    layout: {
                      ...node.layout,
                      display: isHidden ? 'block' : 'none',
                    },
                  });
                }}
              >
                {isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </span>
            </Tooltip>
          </div>
        </Dropdown>
      );
      return {
        key: node.id,
        title: titleContent,
        children: children.length > 0 ? children : undefined,
      };
    };
    return rootNodes.map(buildNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, updateNode, selectNode, duplicateNode, deleteNode, moveNode]);

  // 处理拖拽放置（调整父子层级）
  const onDrop: TreeProps['onDrop'] = (info) => {
    const dragNodeId = String(info.dragNode.key);
    const dropNodeId = info.node ? String(info.node.key) : null;
    if (!dropNodeId) return;

    const dropNode = nodes[dropNodeId];
    if (!dropNode) return;

    // dropToGap: 拖到节点之间的间隙（作为 dropNode 父节点的子节点）
    // 否则: 拖到节点上（作为 dropNode 的子节点）
    const isGap = info.dropToGap;

    if (isGap) {
      // 间隙：与 dropNode 同父，插入到 dropNode 前/后
      const newParentId = dropNode.parentId;
      const parentChildren = newParentId
        ? nodes[newParentId]?.content.children || []
        : Object.values(nodes).filter((n) => !n.parentId).map((n) => n.id);

      const dropIndex = parentChildren.indexOf(dropNodeId);
      // dropPosition 是相对 dropNode 的位置，正数表示下方，负数表示上方
      const insertIndex = info.dropPosition > dropIndex ? dropIndex + 1 : dropIndex;
      moveNode(dragNodeId, newParentId, insertIndex);
    } else {
      // 拖到节点上：作为 dropNode 的子节点
      // 校验：dropNode 必须是容器类型（有 allowedChildren）
      const allowed = dropNode.constraints.allowedChildren;
      const dragNode = nodes[dragNodeId];
      if (allowed && allowed.length > 0 && dragNode && !allowed.includes(dragNode.type)) {
        message.warning(`目标节点不允许放置该类型子节点`);
        return;
      }
      moveNode(dragNodeId, dropNodeId, -1);
    }
  };

  if (treeData.length === 0) {
    return (
      <div className="layer-panel">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无节点，请从组件库拖拽组件到画布"
        />
      </div>
    );
  }

  return (
    <div className="layer-panel">
      <div className="layer-tree-wrapper">
        <Tree
          treeData={treeData}
          selectedKeys={selectedNodeId ? [selectedNodeId] : []}
          onSelect={(keys) => {
            const key = keys[0];
            selectNode(key ? String(key) : null);
          }}
          onDrop={onDrop}
          draggable
          blockNode
          showLine
          defaultExpandAll
        />
      </div>
    </div>
  );
};

export default LayerPanel;
