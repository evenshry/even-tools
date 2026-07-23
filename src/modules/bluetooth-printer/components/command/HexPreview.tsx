// Hex 字节预览

import React from 'react';
import { Card, Typography, Empty, Alert, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import { useCommandCompiler } from '../../hooks/useCommandCompiler';
import { formatHexDump } from '../../utils/command/hexDump';

const { Text } = Typography;

const HexPreview: React.FC = () => {
  const commandInput = usePrinterStore(s => s.commandInput);
  const profile = usePrinterStore(s => s.profile);
  const { bytes, error, byteCount } = useCommandCompiler(commandInput, profile.protocol);

  if (error) {
    return (
      <Card title={<Space><EyeOutlined />字节预览</Space>} size="small" style={{ height: '100%' }}>
        <Alert type="error" message="编译错误" description={error} showIcon />
      </Card>
    );
  }

  if (!bytes || bytes.length === 0) {
    return (
      <Card title={<Space><EyeOutlined />字节预览</Space>} size="small" style={{ height: '100%' }}>
        <Empty description="输入指令后将显示字节预览" />
      </Card>
    );
  }

  const dumpLines = formatHexDump(bytes, 16);

  return (
    <Card
      title={<Space><EyeOutlined />字节预览</Space>}
      size="small"
      extra={<Text type="secondary">{byteCount} 字节</Text>}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <pre style={{
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {dumpLines.map((line, i) => (
          <div key={i}>
            <span style={{ color: '#888' }}>{line.offset}</span>
            {'  '}
            <span style={{ color: '#2563eb' }}>{line.hex}</span>
            {'  '}
            <span style={{ color: '#16a34a' }}>{line.ascii}</span>
          </div>
        ))}
      </pre>
    </Card>
  );
};

export default HexPreview;
