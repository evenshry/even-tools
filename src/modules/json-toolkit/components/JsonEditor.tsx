import { Card, Space, Typography, Input, Button, Segmented } from "antd";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import { message } from "antd";
import type { JsonToolkitTypes } from "../data/interface";

const { Text } = Typography;
const { TextArea } = Input;

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  indent: JsonToolkitTypes.IndentStyle;
  onIndentChange: (v: JsonToolkitTypes.IndentStyle) => void;
  onFormat: () => void;
  onMinify: () => void;
  onClear: () => void;
  onPaste: () => void;
  rowHint?: string;
  // 状态栏数据
  dataValid: boolean;
  sizeBytes?: number;
  totalNodes?: number;
  depth?: number;
  keys?: number;
}

const JsonEditor = ({
  value,
  onChange,
  indent,
  onIndentChange,
  onFormat,
  onMinify,
  onClear,
  onPaste,
  rowHint,
  dataValid,
  sizeBytes,
  totalNodes,
  depth,
  keys,
}: JsonEditorProps) => {
  const handleCopy = () => {
    if (!value) {
      message.warning("内容为空");
      return;
    }
    navigator.clipboard?.writeText(value);
    message.success("已复制");
  };

  const indentLabel =
    indent === "tab" ? "Tab" : indent === 0 ? "压缩" : `${indent} 空格`;

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

      {/* 状态栏：放在文本框下方，卡片内部 */}
      <div className="json-editor__status-bar">
        <Space size="large" wrap>
          <Text type={dataValid ? "success" : "danger"} style={{ fontSize: 12 }}>
            {dataValid ? "● JSON 有效" : "● JSON 无效"}
          </Text>
          {sizeBytes !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              大小：{sizeBytes} B
            </Text>
          )}
          {totalNodes !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              节点：{totalNodes}
            </Text>
          )}
          {depth !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              深度：{depth}
            </Text>
          )}
          {keys !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              键数：{keys}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前缩进：{indentLabel}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default JsonEditor;
