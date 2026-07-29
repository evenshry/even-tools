import { useState, useMemo } from "react";
import { Card, Input, Typography, Alert, Space, Tag } from "antd";
import { QueryResultList } from "./JsonOutput";
import { queryJsonPath } from "../utils/jsonPath";

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface JsonPathQueryProps {
  data: unknown;
  onDataValid: boolean;
}

const examples = [
  { label: "$.user.name", expr: "$.user.name" },
  { label: "$..name", expr: "$..name" },
  { label: "$.teams[*].lead", expr: "$.teams[*].lead" },
  { label: "$.list[0:2]", expr: "$.list[0:2]" },
  { label: "$..skills", expr: "$..skills" },
];

const JsonPathQuery = ({ data, onDataValid }: JsonPathQueryProps) => {
  const [expr, setExpr] = useState("$..name");

  const result = useMemo(() => {
    if (!onDataValid) {
      return { ok: false, error: "请先输入有效 JSON", matches: [] };
    }
    return queryJsonPath(data, expr);
  }, [data, expr, onDataValid]);

  return (
    <Card
      title={
        <Space>
          <Text strong>JSONPath 查询</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 $.key / [index] / [start:end] / [*] / ..key
          </Text>
        </Space>
      }
      className="json-path-query"
    >
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        语法示例：点击下方标签快速填入
      </Paragraph>
      <Space wrap style={{ marginBottom: 12 }}>
        {examples.map((ex) => (
          <Tag
            key={ex.expr}
            color="blue"
            style={{ cursor: "pointer" }}
            onClick={() => setExpr(ex.expr)}
          >
            {ex.label}
          </Tag>
        ))}
      </Space>
      <Search
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="输入 JSONPath 表达式，例如 $.user.address.city"
        enterButton="查询"
        onSearch={() => {}}
        style={{ marginBottom: 12 }}
        spellCheck={false}
      />
      {result.error && (
        <Alert type="error" showIcon message={result.error} style={{ marginBottom: 12 }} />
      )}
      {result.ok && <QueryResultList results={result.matches} />}
    </Card>
  );
};

export default JsonPathQuery;
