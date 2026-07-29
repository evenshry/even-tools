import { useMemo, useState } from "react";
import { Tree, Input, Tag, Typography, Empty, Tooltip, message } from "antd";
import { CopyOutlined, SearchOutlined } from "@ant-design/icons";
import type { JsonToolkitTypes } from "../data/interface";
import { buildTree } from "../utils/jsonUtils";

const { Text } = Typography;

interface JsonTreeViewerProps {
  data: unknown;
  onPathClick?: (path: string, value: unknown) => void;
}

const typeColor: Record<string, string> = {
  object: "#722ed1",
  array: "#13c2c2",
  string: "#389e0d",
  number: "#fa8c16",
  boolean: "#eb2f96",
  null: "#8c8c8c",
  undefined: "#bfbfbf",
};

type AntdTreeNode = {
  key: string;
  title: React.ReactNode;
  path?: string;
  children?: AntdTreeNode[];
};

// 将业务树节点转为 antd Tree 所需结构
const convertNode = (
  node: JsonToolkitTypes.TreeNode,
  keyword: string,
  handleCopyPath: (e: React.MouseEvent, path: string) => void
): AntdTreeNode => {
  const matchesKeyword =
    !keyword ||
    node.label.toLowerCase().includes(keyword.toLowerCase()) ||
    node.path.toLowerCase().includes(keyword.toLowerCase());

  const typeTag = (
    <Tag color={typeColor[node.type]} style={{ marginInlineEnd: 4, fontSize: 11 }}>
      {node.type}
    </Tag>
  );

  const pathTag = (
    <Tooltip title="点击复制路径">
      <Tag
        className="json-tree-viewer__path-tag"
        onClick={(e) => handleCopyPath(e, node.path)}
        style={{ marginInlineEnd: 0, fontSize: 11, cursor: "pointer" }}
      >
        {node.path}
        <CopyOutlined style={{ marginInlineStart: 4 }} />
      </Tag>
    </Tooltip>
  );

  const title = (
    <span className={`json-tree-viewer__node ${matchesKeyword ? "" : "is-dim"}`}>
      <span className="json-tree-viewer__label">{node.label}</span>
      <span className="json-tree-viewer__meta">
        {typeTag}
        {pathTag}
      </span>
    </span>
  );

  return {
    key: node.path,
    title,
    path: node.path,
    children: node.children?.map((c) => convertNode(c, keyword, handleCopyPath)),
  };
};

const JsonTreeViewer = ({ data, onPathClick }: JsonTreeViewerProps) => {
  const [search, setSearch] = useState("");

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(path);
    message.success(`已复制路径：${path}`);
    onPathClick?.(path, undefined);
  };

  const treeData = useMemo(() => {
    if (data === undefined) return [];
    const root = buildTree(data);
    return [convertNode(root, search, handleCopyPath)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search]);

  if (data === undefined || data === null) {
    return (
      <Empty
        description={data === null ? "JSON 为 null" : "尚未载入有效 JSON"}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="json-tree-viewer">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="过滤键名 / 值"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="json-tree-viewer__legend">
        {Object.entries(typeColor).map(([t, c]) => (
          <Tag key={t} color={c} style={{ marginInlineEnd: 4 }}>
            {t}
          </Tag>
        ))}
        <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>
          点击节点复制路径
        </Text>
      </div>
      <Tree
        showLine
        defaultExpandAll={false}
        defaultExpandedKeys={["$"]}
        treeData={treeData}
        onSelect={(_keys, info) => {
          const node = info.node as unknown as { path?: string };
          if (node?.path) {
            onPathClick?.(node.path, undefined);
          }
        }}
        className="json-tree-viewer__tree"
      />
    </div>
  );
};

export default JsonTreeViewer;
