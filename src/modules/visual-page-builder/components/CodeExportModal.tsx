import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Modal, Tabs, Button, Space, message, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { PageNode } from '../types';
import { generateHTML, generateReact, generateSchema, generateTailwind, downloadTextFile, parseSchema } from '../utils/codeGenerator';
import { useCanvasStore } from '../store/useCanvasStore';
import './CodeExportModal.scss';

const { Text } = Typography;

export type ExportFormat = 'html' | 'react' | 'tailwind' | 'schema';

interface CodeExportModalProps {
  open: boolean;
  nodes: Record<string, PageNode>;
  onClose: () => void;
}

const CodeExportModal: React.FC<CodeExportModalProps> = ({ open, nodes, onClose }) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('html');
  // 精确订阅 loadNodes，避免无关 store 变化触发 Modal 重渲染
  const loadNodes = useCanvasStore((s) => s.loadNodes);
  const pageName = useCanvasStore((s) => s.pageName);
  // Schema 页签允许编辑，便于导入外部/手改的 JSON
  const [schemaInput, setSchemaInput] = useState('');

  /** 根据当前格式生成代码（仅在 nodes 或格式变化时计算） */
  const code = useMemo(() => {
    if (!open) return '';
    try {
      switch (activeFormat) {
        case 'html':
          return generateHTML(nodes);
        case 'react':
          return generateReact(nodes);
        case 'tailwind':
          return generateTailwind(nodes);
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

  // 打开弹窗或切到 Schema 页签时，用当前画布生成的 schema 初始化编辑区
  useEffect(() => {
    if (open && activeFormat === 'schema') {
      setSchemaInput(generateSchema(nodes));
    }
  }, [open, activeFormat, nodes]);

  // Schema 页签以编辑区内容为准（支持粘贴外部 JSON）
  const output = activeFormat === 'schema' ? schemaInput : code;

  /** 复制到剪贴板 */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      message.success('已复制到剪贴板');
    } catch {
      // 降级方案：使用 textarea + execCommand
      const textarea = document.createElement('textarea');
      textarea.value = output;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const succeeded = document.execCommand('copy');
        if (succeeded) {
          message.success('已复制到剪贴板');
        } else {
          message.error('复制失败，请手动选择文本复制');
        }
      } catch {
        message.error('复制失败，请手动选择文本复制');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [output]);

  /** 下载文件 */
  const handleDownload = useCallback(() => {
    const extMap: Record<ExportFormat, string> = {
      html: 'html',
      react: 'tsx',
      tailwind: 'tsx',
      schema: 'json',
    };
    const mimeMap: Record<ExportFormat, string> = {
      html: 'text/html',
      react: 'text/plain',
      tailwind: 'text/plain',
      schema: 'application/json',
    };
    const filename = `${pageName.replace(/[\\/:*?"<>|]/g, '-') || 'page'}-${activeFormat}-${Date.now()}.${extMap[activeFormat]}`;
    downloadTextFile(filename, output, mimeMap[activeFormat]);
    message.success(`已下载：${filename}`);
  }, [output, activeFormat, pageName]);

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
    // 以编辑区内容为准，支持粘贴外部 JSON
    const result = parseSchema(schemaInput || code);
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
  }, [schemaInput, code, loadNodes, onClose]);

  const tabItems = useMemo(
    () => [
      { key: 'html', label: 'HTML' },
      { key: 'react', label: 'React' },
      { key: 'tailwind', label: 'Tailwind' },
      { key: 'schema', label: 'Schema (JSON)' },
    ],
    []
  );

  const codeStats = useMemo(() => {
    const lines = output.split('\n').length;
    const bytes = new Blob([output]).size;
    return { lines, bytes };
  }, [output]);

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
        {activeFormat === 'schema' ? (
          <textarea
            className="code-export-textarea"
            value={schemaInput}
            onChange={(e) => setSchemaInput(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: 420,
              resize: 'vertical',
              padding: 12,
              border: '1px solid var(--et-border)',
              borderRadius: 6,
              background: 'var(--et-bg-subtle)',
              color: 'var(--et-ink-1)',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.6,
              outline: 'none',
            }}
          />
        ) : (
          <pre className="code-export-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </Modal>
  );
};

export default CodeExportModal;
