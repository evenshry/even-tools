import React, { useMemo, useState, useCallback } from 'react';
import { Modal, Tabs, Button, Space, message, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { PageNode } from '../types';
import { generateHTML, generateReact, generateSchema, downloadTextFile, parseSchema } from '../utils/codeGenerator';
import { useCanvasStore } from '../store/useCanvasStore';
import './CodeExportModal.scss';

const { Text } = Typography;

export type ExportFormat = 'html' | 'react' | 'schema';

interface CodeExportModalProps {
  open: boolean;
  nodes: Record<string, PageNode>;
  onClose: () => void;
}

const CodeExportModal: React.FC<CodeExportModalProps> = ({ open, nodes, onClose }) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('html');
  // 精确订阅 loadNodes，避免无关 store 变化触发 Modal 重渲染
  const loadNodes = useCanvasStore((s) => s.loadNodes);

  /** 根据当前格式生成代码（仅在 nodes 或格式变化时计算） */
  const code = useMemo(() => {
    if (!open) return '';
    try {
      switch (activeFormat) {
        case 'html':
          return generateHTML(nodes);
        case 'react':
          return generateReact(nodes);
        case 'schema':
          return generateSchema(nodes);
        default:
          return '';
      }
    } catch (e) {
      console.error('代码生成失败', e);
      return `/* 代码生成失败：${e instanceof Error ? e.message : String(e)} */`;
    }
  }, [open, nodes, activeFormat]);

  /** 复制到剪贴板 */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      message.success('已复制到剪贴板');
    } catch {
      // 降级方案：使用 textarea + execCommand
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        message.success('已复制到剪贴板');
      } catch {
        message.error('复制失败，请手动选择文本复制');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [code]);

  /** 下载文件 */
  const handleDownload = useCallback(() => {
    const extMap: Record<ExportFormat, string> = {
      html: 'html',
      react: 'tsx',
      schema: 'json',
    };
    const mimeMap: Record<ExportFormat, string> = {
      html: 'text/html',
      react: 'text/plain',
      schema: 'application/json',
    };
    const filename = `export-${Date.now()}.${extMap[activeFormat]}`;
    downloadTextFile(filename, code, mimeMap[activeFormat]);
    message.success(`已下载：${filename}`);
  }, [code, activeFormat]);

  /**
   * 加载 Schema 回画布（仅 schema 格式可用）
   *
   * 流程：
   * 1. 解析当前 code（schema JSON 文本）
   * 2. 失败 → message.error 提示，不关闭 Modal
   * 3. 成功 → Modal.confirm 二次确认（导入会覆盖当前画布）
   * 4. 用户确认 → loadNodes + 关闭 Modal + message.success
   *
   * 注意：parseSchema 会把 meta.createdAt/updatedAt 从 ISO 字符串还原为 Date
   */
  const handleImportSchema = useCallback(() => {
    const result = parseSchema(code);
    if (!result.ok || !result.nodes) {
      message.error(`Schema 解析失败：${result.error || '未知错误'}`);
      return;
    }

    const nodeCount = Object.keys(result.nodes).length;
    Modal.confirm({
      title: '导入 Schema 到画布',
      content: `将导入 ${nodeCount} 个节点，当前画布内容会被覆盖，且无法通过撤销恢复。是否继续？`,
      okText: '导入',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        loadNodes(result.nodes!);
        message.success(`已导入 ${nodeCount} 个节点`);
        onClose();
      },
    });
  }, [code, loadNodes, onClose]);

  const tabItems = useMemo(
    () => [
      { key: 'html', label: 'HTML' },
      { key: 'react', label: 'React' },
      { key: 'schema', label: 'Schema (JSON)' },
    ],
    []
  );

  const codeStats = useMemo(() => {
    const lines = code.split('\n').length;
    const bytes = new Blob([code]).size;
    return { lines, bytes };
  }, [code]);

  return (
    <Modal
      title="导出代码"
      open={open}
      onCancel={onClose}
      width={880}
      footer={
        <Space>
          <Text type="secondary" style={{ marginRight: 'auto', fontSize: 12 }}>
            {codeStats.lines} 行 · {codeStats.bytes} 字节
          </Text>
          <Button icon={<CopyOutlined />} onClick={handleCopy}>
            复制
          </Button>
          <Button icon={<DownloadOutlined />} type="primary" onClick={handleDownload}>
            下载
          </Button>
          {activeFormat === 'schema' && (
            <Button onClick={handleImportSchema}>导入回画布</Button>
          )}
        </Space>
      }
    >
      <Tabs
        activeKey={activeFormat}
        onChange={(k) => setActiveFormat(k as ExportFormat)}
        size="small"
        items={tabItems}
      />
      <div className="code-export-preview">
        <pre className="code-export-pre">
          <code>{code}</code>
        </pre>
      </div>
    </Modal>
  );
};

export default CodeExportModal;
