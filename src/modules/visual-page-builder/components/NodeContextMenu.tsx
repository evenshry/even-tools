import React, { useState, useCallback, useEffect } from 'react';
import { Dropdown, type MenuProps } from 'antd';
import { useCanvasStore } from '../store/useCanvasStore';
import type { PageNode } from '../types';

interface NodeContextMenuProps {
  nodeId: string;
  children: React.ReactElement;
}

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
}

/**
 * 节点右键菜单
 * 复制 / 删除 / 撤销 / 重做 / 取消选中
 */
const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ nodeId, children }) => {
  const [menuState, setMenuState] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const { nodes, duplicateNode, deleteNode, selectNode, undo, redo, canUndo, canRedo } = useCanvasStore();

  const node: PageNode | undefined = nodes[nodeId];

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 选中当前节点（确保操作目标正确）
    selectNode(nodeId);
    setMenuState({ visible: true, x: e.clientX, y: e.clientY });
  }, [nodeId, selectNode]);

  // 点击其他位置时关闭菜单
  useEffect(() => {
    if (!menuState.visible) return;
    const handleClose = () => setMenuState(s => ({ ...s, visible: false }));
    window.addEventListener('click', handleClose);
    window.addEventListener('contextmenu', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
    };
  }, [menuState.visible]);

  const canDelete = node?.constraints.canDelete && node?.type !== 'page';
  const canDuplicate = node?.constraints.canDuplicate;

  const menuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      label: '复制',
      disabled: !canDuplicate,
      onClick: () => {
        if (canDuplicate) duplicateNode(nodeId);
      }
    },
    {
      key: 'delete',
      label: '删除',
      danger: true,
      disabled: !canDelete,
      onClick: () => {
        if (canDelete) deleteNode(nodeId);
      }
    },
    { type: 'divider' },
    {
      key: 'undo',
      label: '撤销',
      disabled: !canUndo,
      onClick: () => undo()
    },
    {
      key: 'redo',
      label: '重做',
      disabled: !canRedo,
      onClick: () => redo()
    },
    { type: 'divider' },
    {
      key: 'deselect',
      label: '取消选中',
      onClick: () => selectNode(null)
    }
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
      open={menuState.visible}
      onOpenChange={(visible) => {
        if (!visible) setMenuState(s => ({ ...s, visible: false }));
      }}
    >
      <div
        onContextMenu={handleContextMenu}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
    </Dropdown>
  );
};

export default NodeContextMenu;
