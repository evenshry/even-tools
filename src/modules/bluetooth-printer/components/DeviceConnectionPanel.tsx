// 设备连接面板

import React from 'react';
import { Button, Card, Tag, Space, Typography, Alert, List } from 'antd';
import {
  ApiOutlined, LinkOutlined, DisconnectOutlined, ReloadOutlined,
  FileTextOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useBluetoothPrinter } from '../hooks/useBluetoothPrinter';
import { usePrintQueue } from '../hooks/usePrintQueue';
import { usePrinterStore } from '../store/usePrinterStore';

const { Text } = Typography;

const STATE_LABELS: Record<string, { text: string; color: string }> = {
  idle: { text: '未连接', color: 'default' },
  scanning: { text: '扫描中...', color: 'processing' },
  connecting: { text: '连接中...', color: 'processing' },
  connected: { text: '已连接', color: 'success' },
  disconnecting: { text: '断开中...', color: 'warning' },
  disconnected: { text: '已断开', color: 'default' },
  error: { text: '错误', color: 'error' },
};

const DeviceConnectionPanel: React.FC = () => {
  const { connectionState, connectedDevice, isSupported, connect, disconnect, queryStatus } = useBluetoothPrinter();
  const { printTestPage } = usePrintQueue();
  const { printerStatus, savedDevices } = usePrinterStore();

  const stateInfo = STATE_LABELS[connectionState] || STATE_LABELS.idle;
  const isBusy = ['scanning', 'connecting', 'disconnecting'].includes(connectionState);

  const profile = connectedDevice?.profile;

  return (
    <Card title={<Space><ApiOutlined />设备连接</Space>} size="small">
      {!isSupported && (
        <Alert
          type="warning"
          showIcon
          message="浏览器不支持 Web Bluetooth"
          description="请使用 Chrome、Edge 或其他 Chromium 内核浏览器，且需 HTTPS 环境。"
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text type="secondary">状态: </Text>
          <Tag color={stateInfo.color}>{stateInfo.text}</Tag>
        </div>

        {connectedDevice && (
          <div>
            <Text type="secondary">设备: </Text>
            <Text strong>{connectedDevice.name}</Text>
          </div>
        )}

        {profile && (
          <div>
            <Text type="secondary">协议: </Text>
            <Text>{profile.protocol.toUpperCase()}</Text>
            <Text type="secondary"> | 纸宽: </Text>
            <Text>
              {profile.protocol === 'tspl'
                ? `${profile.paperWidth}mm 标签`
                : profile.paperWidth === 32
                  ? '58mm'
                  : profile.paperWidth === 48
                    ? '80mm'
                    : `${profile.paperWidth}mm`}
            </Text>
          </div>
        )}

        {printerStatus && (
          <div>
            <Text type="secondary"><InfoCircleOutlined /> 打印机状态: </Text>
            <Space size={4} wrap>
              <Tag color={printerStatus.online ? 'success' : 'error'}>
                {printerStatus.online ? '在线' : '离线'}
              </Tag>
              {printerStatus.paperOut && <Tag color="error">缺纸</Tag>}
              {printerStatus.coverOpen && <Tag color="warning">开盖</Tag>}
              {printerStatus.overheated && <Tag color="error">过热</Tag>}
            </Space>
          </div>
        )}

        {savedDevices.length > 0 && connectionState !== 'connected' && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>已配对设备</Text>
            <List
              size="small"
              dataSource={savedDevices}
              renderItem={(device) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <Button
                    block
                    size="small"
                    onClick={connect}
                    disabled={isBusy || !isSupported}
                  >
                    {device.name}
                  </Button>
                </List.Item>
              )}
            />
          </div>
        )}

        <Space wrap>
          {connectionState !== 'connected' ? (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              loading={isBusy}
              onClick={connect}
              disabled={!isSupported}
            >
              扫描并连接
            </Button>
          ) : (
            <Button
              danger
              icon={<DisconnectOutlined />}
              loading={isBusy}
              onClick={disconnect}
            >
              断开
            </Button>
          )}

          {connectionState === 'connected' && (
            <>
              <Button icon={<InfoCircleOutlined />} onClick={queryStatus}>
                读取状态
              </Button>
              <Button icon={<FileTextOutlined />} onClick={printTestPage}>
                打印自检页
              </Button>
            </>
          )}

          {connectionState === 'error' && (
            <Button icon={<ReloadOutlined />} onClick={connect}>重试</Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export default DeviceConnectionPanel;
