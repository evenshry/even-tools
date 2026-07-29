import { Card, Space, Typography, Alert, Input, Button, Segmented } from "antd";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import { message } from "antd";
import type { JsonToolkitTypes } from "../data/interface";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorLine?: number;
  indent: JsonToolkitTypes.IndentStyle;
  onIndentChange: (v: JsonToolkitTypes.IndentStyle) => void;
  onFormat: () => void;
  onMinify: () => void;
  onClear: () => void;
  onPaste: () => void;
  rowHint?: string;
}

const JsonEditor = ({
  value,
  onChange,
  error,
  errorLine,
  indent,
  onIndentChange,
  onFormat,
  onMinify,
  onClear,
  onPaste,
  rowHint,
}: JsonEditorProps) => {
  const handleCopy = () => {
    if (!value) {
      message.warning("内容为空");
      return;
    }
    navigator.clipboard?.writeText(value);
    message.success("已复制");
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>JSON 输入</Text>
          {rowHint && <Text type="secondary" style={{ fontSize: 12 }}>{rowHint}</Text>}
        </Space>
      }
      extra={
        <Space size="small" wrap>
          <Segmented
            size="small"
            value={String(indent)}
            onChange={(v) => onIndentChange(v === "tab" ? "tab" : v === "0" ? 0 : Number(v) as 2 | 4)}
            options={[
              { label: "2 空格", value: "2" },
              { label: "4 空格", value: "4" },
              { label: "Tab", value: "tab" },
              { label: "压缩", value: "0" },
            ]}
          />
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
          <Button size="small" onClick={onPaste}>粘贴</Button>
          <Button size="small" onClick={onFormat}>格式化</Button>
          <Button size="small" onClick={onMinify}>压缩</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onClear}>清空</Button>
        </Space>
      }
      className="json-editor"
      styles={{ body: { padding: 12 } }}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          message="JSON 解析失败"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              <Text>{error}</Text>
              {errorLine && <Text type="secondary"> （第 {errorLine} 行附近）</Text>}
            </Paragraph>
          }
          style={{ marginBottom: 12 }}
        />
      )}
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='在此输入或粘贴 JSON，例如 {"name":"张三","age":28}'
        autoSize={{ minRows: 16, maxRows: 28 }}
        className="json-editor__textarea"
        spellCheck={false}
        style={{
          fontFamily: '"Monaco","Menlo","Ubuntu Mono","Consolas",monospace',
          fontSize: 13,
        }}
      />
    </Card>
  );
};

export default JsonEditor;
