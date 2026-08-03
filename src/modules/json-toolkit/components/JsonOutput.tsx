import { Card, Input, Button, Space, Typography, Alert, Empty, Tag } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { message } from "antd";
import { describeValue } from "../utils/jsonUtils";

const { Text } = Typography;
const { TextArea } = Input;

interface JsonOutputProps {
  title: string;
  content: string;
  error?: string;
  emptyText?: string;
  language?: "json" | "yaml" | "csv" | "xml" | "text";
}

const JsonOutput = ({ title, content, error, emptyText = "暂无输出", language = "text" }: JsonOutputProps) => {
  const handleCopy = () => {
    if (!content) {
      message.warning("内容为空");
      return;
    }
    navigator.clipboard?.writeText(content);
    message.success("已复制到剪贴板");
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>{title}</Text>
          <Tag color="blue" style={{ fontSize: 11 }}>
            {language.toUpperCase()}
          </Tag>
        </Space>
      }
      extra={
        <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} disabled={!content}>
          复制
        </Button>
      }
      className="json-output"
      styles={{ body: { padding: 12 } }}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {!content && !error && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />}
      {content && (
        <TextArea
          value={content}
          autoSize={{ minRows: 10, maxRows: 24 }}
          readOnly
          className="json-output__textarea"
          style={{
            fontFamily: '"Monaco","Menlo","Ubuntu Mono","Consolas",monospace',
            fontSize: 13,
          }}
        />
      )}
    </Card>
  );
};

// 输出查询结果列表
interface QueryResultListProps {
  results: { path: string; value: unknown }[];
}

export const QueryResultList = ({ results }: QueryResultListProps) => {
  if (results.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未匹配到任何节点" />;
  }

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    message.success("已复制");
  };

  return (
    <div className="json-output__query-list">
      <Text type="secondary" style={{ fontSize: 12 }}>
        共匹配到 {results.length} 个节点
      </Text>
      <div className="json-output__query-items">
        {results.map((r, i) => {
          const { type, preview } = describeValue(r.value);
          return (
            <div key={`${r.path}-${i}`} className="json-output__query-item">
              <div className="json-output__query-path">
                <Tag color="purple" style={{ fontSize: 11 }}>
                  {type}
                </Tag>
                <Text code copyable={{ onCopy: () => handleCopy(r.path) }} style={{ fontSize: 12 }}>
                  {r.path}
                </Text>
              </div>
              <div className="json-output__query-value">
                <Text style={{ fontFamily: "monospace", fontSize: 12 }}>{preview}</Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JsonOutput;
