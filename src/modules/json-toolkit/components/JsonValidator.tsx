import { Card, Typography, Alert, Space, Tag, List, Button } from "antd";
import { BulbOutlined, FileSyncOutlined } from "@ant-design/icons";
import JsonOutput from "./JsonOutput";
import { getIndentString } from "../utils/jsonUtils";
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
  value_expected: { label: "缺少值", color: "red" },
  colon_expected: { label: "缺少冒号", color: "orange" },
  comma_expected: { label: "缺少逗号", color: "orange" },
  close_brace_expected: { label: "缺少 }", color: "red" },
  close_bracket_expected: { label: "缺少 ]", color: "red" },
  end_of_file_expected: { label: "多余内容", color: "orange" },
  parse_error: { label: "解析错误", color: "red" },
};

interface JsonValidatorProps {
  strictValid: boolean;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  parsed?: unknown;
  diagnostics?: JsonToolkitTypes.JsonDiagnosticError[];
  fixCount: number;
  indent: JsonToolkitTypes.IndentStyle;
  onApplyFixes?: () => void;
}

const JsonValidator = ({
  strictValid,
  error,
  errorLine,
  errorColumn,
  parsed,
  diagnostics,
  fixCount,
  indent,
  onApplyFixes,
}: JsonValidatorProps) => {
  const hasDiagnostics = diagnostics !== undefined && diagnostics.length > 0;
  const canApply = fixCount > 0 && onApplyFixes !== undefined;

  return (
    <Card
      title={
        <Space>
          <Text strong>校验结果</Text>
          {strictValid ? <Tag color="success">VALID</Tag> : <Tag color="error">INVALID</Tag>}
          {hasDiagnostics && <Tag color="red">{diagnostics.length} 处错误</Tag>}
          {!strictValid && canApply && <Tag color="orange">可自动修复</Tag>}
        </Space>
      }
      extra={
        canApply ? (
          <Button size="small" type="primary" icon={<FileSyncOutlined />} onClick={onApplyFixes}>
            一键修复（{fixCount} 处）
          </Button>
        ) : null
      }
      className="json-validator"
      styles={{ body: { padding: 12 } }}
    >
      {strictValid ? (
        <Alert
          type="success"
          showIcon
          message="JSON 格式正确"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              <Text>
                已成功解析为 {Array.isArray(parsed) ? "数组" : typeof parsed} 类型。
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                可在「可视化树」标签中查看结构，或在「路径查询」「格式转换」中使用。
              </Text>
            </Paragraph>
          }
        />
      ) : (
        <Alert
          type={canApply ? "warning" : "error"}
          showIcon
          message={canApply ? "JSON 校验失败（可一键修复）" : "JSON 校验失败"}
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              <Text>{error ?? "无法解析该 JSON"}</Text>
              {errorLine !== undefined && (
                <Text type="secondary"> （第 {errorLine} 行，第 {errorColumn} 列）</Text>
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
          header={
            <Text strong style={{ fontSize: 12 }}>
              <BulbOutlined /> 错误诊断
            </Text>
          }
          dataSource={diagnostics}
          renderItem={(item) => {
            const typeInfo = errorTypeLabel[item.type] || { label: item.type, color: "default" };
            return (
              <List.Item style={{ padding: "6px 10px" }}>
                <Space direction="vertical" size={0} style={{ width: "100%" }}>
                  <Space size={4} wrap>
                    <Tag color={typeInfo.color} style={{ fontSize: 11, lineHeight: "18px" }}>
                      {typeInfo.label}
                    </Tag>
                    <Text style={{ fontSize: 12 }}>{item.message}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      L{item.line}:C{item.column}
                    </Text>
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

      {parsed !== undefined && (
        <div style={{ marginTop: 12 }}>
          <JsonOutput
            title={strictValid ? "格式化输出（同步预览）" : "自动修复后的结果预览（未应用）"}
            content={
              (() => {
                try {
                  return JSON.stringify(parsed, null, getIndentString(indent));
                } catch {
                  return "";
                }
              })()
            }
            language="json"
          />
        </div>
      )}
    </Card>
  );
};

export default JsonValidator;
