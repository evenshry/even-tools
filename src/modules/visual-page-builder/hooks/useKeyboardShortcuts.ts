import { useEffect } from 'react';
import { createElement } from 'react';
import { message, Modal } from 'antd';
import { useCanvasStore } from '../store/useCanvasStore';
import { NodeType } from '../types';
import { parsePx } from '../utils/styleUtils';

/** 快捷键说明表（用于弹出 Modal 展示） */
export const SHORTCUT_TABLE: Array<{ keys: string; action: string }> = [
  { keys: 'Delete / Backspace', action: '删除选中节点（支持批量）' },
  { keys: 'Ctrl+C', action: '复制选中节点' },
  { keys: 'Ctrl+V', action: '粘贴节点（偏移 20px）' },
  { keys: 'Ctrl+D', action: '直接复制选中节点（支持批量）' },
  { keys: 'Ctrl+A', action: '全选根节点' },
  { keys: 'Ctrl+Z', action: '撤销' },
  { keys: 'Ctrl+Shift+Z / Ctrl+Y', action: '重做' },
  { keys: 'Esc', action: '取消选中' },
  { keys: '↑ ↓ ← →', action: '微调位置（1px）' },
  { keys: 'Shift + 方向键', action: '微调位置（10px）' },
  { keys: 'Shift + 点击', action: '追加到选中' },
  { keys: 'Ctrl/Cmd + 点击', action: '切换选中' },
  { keys: 'Ctrl+S', action: '保存当前页面' },
  { keys: 'Ctrl+Shift+P', action: '切换预览 / 编辑模式' },
];

/**
 * 完整快捷键体系
 *
 * 集中注册所有快捷键，避免分散在多个组件
 * 当焦点在 input/textarea/contentEditable 中时，除 Esc 外不触发节点操作
 *
 * 性能：依赖数组仅保留 enabled，handler 内通过 useCanvasStore.getState() 读取
 * 动态状态（nodes/selectedNodeId 等），避免拖动时每帧重绑 keydown 监听器
 */
export const useKeyboardShortcuts = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 判断焦点是否在可编辑元素中
      const target = e.target as HTMLElement;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      // 实时读取 store 状态，避免闭包陷阱
      const state = useCanvasStore.getState();
      const { selectedNodeId, selectedNodeIds, nodes, canUndo, canRedo } = state;

      // Esc 始终生效（取消选中）
      if (e.key === 'Escape') {
        if (selectedNodeId || selectedNodeIds.length > 0) {
          state.clearSelection();
          e.preventDefault();
        }
        return;
      }

      // 以下快捷键在可编辑元素中不触发
      if (isEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+S：保存
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (Object.keys(nodes).length === 0) {
          message.warning('画布为空，无需保存');
          return;
        }
        message.loading({ content: '正在保存...', key: 'vpb-shortcut-save', duration: 0 });
        state.saveCurrentPage()
          .then(() => message.success({ content: '已保存', key: 'vpb-shortcut-save' }))
          .catch(() => message.error({ content: '保存失败', key: 'vpb-shortcut-save' }));
        return;
      }

      // Ctrl+Shift+P：切换预览
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        state.togglePreview();
        return;
      }

      // Ctrl+A：全选根节点
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        state.selectAllRootNodes();
        return;
      }

      // 撤销 Ctrl+Z
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (canUndo) {
          state.undo();
          e.preventDefault();
        }
        return;
      }

      // 重做 Ctrl+Shift+Z 或 Ctrl+Y
      if ((isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
          (isCtrlOrCmd && e.key.toLowerCase() === 'y')) {
        if (canRedo) {
          state.redo();
          e.preventDefault();
        }
        return;
      }

      // 复制 Ctrl+C（仅记录 nodeId）
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'c' && selectedNodeId) {
        const node = nodes[selectedNodeId];
        if (node && node.constraints.canDuplicate) {
          state.copyNode(selectedNodeId);
          message.success(`已复制：${node.name}`);
          e.preventDefault();
        }
        return;
      }

      // 粘贴 Ctrl+V
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'v') {
        state.pasteNode();
        e.preventDefault();
        return;
      }

      // 直接复制 Ctrl+D（支持批量）
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'd' && selectedNodeIds.length > 0) {
        if (selectedNodeIds.length === 1) {
          const node = nodes[selectedNodeIds[0]];
          if (node && node.constraints.canDuplicate) {
            state.duplicateNode(selectedNodeIds[0]);
            e.preventDefault();
          }
        } else {
          state.duplicateSelected();
          e.preventDefault();
        }
        return;
      }

      // 删除节点 Delete / Backspace（支持批量）
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedNodeIds.length > 0)) {
        if (selectedNodeIds.length > 1) {
          state.deleteSelected();
          e.preventDefault();
        } else if (selectedNodeId) {
          const node = nodes[selectedNodeId];
          if (node && node.constraints.canDelete) {
            if (node.type === NodeType.PAGE) return; // PAGE 特殊保护
            state.deleteNode(selectedNodeId);
            e.preventDefault();
          }
        }
        return;
      }

      // 方向键微调位置（仅绝对/固定定位节点）
      if (selectedNodeId && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const node = nodes[selectedNodeId];
        if (!node) return;
        if (node.layout.position !== 'absolute' && node.layout.position !== 'fixed') return;

        const step = e.shiftKey ? 10 : 1;
        const curLeft = parsePx(node.style.left);
        const curTop = parsePx(node.style.top);
        let newLeft = curLeft;
        let newTop = curTop;
        if (e.key === 'ArrowUp') newTop -= step;
        if (e.key === 'ArrowDown') newTop += step;
        if (e.key === 'ArrowLeft') newLeft -= step;
        if (e.key === 'ArrowRight') newLeft += step;

        state.updateNode(selectedNodeId, {
          style: {
            ...node.style,
            left: `${newLeft}px`,
            top: `${newTop}px`,
          },
        });
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

/**
 * 弹出快捷键说明 Modal
 */
export const showShortcutsModal = () => {
  Modal.info({
    title: '键盘快捷键',
    width: 520,
    content: createElement(
      'div',
      { style: { marginTop: 8 } },
      SHORTCUT_TABLE.map((item) =>
        createElement(
          'div',
          {
            key: item.keys,
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid #f0f0f0',
            },
          },
          createElement('span', { style: { fontFamily: 'monospace', color: '#1890ff' } }, item.keys),
          createElement('span', { style: { color: '#595959' } }, item.action)
        )
      )
    ),
  });
};
