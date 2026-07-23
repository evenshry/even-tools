// 打印预览 - 模拟热敏纸张渲染所有元素
// 顶部工具栏：发送打印 / 保存为模板 / 编码选择

import React, { useMemo } from 'react';
import { Card, Space, Button, Select, Empty, Typography, Tag } from 'antd';
import {
  EyeOutlined, PrinterOutlined, SaveOutlined,
} from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import { usePrintQueue } from '../../hooks/usePrintQueue';
import { encodePrintElements } from '../../utils/escPos/escPosEncoder';
import { encodePrintElementsTspl, DEFAULT_LABEL_CONFIG, type TsplLabelConfig } from '../../utils/tspl/tsplEncoder';
import PrintElementRenderer from './PrintElementRenderer';
import type { PrintJob } from '../../data/interface';

const { Text } = Typography;

// 纸张宽度 (字符 -> 像素，按 8px/字符 估算)
function paperWidthPx(chars: number): number {
  return chars * 8;
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

  // 预编译字节数 (用于显示)
  const compiledBytes = useMemo(() => {
    if (elements.length === 0) return null;
    try {
      if (profile.protocol === 'tspl') {
        const labelConfig: TsplLabelConfig = {
          ...DEFAULT_LABEL_CONFIG,
          dpi: profile.dpi,
        };
        return encodePrintElementsTspl(elements, labelConfig, commandInput.encoding);
      }
      return encodePrintElements(elements, profile.paperWidth, commandInput.encoding);
    } catch {
      return null;
    }
  }, [elements, profile.paperWidth, profile.protocol, profile.dpi, commandInput.encoding]);

  const canSend = connectionState === 'connected' && elements.length > 0;

  const handleSend = () => {
    if (!compiledBytes || elements.length === 0) return;
    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'designer',
      elements: JSON.parse(JSON.stringify(elements)),
      compiledBytes,
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
          <Tag color="default" style={{ fontSize: 11 }}>
            {profile.paperWidth}字符 / {profile.dpi}dpi
          </Tag>
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
          {compiledBytes && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                编译完成：{compiledBytes.length} 字节 / {elements.length} 元素 / {profile.paperWidth} 字符宽
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PrintPreview;
