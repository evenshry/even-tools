// 打印历史面板

import React from "react";
import { Card, List, Tag, Button, Empty, Space, Typography } from "antd";
import { HistoryOutlined, DeleteOutlined } from "@ant-design/icons";
import { usePrinterStore } from "../store/usePrinterStore";
import type { PrintHistoryEntry } from "../data/interface";

const { Text } = Typography;

const STATUS_TAGS: Record<string, { color: string; text: string }> = {
  success: { color: "success", text: "成功" },
  failed: { color: "error", text: "失败" },
  sending: { color: "processing", text: "发送中" },
  pending: { color: "default", text: "等待中" },
  canceled: { color: "warning", text: "已取消" },
};

const PrintHistory: React.FC = () => {
  const history = usePrinterStore((s) => s.history);
  const clearHistory = usePrinterStore((s) => s.clearHistory);

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 历史只保留预览文本，不再持久化二进制，避免刷新后解码失败
  const getDisplayContent = (entry: PrintHistoryEntry): string => (
    entry.preview || entry.job.compiledText || "[无内容]"
  );

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          打印历史
        </Space>
      }
      size="small"
      extra={
        history.length > 0 && (
          <Button size="small" icon={<DeleteOutlined />} onClick={clearHistory}>
            清空
          </Button>
        )
      }
    >
      <div style={{ maxHeight: 160, overflowY: "auto" }}>
        {history.length === 0 ? (
          <Empty description="暂无打印记录" />
        ) : (
          <List
            size="small"
            dataSource={history}
            renderItem={(entry) => {
              const job = entry.job;
              const status = STATUS_TAGS[job.status] || STATUS_TAGS.pending;
              const content = getDisplayContent(entry);

              return (
                <List.Item>
                  <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    <Space>
                      <Tag color={status.color}>{status.text}</Tag>
                      <Tag>{job.mode === "command" ? "指令" : "组件"}</Tag>
                      <Text type="secondary">{formatTime(job.createdAt)}</Text>
                      <Text type="secondary">{job.bytesSent || 0} 字节</Text>
                      {job.deviceName && <Text type="secondary">{job.deviceName}</Text>}
                    </Space>
                    {content && (
                      <pre
                        style={{
                          fontSize: 12,
                          color: "var(--et-ink-3)",
                          backgroundColor: "var(--et-bg-subtle)",
                          padding: "4px 8px",
                          borderRadius: 4,
                          margin: 0,
                          overflowX: "auto",
                          maxHeight: 120,
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {content}
                      </pre>
                    )}
                    {job.error && (
                      <Text type="danger" style={{ fontSize: 12 }}>
                        {job.error}
                      </Text>
                    )}
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Card>
  );
};

export default PrintHistory;
