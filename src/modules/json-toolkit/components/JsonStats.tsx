import { Card, Descriptions, Tag, Typography } from "antd";
import type { JsonToolkitTypes } from "../data/interface";
import { formatBytes } from "../utils/jsonUtils";

const { Text } = Typography;

interface JsonStatsProps {
  stats: JsonToolkitTypes.JsonStats | null;
}

const typeColor: Record<string, string> = {
  object: "purple",
  array: "cyan",
  string: "green",
  number: "orange",
  boolean: "magenta",
  null: "default",
};

const JsonStats = ({ stats }: JsonStatsProps) => {
  if (!stats) {
    return (
      <Card title="统计信息" className="json-stats">
        <Text type="secondary">尚无可用数据</Text>
      </Card>
    );
  }

  const items = [
    { label: "原始大小", value: formatBytes(stats.size) },
    { label: "节点总数", value: stats.totalNodes },
    { label: "最大嵌套深度", value: stats.depth },
    { label: "对象数量", value: <Tag color={typeColor.object}>{stats.objects}</Tag> },
    { label: "数组数量", value: <Tag color={typeColor.array}>{stats.arrays}</Tag> },
    { label: "字符串数量", value: <Tag color={typeColor.string}>{stats.strings}</Tag> },
    { label: "数字数量", value: <Tag color={typeColor.number}>{stats.numbers}</Tag> },
    { label: "布尔值数量", value: <Tag color={typeColor.boolean}>{stats.booleans}</Tag> },
    { label: "null 数量", value: <Tag color={typeColor.null}>{stats.nulls}</Tag> },
    { label: "键总数", value: stats.keys },
  ];

  return (
    <Card title="统计信息" className="json-stats">
      <Descriptions column={2} size="small" bordered>
        {items.map((it) => (
          <Descriptions.Item key={it.label} label={it.label}>
            {it.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
};

export default JsonStats;
