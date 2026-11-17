import { useMemo, useState } from "react";
import { Card, Input, Button, Space, Typography, Alert, Segmented, message } from "antd";
import { CopyOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { escapeJsonString, unescapeJsonString } from "../utils/jsonUtils";

const { Text } = Typography;
const { TextArea } = Input;

type Direction = "escape" | "unescape";

const JsonEscapeTool = () => {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("escape");

  const { output, error } = useMemo<{ output: string; error?: string }>(() => {
    if (!input) return { output: "" };
    try {
      return {
        output: direction === "escape" ? escapeJsonString(input) : unescapeJsonString(input),
      };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  }, [input, direction]);

  const handleCopy = () => {
    if (!output) {
      message.warning("内容为空");
      return;
    }
    navigator.clipboard?.writeText(output);
    message.success("已复制");
  };

  const handleSwap = () => {
    if (output && !error) {
      setInput(output);
      setDirection((d) => (d === "escape" ? "unescape" : "escape"));
    }
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>字符串转义 / 反转义</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            处理 \n \t \" \\ 等控制字符
          </Text>
        </Space>
      }
      className="json-escape-tool"
      styles={{ body: { padding: 12 } }}
    >
      <Segmented
        value={direction}
        onChange={(v) => setDirection(v as Direction)}
        options={[
          { label: "转义 Escape", value: "escape" },
          { label: "反转义 Unescape", value: "unescape" },
        ]}
        style={{ marginBottom: 12 }}
      />
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>输入</Text>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={direction === "escape" ? '输入原始字符串，如 hello "world"\n换行' : "输入已转义字符串"}
            autoSize={{ minRows: 4, maxRows: 10 }}
            style={{
              fontFamily: '"Monaco","Menlo","Ubuntu Mono","Consolas",monospace',
              fontSize: 13,
              marginTop: 4,
            }}
          />
        </div>
        <Space>
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleSwap}>
            用结果替换输入并切换方向
          </Button>
          <Button icon={<CopyOutlined />} onClick={handleCopy}>复制结果</Button>
        </Space>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>输出</Text>
          {error ? (
            <Alert type="error" showIcon message={error} style={{ marginTop: 4 }} />
          ) : (
            <TextArea
              value={output}
              readOnly
              autoSize={{ minRows: 4, maxRows: 10 }}
              style={{
                fontFamily: '"Monaco","Menlo","Ubuntu Mono","Consolas",monospace',
                fontSize: 13,
                marginTop: 4,
                background: "var(--et-bg-subtle)",
              }}
            />
          )}
        </div>
      </Space>
    </Card>
  );
};

export default JsonEscapeTool;
