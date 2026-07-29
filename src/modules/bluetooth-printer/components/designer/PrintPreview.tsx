// 打印预览 - 模拟热敏纸张渲染所有元素
// 顶部工具栏：发送打印 / 保存为模板 / 编码选择

import React, { useMemo, useState, useEffect } from 'react';
import { Card, Space, Button, Select, Empty, Typography, Tag } from 'antd';
import {
  EyeOutlined, PrinterOutlined, SaveOutlined,
} from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import { usePrintQueue } from '../../hooks/usePrintQueue';
import { encodePrintElements, encodePrintElementsAsync } from '../../utils/escPos/escPosEncoder';
import { encodePrintElementsTspl, encodePrintElementsTsplAsync, DEFAULT_LABEL_CONFIG, type TsplLabelConfig } from '../../utils/tspl/tsplEncoder';
import PrintElementRenderer from './PrintElementRenderer';
import type { PrintJob } from '../../data/interface';
import type { EscPosCompileResult } from '../../utils/escPos/escPosEncoder';
import type { TsplCompileResult } from '../../utils/tspl/tsplEncoder';

const { Text } = Typography;

type CompileResult = EscPosCompileResult | TsplCompileResult | null;

function paperWidthPx(chars: number): number {
  return chars * 8;
}

function labelHeightPx(heightMm: number, dpi: number): number {
  return Math.floor(heightMm * dpi / 25.4);
}

const PrintPreview: React.FC = () => {
  const elements = usePrinterStore(s => s.elements);
  const profile = usePrinterStore(s => s.profile);
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);
  const connectedDevice = usePrinterStore(s => s.connectedDevice);
  const saveAsTemplate = usePrinterStore(s => s.saveAsTemplate);

  const { connectionState } = useBluetoothPrinter();
  const { enqueue } = usePrintQueue();

  const [asyncCompileResult, setAsyncCompileResult] = useState<CompileResult>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const hasImageElement = elements.some(el => el.type === 'image' && el.src);

  const syncCompileResult = useMemo(() => {
    if (elements.length === 0) return null;
    try {
      if (profile.protocol === 'tspl') {
        const labelConfig: TsplLabelConfig = {
          ...DEFAULT_LABEL_CONFIG,
          widthMm: profile.widthMm,
          dpi: profile.dpi,
        };
        return encodePrintElementsTspl(elements, labelConfig, commandInput.encoding);
      }
      return encodePrintElements(elements, profile.paperWidth, commandInput.encoding);
    } catch {
      return null;
    }
  }, [elements, profile.paperWidth, profile.protocol, profile.dpi, commandInput.encoding]);

  useEffect(() => {
    if (!hasImageElement || elements.length === 0) {
      setAsyncCompileResult(syncCompileResult);
      return;
    }
    setIsCompiling(true);
    let mounted = true;
    const doCompile = async () => {
      try {
        let result: CompileResult;
        if (profile.protocol === 'tspl') {
          const labelConfig: TsplLabelConfig = {
            ...DEFAULT_LABEL_CONFIG,
            widthMm: profile.widthMm,
            dpi: profile.dpi,
          };
          result = await encodePrintElementsTsplAsync(elements, labelConfig, commandInput.encoding);
        } else {
          result = await encodePrintElementsAsync(elements, profile.paperWidth, commandInput.encoding);
        }
        if (mounted) {
          setAsyncCompileResult(result);
        }
      } catch {
        if (mounted) {
          setAsyncCompileResult(syncCompileResult);
        }
      } finally {
        if (mounted) {
          setIsCompiling(false);
        }
      }
    };
    doCompile();
    return () => { mounted = false; };
  }, [hasImageElement, elements, profile.paperWidth, profile.protocol, profile.dpi, commandInput.encoding, syncCompileResult]);

  const compileResult = hasImageElement ? asyncCompileResult : syncCompileResult;
  const canSend = connectionState === 'connected' && elements.length > 0 && compileResult !== null;

  const handleSend = async () => {
    if (elements.length === 0) return;
    let bytes: Uint8Array;
    let text: string;
    if (hasImageElement) {
      if (isCompiling || !asyncCompileResult) {
        try {
          if (profile.protocol === 'tspl') {
            const labelConfig: TsplLabelConfig = {
              ...DEFAULT_LABEL_CONFIG,
              widthMm: profile.widthMm,
              dpi: profile.dpi,
            };
            const result = await encodePrintElementsTsplAsync(elements, labelConfig, commandInput.encoding);
            bytes = result.bytes;
            text = result.text;
          } else {
            const result = await encodePrintElementsAsync(elements, profile.paperWidth, commandInput.encoding);
            bytes = result.bytes;
            text = result.text;
          }
        } catch (e) {
          console.error('Failed to compile with images:', e);
          return;
        }
      } else {
        bytes = asyncCompileResult.bytes;
        text = asyncCompileResult.text;
      }
    } else {
      if (!syncCompileResult) return;
      bytes = syncCompileResult.bytes;
      text = syncCompileResult.text;
    }
    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'designer',
      elements: JSON.parse(JSON.stringify(elements)),
      compiledBytes: bytes,
      compiledText: text,
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
          <div
            style={{
              margin: '0 auto',
              padding: '12px 8px',
              width: paperWidthPx(profile.paperWidth),
              minWidth: 200,
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
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PrintPreview;
