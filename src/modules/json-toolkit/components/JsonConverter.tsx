import { useMemo, useState } from "react";
import { Card, Segmented, Typography, Alert, Empty, Space, Tag } from "antd";
import JsonOutput from "./JsonOutput";
import { jsonToYaml, jsonToCsv, jsonToTsv, jsonToXml, jsonToProperties } from "../utils/jsonConverter";

const { Text } = Typography;

type Format = "yaml" | "csv" | "tsv" | "xml" | "properties";

interface JsonConverterProps {
  data: unknown;
  onDataValid: boolean;
}

const JsonConverter = ({ data, onDataValid }: JsonConverterProps) => {
  const [format, setFormat] = useState<Format>("yaml");

  const { result, warning } = useMemo(() => {
    if (!onDataValid) {
      return { result: "", warning: "请先输入有效 JSON" };
    }
    try {
      switch (format) {
        case "yaml":
          return { result: jsonToYaml(data), warning: undefined };
        case "csv":
          if (!Array.isArray(data)) {
            return { result: "", warning: "CSV 转换仅支持对象数组" };
          }
          return { result: jsonToCsv(data), warning: undefined };
        case "tsv":
          if (!Array.isArray(data)) {
            return { result: "", warning: "TSV 转换仅支持对象数组" };
          }
          return { result: jsonToTsv(data), warning: undefined };
        case "xml":
          return { result: jsonToXml(data), warning: undefined };
        case "properties":
          return { result: jsonToProperties(data), warning: undefined };
      }
    } catch (e) {
      return { result: "", warning: (e as Error).message };
    }
  }, [data, format, onDataValid]);

  const titleMap: Record<Format, string> = {
    yaml: "YAML 输出",
    csv: "CSV 输出",
    tsv: "TSV 输出",
    xml: "XML 输出",
    properties: "Properties 输出",
  };

  const langMap: Record<Format, "yaml" | "csv" | "xml" | "text"> = {
    yaml: "yaml",
    csv: "csv",
    tsv: "csv",
    xml: "xml",
    properties: "text",
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>格式转换</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            JSON → 其他格式
          </Text>
        </Space>
      }
      extra={
        <Segmented
          value={format}
          onChange={(v) => setFormat(v as Format)}
          options={[
            { label: "YAML", value: "yaml" },
            { label: "CSV", value: "csv" },
            { label: "TSV", value: "tsv" },
            { label: "XML", value: "xml" },
            { label: "Properties", value: "properties" },
          ]}
        />
      }
      className="json-converter"
      styles={{ body: { padding: 12 } }}
    >
      {warning ? (
        <Alert type="warning" showIcon message={warning} style={{ marginBottom: 12 }} />
      ) : !result ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无输出" />
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <Tag color="blue">{format.toUpperCase()}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              字符数：{result.length}
            </Text>
          </div>
          <JsonOutput
            title={titleMap[format]}
            content={result}
            language={langMap[format]}
            emptyText="无数据"
          />
        </>
      )}
    </Card>
  );
};

export default JsonConverter;
