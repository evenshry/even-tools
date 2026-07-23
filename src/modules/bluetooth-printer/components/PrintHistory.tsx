// 打印历史面板

import React from 'react';
import { Card, List, Tag, Button, Empty, Space, Typography } from 'antd';
import { HistoryOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../store/usePrinterStore';

const { Text } = Typography;

const STATUS_TAGS: Record<string, { color: string; text: string }> = {
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  sending: { color: 'processing', text: '发送中' },
  pending: { color: 'default', text: '等待中' },
  canceled: { color: 'warning', text: '已取消' },
};

const PrintHistory: React.FC = () => {
  const history = usePrinterStore(s => s.history);
  const clearHistory = usePrinterStore(s => s.clearHistory);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <Card
      title={<Space><HistoryOutlined />打印历史</Space>}
      size="small"
      extra={history.length > 0 && (
        <Button size="small" icon={<DeleteOutlined />} onClick={clearHistory}>清空</Button>
      )}
    >
      {history.length === 0 ? (
        <Empty description="暂无打印记录" />
      ) : (
        <List
          size="small"
          dataSource={history}
          renderItem={(entry) => {
            const job = entry.job;
            const status = STATUS_TAGS[job.status] || STATUS_TAGS.pending;
            return (
              <List.Item>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space>
                    <Tag color={status.color}>{status.text}</Tag>
                    <Tag>{job.mode === 'command' ? '指令' : '编辑'}</Tag>
                    <Text type="secondary">{formatTime(job.createdAt)}</Text>
                  </Space>
                  <Space>
                    <Text type="secondary">{job.bytesSent || 0} 字节</Text>
                    {job.deviceName && <Text type="secondary">{job.deviceName}</Text>}
                  </Space>
                  {job.error && <Text type="danger" style={{ fontSize: 12 }}>{job.error}</Text>}
                </Space>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default PrintHistory;
