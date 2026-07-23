// 指令工具栏 - 发送/编码选择

import React from 'react';
import { Button, Select, InputNumber, Checkbox, Space, Tooltip } from 'antd';
import { PrinterOutlined, ClearOutlined, SaveOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import { useBluetoothPrinter } from '../../hooks/useBluetoothPrinter';
import { useCommandCompiler } from '../../hooks/useCommandCompiler';
import { usePrintQueue } from '../../hooks/usePrintQueue';
import type { PrintJob } from '../../data/interface';

const CommandToolbar: React.FC = () => {
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);
  const saveAsSnippet = usePrinterStore(s => s.saveAsSnippet);
  const connectedDevice = usePrinterStore(s => s.connectedDevice);
  const profile = usePrinterStore(s => s.profile);

  const { connectionState } = useBluetoothPrinter();
  const { bytes, error } = useCommandCompiler(commandInput, profile.protocol);
  const { enqueue } = usePrintQueue();

  const canSend = connectionState === 'connected' && !!bytes && !error;

  const handleSend = () => {
    if (!bytes || error) return;
    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'command',
      commandInput: { ...commandInput },
      compiledBytes: bytes,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };
    enqueue(job);
  };

  const handleClear = () => {
    setCommandInput({ raw: '' });
  };

  const handleSaveSnippet = () => {
    const name = window.prompt('输入片段名称');
    if (name) {
      saveAsSnippet(name, commandInput);
    }
  };

  return (
    <Space wrap>
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

      {commandInput.syntax === 'plaintext' && (
        <Checkbox
          checked={commandInput.appendNewline}
          onChange={(e) => setCommandInput({ appendNewline: e.target.checked })}
        >
          末尾换行
        </Checkbox>
      )}

      <Tooltip title="重复发送次数 (压力测试)">
        <Space size={4}>
          <span style={{ fontSize: 12 }}>重复:</span>
          <InputNumber
            size="small"
            min={1}
            max={100}
            value={commandInput.repeat}
            onChange={(v) => setCommandInput({ repeat: v || 1 })}
            style={{ width: 60 }}
          />
        </Space>
      </Tooltip>

      <Button size="small" icon={<ClearOutlined />} onClick={handleClear}>清空</Button>

      <Button size="small" icon={<SaveOutlined />} onClick={handleSaveSnippet}>存片段</Button>

      <Button
        type="primary"
        size="small"
        icon={<PrinterOutlined />}
        disabled={!canSend}
        onClick={handleSend}
      >
        发送打印
      </Button>
    </Space>
  );
};

export default CommandToolbar;
