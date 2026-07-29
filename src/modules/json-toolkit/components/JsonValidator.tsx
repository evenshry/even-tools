import { Card, Typography, Alert, Space, Tag, List, Button } from "antd";
import { BulbOutlined, FileSyncOutlined } from "@ant-design/icons";
import JsonOutput from "./JsonOutput";
import { validateJson } from "../utils/jsonUtils";
import { useMemo } from "react";
import type { JsonToolkitTypes } from "../data/interface";

const { Text, Paragraph } = Typography;

const errorTypeLabel: Record<string, { label: string; color: string }> = {
  invalid_symbol: { label: "无效符号", color: "red" },
  invalid_number: { label: "无效数字", color: "orange" },
  invalid_string: { label: "无效字符串", color: "magenta" },
  invalid_comment: { label: "无效注释", color: "purple" },
  trailing_comma: { label: "尾随逗号", color: "volcano" },
  property_name_unquoted: { label: "属性名缺引号", color: "red" },
  unexpected_end_of_comment: { label: "注释未闭合", color: "purple" },
  unexpected_end_of_string: { label: "字符串未闭合", color: "red" },
  unexpected_end_of_number: { label: "数字不完整", color: "orange" },
  invalid_unicode: { label: "无效 Unicode", color: "magenta" },
  invalid_escape_character: { label: "无效转义", color: "magenta" },
  invalid_character: { label: "无效字符", color: "red" },
  empty_character: { label: "空字符", color: "orange" },
  invalid_unicode_escape: { label: "无效 Unicode", color: "magenta" },
  invalid_hex_digit: { label: "无效十六进制", color: "orange" },
  unexpected_token: { label: "意外 token", color: "red" },
  single_quotes: { label: "单引号", color: "orange" },
  comment: { label: "注释", color: "purple" },
  nan_or_infinity: { label: "NaN/Infinity", color: "orange" },
  // 新增映射
  value_expected: { label: "缺少值", color: "red" },
  colon_expected: { label: "缺少冒号", color: "orange" },
  comma_expected: { label: "缺少逗号", color: "orange" },
  close_brace_expected: { label: "缺少 }", color: "red" },
  close_bracket_expected: { label: "缺少 ]", color: "red" },
  end_of_file_expected: { label: "多余内容", color: "orange" },
};

interface JsonValidatorProps {
  rawText: string;
  diagnostics?: JsonToolkitTypes.JsonDiagnosticError[];
  fixes?: Array<{ position: number; length: number; replacement: string; description: string }>;
  onApplyFixes?: () => void;
}

const JsonValidator = ({ rawText, diagnostics, fixes, onApplyFixes }: JsonValidatorProps) => {
  const validation = useMemo(() => validateJson(rawText), [rawText]);
  const hasDiagnostics = diagnostics && diagnostics.length > 0;

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
          {hasDiagnostics && (
            <Tag color="red">{diagnostics!.length} 处错误</Tag>
          )}
        </Space>
      }
      extra={
        fixes && fixes.length > 0 && onApplyFixes ? (
          <Button size="small" type="primary" icon={<FileSyncOutlined />} onClick={onApplyFixes}>
            一键修复（{fixes.length} 处）
          </Button>
        ) : null
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
            </Paragraph>
          }
        />
      )}

      {hasDiagnostics && (
        <List
          size="small"
          bordered
          style={{ marginTop: 12 }}
          header={<Text strong style={{ fontSize: 12 }}><BulbOutlined /> 错误诊断</Text>}
          dataSource={diagnostics!}
          renderItem={(item) => {
            const typeInfo = errorTypeLabel[item.type] || { label: item.type, color: "default" };
            return (
              <List.Item style={{ padding: "6px 10px" }}>
                <Space direction="vertical" size={0} style={{ width: "100%" }}>
                  <Space size={4} wrap>
                    <Tag color={typeInfo.color} style={{ fontSize: 11, lineHeight: "18px" }}>{typeInfo.label}</Tag>
                    <Text style={{ fontSize: 12 }}>{item.message}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>L{item.line}:C{item.column}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11, paddingLeft: 4 }}>
                    <BulbOutlined style={{ marginRight: 4 }} />
                    {item.suggestion}
                  </Text>
                </Space>
              </List.Item>
            );
          }}
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
