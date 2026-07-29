import { Card, Typography, Alert, Space, Tag } from "antd";
import JsonOutput from "./JsonOutput";
import { validateJson } from "../utils/jsonUtils";
import { useMemo } from "react";

const { Text, Paragraph } = Typography;

interface JsonValidatorProps {
  rawText: string;
}

const JsonValidator = ({ rawText }: JsonValidatorProps) => {
  const validation = useMemo(() => validateJson(rawText), [rawText]);

  return (
    <Card
      title={
        <Space>
          <Text strong>校验结果</Text>
          {validation.isValid ? (
            <Tag color="success">VALID</Tag>
          ) : (
            <Tag color="error">INVALID</Tag>
          )}
        </Space>
      }
      className="json-validator"
      styles={{ body: { padding: 12 } }}
    >
      {validation.isValid ? (
        <Alert
          type="success"
          showIcon
          message="JSON 格式正确"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              <Text>已成功解析为 {Array.isArray(validation.parsed) ? "数组" : typeof validation.parsed} 类型。</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                可在「可视化树」标签中查看结构，或在「路径查询」「格式转换」中使用。
              </Text>
            </Paragraph>
          }
        />
      ) : (
        <Alert
          type="error"
          showIcon
          message="JSON 校验失败"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              <Text>{validation.error}</Text>
              {validation.errorLine && (
                <Text type="secondary"> （第 {validation.errorLine} 行，第 {validation.errorColumn} 列）</Text>
              )}
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                常见原因：未闭合的 {} / []，多余逗号，字符串使用了单引号，键未加引号。
              </Text>
            </Paragraph>
          }
        />
      )}
      {validation.isValid && (
        <div style={{ marginTop: 12 }}>
          <JsonOutput
            title="格式化输出（同步预览）"
            content={JSON.stringify(validation.parsed, null, 2)}
            language="json"
          />
        </div>
      )}
    </Card>
  );
};

export default JsonValidator;
