// 打印预览 - 模拟热敏纸张渲染所有元素
// 顶部工具栏：发送打印 / 保存为模板 / 编码选择

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Space, Button, Select, Empty, Typography, Tag, Alert, message } from 'antd';
import {
  EyeOutlined, PrinterOutlined, SaveOutlined,
} from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import { usePrintQueue } from '../../hooks/usePrintQueue';
import { encodePrintElements, encodePrintElementsAsync } from '../../utils/escPos/escPosEncoder';
import { encodePrintElementsTspl, encodePrintElementsTsplAsync, DEFAULT_LABEL_CONFIG, type TsplLabelConfig } from '../../utils/tspl/tsplEncoder';
import PrintElementRenderer from './PrintElementRenderer';
import type { PrintElement, PrintJob } from '../../data/interface';
import type { EscPosCompileResult } from '../../utils/escPos/escPosEncoder';
import type { TsplCompileResult } from '../../utils/tspl/tsplEncoder';

const { Text } = Typography;

type CompileResult = EscPosCompileResult | TsplCompileResult | null;

// ESC/POS 字符单元为 12 点宽，预览按同样的比例近似
function paperWidthPx(chars: number): number {
  return chars * 12;
}

function labelHeightPx(heightMm: number, dpi: number): number {
  return Math.floor(heightMm * dpi / 25.4);
}

// 输入防抖，避免属性面板每敲一个字就重新编码整页
const COMPILE_DEBOUNCE = 200;

const PrintPreview: React.FC = () => {
  const elements = usePrinterStore(s => s.elements);
  const profile = usePrinterStore(s => s.profile);
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);
  const connectedDevice = usePrinterStore(s => s.connectedDevice);
  const saveAsTemplate = usePrinterStore(s => s.saveAsTemplate);

  const { connectionState } = useBluetoothPrinter();
  const { enqueue } = usePrintQueue();

  const [debouncedElements, setDebouncedElements] = useState<PrintElement[]>(elements);
  const [compileResult, setCompileResult] = useState<CompileResult>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    if (elements.length === 0) {
      setDebouncedElements(elements);
      return;
    }
    const timer = setTimeout(() => setDebouncedElements(elements), COMPILE_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [elements]);

  const compile = useCallback(async (list: PrintElement[]): Promise<CompileResult> => {
    if (list.length === 0) return null;
    const hasImage = list.some(el => el.type === 'image' && el.src);
    if (profile.protocol === 'tspl') {
      const labelConfig: TsplLabelConfig = {
        ...DEFAULT_LABEL_CONFIG,
        widthMm: profile.widthMm,
        dpi: profile.dpi,
      };
      return hasImage
        ? encodePrintElementsTsplAsync(list, labelConfig, commandInput.encoding)
        : encodePrintElementsTspl(list, labelConfig, commandInput.encoding);
    }
    return hasImage
      ? encodePrintElementsAsync(list, profile.paperWidth, commandInput.encoding)
      : encodePrintElements(list, profile.paperWidth, commandInput.encoding);
  }, [profile.protocol, profile.widthMm, profile.dpi, profile.paperWidth, commandInput.encoding]);

  useEffect(() => {
    let cancelled = false;
    // 先标记编译中，避免发送按钮拿到旧结果
    setIsCompiling(debouncedElements.some(el => el.type === 'image' && el.src));
    compile(debouncedElements)
      .then((result) => {
        if (cancelled) return;
        setCompileResult(result);
        setCompileError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setCompileResult(null);
        setCompileError(e.message || '编译失败');
      })
      .finally(() => {
        if (!cancelled) setIsCompiling(false);
      });
    return () => { cancelled = true; };
  }, [debouncedElements, compile]);

  const canSend = connectionState === 'connected' && elements.length > 0 && !isCompiling;
  const hasPendingChanges = debouncedElements !== elements;

  const handleSend = async () => {
    if (elements.length === 0) return;
    let result: CompileResult;
    try {
      // 始终用最新元素编译一次，避免防抖窗口内发送旧内容
      result = await compile(elements);
    } catch (e) {
      message.error(`编译失败: ${(e as Error).message}`);
      return;
    }
    if (!result) return;

    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'designer',
      elements: JSON.parse(JSON.stringify(elements)),
      compiledBytes: result.bytes,
      compiledText: result.text,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };
    enqueue(job);
  };

  const handleSaveTemplate = () => {
    const name = window.prompt('输入模板名称');
    if (name) {
      saveAsTemplate(name, elements);
    }
  };

  const previewWidth = useMemo(() => {
    if (profile.protocol === 'tspl') {
      return Math.max(240, Math.round(profile.widthMm * 3.78));
    }
    return Math.max(240, paperWidthPx(profile.paperWidth));
  }, [profile.protocol, profile.widthMm, profile.paperWidth]);

  return (
    <Card
      title={
        <Space>
          <EyeOutlined />
          打印预览
          {profile.protocol === 'tspl' && compileResult && 'labelConfig' in compileResult ? (
            <Tag color="default" style={{ fontSize: 11 }}>
              {compileResult.labelConfig.widthMm}mm x {compileResult.labelConfig.heightMm}mm / {profile.dpi}dpi
            </Tag>
          ) : (
            <Tag color="default" style={{ fontSize: 11 }}>
              {profile.paperWidth}字符 / {profile.dpi}dpi
            </Tag>
          )}
        </Space>
      }
      size="small"
      extra={
        <Space size={6} wrap>
          <Select
            size="small"
            value={commandInput.encoding}
            onChange={(v) => setCommandInput({ encoding: v })}
            options={[
              { value: 'utf8', label: 'UTF-8' },
              { value: 'gbk', label: 'GBK' },
            ]}
            style={{ width: 90 }}
          />
          <Button
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSaveTemplate}
            disabled={elements.length === 0}
          >
            存模板
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!canSend}
            loading={isCompiling}
            onClick={handleSend}
          >
            发送打印
          </Button>
        </Space>
      }
      style={{ height: '100%', overflow: 'auto' }}
    >
      {elements.length === 0 ? (
        <Empty description="添加元素后将显示预览" />
      ) : (
        <>
          {compileError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="编译失败"
              description={compileError}
            />
          )}
          <div
            style={{
              margin: '0 auto',
              padding: '12px 8px',
              width: previewWidth,
              background: '#fff',
              border: '1px solid #d9d9d9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              fontFamily: 'monospace',
              color: '#000',
              ...(profile.protocol === 'tspl' && compileResult && 'labelConfig' in compileResult
                ? { height: labelHeightPx(compileResult.labelConfig.heightMm, compileResult.labelConfig.dpi), overflow: 'hidden' }
                : {}),
            }}
          >
            {elements.map((el, i) => (
              <div
                key={el.id}
                style={{
                  marginBottom: 4,
                  borderBottom: i < elements.length - 1 ? '1px dashed #f0f0f0' : 'none',
                  paddingBottom: 2,
                }}
              >
                <PrintElementRenderer element={el} paperWidth={profile.paperWidth} />
              </div>
            ))}
          </div>
          {compileResult && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                编译完成：{compileResult.bytes.length} 字节 / {elements.length} 元素 / {profile.paperWidth} 字符宽
                {hasPendingChanges ? '（正在重新编译…）' : ''}
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PrintPreview;
