import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { Tree, Input, Tag, Typography, Empty, Tooltip, message, Button, Space } from "antd";
import {
  CopyOutlined,
  SearchOutlined,
  TagOutlined,
  NumberOutlined,
  NodeIndexOutlined,
  UpOutlined,
  DownOutlined,
  CloseCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import type { JsonToolkitTypes } from "../data/interface";
import { buildTree } from "../utils/jsonUtils";

const { Text } = Typography;

interface JsonTreeViewerProps {
  data: unknown;
  onPathClick?: (path: string, value: unknown) => void;
  pathErrors?: Record<string, JsonToolkitTypes.JsonDiagnosticError[]>;
  errorNodes?: Record<string, { keyName: string; errorMessage: string; errorSuggestion: string; valueText: string; startOffset: number; errorTypes?: string[]; hasCriticalError?: boolean; errors?: JsonToolkitTypes.JsonDiagnosticError[] }[]>;
  nodeOffsets?: Record<string, number>;
}

// 各类型的值文本颜色
const typeValueColor: Record<string, string> = {
  object: "#722ed1",
  array: "#13c2c2",
  string: "#389e0d",
  number: "#fa8c16",
  boolean: "#eb2f96",
  null: "#8c8c8c",
  undefined: "#bfbfbf",
};

// 类型标签使用的 antd Tag 颜色
const typeTagColor: Record<string, string> = {
  object: "purple",
  array: "cyan",
  string: "green",
  number: "orange",
  boolean: "magenta",
  null: "default",
  undefined: "default",
};

type AntdTreeNode = {
  key: string;
  title: React.ReactNode;
  path?: string;
  children?: AntdTreeNode[];
};

interface DisplayOptions {
  showType: boolean;
  showIndex: boolean;
  showPath: boolean;
  currentMatchKey: string | null; // 当前高亮匹配节点 key
}

// 判断节点是否为数组下标项（keyName 为纯数字字符串）
const isArrayItem = (node: JsonToolkitTypes.TreeNode) => /^\d+$/.test(node.keyName);

// 渲染节点的值部分（按类型上色）
const renderValueText = (node: JsonToolkitTypes.TreeNode) => {
  const color = typeValueColor[node.type];
  return <span style={{ color, fontFamily: '"Monaco","Menlo","Consolas",monospace', fontSize: 12 }}>{node.valueText}</span>;
};

// 判断节点是否匹配关键字
const nodeMatches = (node: JsonToolkitTypes.TreeNode, lowerKeyword: string) => {
  return (
    node.keyName.toLowerCase().includes(lowerKeyword) ||
    node.valueText.toLowerCase().includes(lowerKeyword) ||
    node.path.toLowerCase().includes(lowerKeyword)
  );
};

// 将业务树节点转为 antd Tree 所需结构
const convertNode = (
  node: JsonToolkitTypes.TreeNode,
  keyword: string,
  opts: DisplayOptions,
  handleCopyPath: (e: React.MouseEvent, path: string) => void,
  pathErrors: Record<string, JsonToolkitTypes.JsonDiagnosticError[]>,
  isRoot = false,
): AntdTreeNode => {
  const lowerKeyword = keyword.toLowerCase();
  const matchesKeyword = !keyword || nodeMatches(node, lowerKeyword);
  const isCurrentMatch = opts.currentMatchKey === node.path;

  const typeTag = opts.showType ? (
    <Tag color={typeTagColor[node.type]} style={{ marginInlineEnd: 4, fontSize: 11, lineHeight: "18px" }}>
      {node.type}
    </Tag>
  ) : null;

  const indexTag =
    opts.showIndex && isArrayItem(node) ? (
      <Tag color="blue" style={{ marginInlineEnd: 4, fontSize: 11, lineHeight: "18px" }}>
        #{node.keyName}
      </Tag>
    ) : null;

  const pathTag = opts.showPath ? (
    <Tooltip title="点击复制路径">
      <Tag
        className="json-tree-viewer__path-tag"
        onClick={(e) => handleCopyPath(e, node.path)}
        style={{ marginInlineEnd: 0, fontSize: 11, cursor: "pointer", lineHeight: "18px" }}
      >
        {node.path}
        <CopyOutlined style={{ marginInlineStart: 4 }} />
      </Tag>
    </Tooltip>
  ) : null;

  let keyPart: React.ReactNode = null;
  if (!isRoot) {
    if (isArrayItem(node)) {
      keyPart = null;
    } else {
      keyPart = (
        <span
          className="json-tree-viewer__key"
          style={{ color: "#1890ff", fontFamily: '"Monaco","Menlo","Consolas",monospace', fontSize: 12, fontWeight: 500 }}
        >
          {node.keyName}
        </span>
      );
    }
  }

  // 错误节点单独渲染
  if (node.isError) {
    const individualErrors = node.errors || [];
    const hasMultiple = individualErrors.length > 1;
    const count = individualErrors.length;

    // 构建 hover 详情（每个错误单独列出）
    const detailContent = (
      <div style={{ maxWidth: 360 }}>
        {hasMultiple && (
          <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 6 }}>
            <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
            共 {count} 处问题
          </div>
        )}
        {individualErrors.length > 0 ? individualErrors.map((e, i) => (
          <div
            key={i}
            style={{
              padding: '4px 0',
              borderBottom: i < individualErrors.length - 1 ? '1px solid #303030' : 'none',
            }}
          >
            <div style={{ color: '#ff7875', fontSize: 12, fontWeight: 500 }}>
              <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
              {e.message}
            </div>
            <div style={{ color: '#faad14', fontSize: 12, marginTop: 2 }}>
              <BulbOutlined style={{ marginInlineEnd: 4 }} />
              {e.suggestion}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 2 }}>
              第 {e.line} 行，第 {e.column} 列
            </div>
          </div>
        )) : (
          <>
            <div style={{ color: '#ff7875', fontSize: 12, fontWeight: 500 }}>
              <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
              {node.errorMessage}
            </div>
            {node.errorSuggestion && (
              <div style={{ color: '#faad14', fontSize: 12, marginTop: 2 }}>
                <BulbOutlined style={{ marginInlineEnd: 4 }} />
                {node.errorSuggestion}
              </div>
            )}
          </>
        )}
      </div>
    );

    // 补全建议的 hover 内容
    const allSuggestions = individualErrors.length > 0
      ? individualErrors.map(e => e.suggestion).filter(Boolean)
      : (node.errorSuggestion ? [node.errorSuggestion] : []);

    const suggestionContent = allSuggestions.length > 0 ? (
      <div style={{ maxWidth: 320 }}>
        <div style={{ color: '#faad14', fontWeight: 500, marginBottom: 4 }}>
          <BulbOutlined style={{ marginInlineEnd: 4 }} />
          修复建议
        </div>
        {allSuggestions.map((s, i) => (
          <div key={i} style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>
            {i + 1}. {s}
          </div>
        ))}
      </div>
    ) : null;

    return {
      key: node.path,
      title: (
        <span className={`json-tree-viewer__node json-tree-viewer__node--error ${matchesKeyword ? "" : "is-dim"}`}>
          <span className="json-tree-viewer__main">
            {!isRoot && keyPart !== null && (
              <>
                {keyPart}
                <span className="json-tree-viewer__colon" style={{ marginInlineEnd: 6, color: "#8c8c8c" }}>:</span>
              </>
            )}
            {/* 显示原始值（从源文本提取，可能包含原始错误格式）*/}
            {node.errorOriginalValue && (
              <span className="json-tree-viewer__error-original-value">
                {node.errorOriginalValue}
              </span>
            )}
            {/* 错误消息（hover 展示详情） */}
            <Tooltip title={detailContent}>
              <span className="json-tree-viewer__error-box">
                <span className="json-tree-viewer__error-msg">
                  <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                  {node.errorMessage}
                </span>
              </span>
            </Tooltip>
            {/* 修复建议（hover 查看所有补全建议） */}
            {suggestionContent && (
              <Tooltip title={suggestionContent}>
                <span className="json-tree-viewer__error-suggest-tag">
                  <BulbOutlined style={{ marginInlineEnd: 4 }} />
                  补全
                </span>
              </Tooltip>
            )}
          </span>
        </span>
      ),
      path: node.path,
    };
  }

  const nodeErrors = pathErrors[node.path];
  const errorInline = nodeErrors && nodeErrors.length > 0 ? (
    <span className="json-tree-viewer__error-inline">
      {(() => {
        const hasMultiple = nodeErrors.length > 1;
        const primaryErr = nodeErrors[0];
        const count = nodeErrors.length;
        const summary = hasMultiple
          ? `${primaryErr.message} 等 ${count} 处问题`
          : primaryErr.message;

        // 构建 hover 详情
        const detailContent = (
          <div style={{ maxWidth: 360 }}>
            {hasMultiple && (
              <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 6 }}>
                <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                共 {count} 处问题
              </div>
            )}
            {nodeErrors.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 0',
                  borderBottom: i < nodeErrors.length - 1 ? '1px solid #303030' : 'none',
                }}
              >
                <div style={{ color: '#ff7875', fontSize: 12, fontWeight: 500 }}>
                  <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                  {e.message}
                </div>
                <div style={{ color: '#faad14', fontSize: 12, marginTop: 2 }}>
                  <BulbOutlined style={{ marginInlineEnd: 4 }} />
                  {e.suggestion}
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 2 }}>
                  第 {e.line} 行，第 {e.column} 列
                </div>
              </div>
            ))}
          </div>
        );

        // 合并修复建议
        const allSuggestions = nodeErrors.map(e => e.suggestion).filter(Boolean);
        const suggestionContent = (
          <div style={{ maxWidth: 320 }}>
            <div style={{ color: '#faad14', fontWeight: 500, marginBottom: 4 }}>
              <BulbOutlined style={{ marginInlineEnd: 4 }} />
              修复建议
            </div>
            {allSuggestions.map((s, i) => (
              <div key={i} style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>
                {i + 1}. {s}
              </div>
            ))}
          </div>
        );

        return (
          <>
            <Tooltip title={detailContent}>
              <span className="json-tree-viewer__error-box">
                <span className="json-tree-viewer__error-msg">
                  <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                  {summary}
                </span>
              </span>
            </Tooltip>
            <Tooltip title={suggestionContent}>
              <span className="json-tree-viewer__error-suggest-tag">
                <BulbOutlined style={{ marginInlineEnd: 4 }} />
                补全
              </span>
            </Tooltip>
          </>
        );
      })()}
    </span>
  ) : null;

  const title = (
    <span
      className={`json-tree-viewer__node ${matchesKeyword ? "" : "is-dim"} ${isCurrentMatch ? "is-current-match" : ""}`}
    >
      <span className="json-tree-viewer__main">
        {indexTag}
        {keyPart}
        {!isRoot && keyPart !== null && (
          <span className="json-tree-viewer__colon" style={{ marginInlineEnd: 6, color: "#8c8c8c" }}>
            :
          </span>
        )}
        {renderValueText(node)}
        {errorInline}
      </span>
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
    children: node.children?.map((c) => convertNode(c, keyword, opts, handleCopyPath, pathErrors)),
  };
};

// 收集所有节点路径，用于默认全展开
const collectAllKeys = (node: JsonToolkitTypes.TreeNode, out: string[] = []): string[] => {
  out.push(node.path);
  if (node.children) {
    node.children.forEach((c) => collectAllKeys(c, out));
  }
  return out;
};

// 收集所有匹配关键字的节点 key
const collectMatchKeys = (node: JsonToolkitTypes.TreeNode, lowerKeyword: string, out: string[] = []): string[] => {
  if (nodeMatches(node, lowerKeyword)) {
    out.push(node.path);
  }
  if (node.children) {
    node.children.forEach((c) => collectMatchKeys(c, lowerKeyword, out));
  }
  return out;
};

const JsonTreeViewer = ({ data, onPathClick, pathErrors = {}, errorNodes, nodeOffsets }: JsonTreeViewerProps) => {
  const [search, setSearch] = useState("");
  const [showType, setShowType] = useState(true);
  const [showIndex, setShowIndex] = useState(true);
  const [showPath, setShowPath] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [treeHeight, setTreeHeight] = useState(() => window.innerHeight - 240);
  const [matchIndex, setMatchIndex] = useState(0); // 当前定位的匹配索引
  const treeRef = useRef<any>(null);

  // 响应窗口 resize
  useLayoutEffect(() => {
    const onResize = () => setTreeHeight(window.innerHeight - 240);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(path);
    message.success(`已复制路径：${path}`);
    onPathClick?.(path, undefined);
  };

  const root = useMemo(() => {
    const tree = data === undefined ? null : buildTree(data, "$", errorNodes, nodeOffsets);
    console.log("[JsonTreeViewer] root tree:", JSON.stringify(tree, (key, value) => {
      if (key === "value" && typeof value === "object" && value !== null) return "[object]";
      return value;
    }, 2));
    return tree;
  }, [data, errorNodes, nodeOffsets]);

  // 计算匹配列表
  const matchKeys = useMemo(() => {
    if (!root || !search.trim()) return [];
    return collectMatchKeys(root, search.trim().toLowerCase());
  }, [root, search]);

  // search 变化时重置 matchIndex
  useEffect(() => {
    setMatchIndex(0);
  }, [search]);

  // 当前高亮的匹配节点 key
  const currentMatchKey = matchKeys.length > 0 ? matchKeys[matchIndex] : null;

  const treeData = useMemo(() => {
    if (!root) return [];
    return [convertNode(root, search, { showType, showIndex, showPath, currentMatchKey }, handleCopyPath, pathErrors, true)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, search, showType, showIndex, showPath, currentMatchKey, pathErrors]);

  // data 变化时默认全展开
  useEffect(() => {
    if (root) {
      setExpandedKeys(collectAllKeys(root));
    } else {
      setExpandedKeys([]);
    }
  }, [root]);

  // 定位到当前匹配节点：优先使用 antd Tree 内置 scrollTo（精确计算位置）
  useEffect(() => {
    if (!currentMatchKey) return;
    if (matchKeys.length < 2) return; // 只有一项无需滚动定位

    requestAnimationFrame(() => {
      // 方法1：antd Tree 原生 scrollTo（最精确，内部使用真实渲染高度）
      if (treeRef.current?.scrollTo) {
        try {
          treeRef.current.scrollTo({ key: currentMatchKey, align: "top" });
          return;
        } catch {
          // fallback to DOM query
        }
      }

      // 方法2：直接找到目标 DOM 节点，设置其 offsetTop 到滚动容器
      const holders = document.querySelectorAll(".ant-tree-list-holder");
      holders.forEach((holderEl) => {
        const holder = holderEl as HTMLElement;
        const target = holder.querySelector(
          `[data-key="${CSS.escape(currentMatchKey)}"]`
        ) as HTMLElement | null;
        if (target) {
          holder.scrollTop = target.offsetTop;
        }
      });
    });
  }, [currentMatchKey, matchKeys.length]);

  const handlePrev = () => {
    if (matchKeys.length === 0) return;
    setMatchIndex((i) => (i - 1 + matchKeys.length) % matchKeys.length);
  };

  const handleNext = () => {
    if (matchKeys.length === 0) return;
    setMatchIndex((i) => (i + 1) % matchKeys.length);
  };

  if (data === undefined || data === null) {
    return <Empty description={data === null ? "JSON 为 null" : "尚未载入有效 JSON"} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="json-tree-viewer">
      <div className="json-tree-viewer__search-row">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="过滤键名 / 值 / 路径"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          onPressEnter={handleNext}
        />
        {search.trim() && matchKeys.length > 0 && (
          <Space size={4} className="json-tree-viewer__search-nav">
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {matchIndex + 1}/{matchKeys.length}
            </Text>
            <Button size="small" icon={<UpOutlined />} onClick={handlePrev} title="上一个" />
            <Button size="small" icon={<DownOutlined />} onClick={handleNext} title="下一个" />
          </Space>
        )}
        {search.trim() && matchKeys.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap", marginInlineStart: 8 }}>
            无匹配
          </Text>
        )}
      </div>
      <div className="json-tree-viewer__toolbar">
        <Space size={4} wrap>
          <Button size="small" type={showType ? "primary" : "default"} icon={<TagOutlined />} onClick={() => setShowType((v) => !v)}>
            类型
          </Button>
          <Button size="small" type={showIndex ? "primary" : "default"} icon={<NumberOutlined />} onClick={() => setShowIndex((v) => !v)}>
            序号
          </Button>
          <Button size="small" type={showPath ? "primary" : "default"} icon={<NodeIndexOutlined />} onClick={() => setShowPath((v) => !v)}>
            路径
          </Button>

          {Object.entries(typeValueColor).map(([t, c]) => (
            <Tag key={t} color={typeTagColor[t]} style={{ marginInlineEnd: 3, fontSize: 11, marginBottom: 0 }}>
              <span style={{ color: c }}>●</span> {t}
            </Tag>
          ))}
          {showPath && (
            <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 4 }}>
              <CopyOutlined /> 点击路径可复制
            </Text>
          )}
        </Space>
      </div>
      <Tree
        ref={treeRef}
        virtual
        showLine
        height={treeHeight}
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys as string[])}
        treeData={treeData}
        selectedKeys={currentMatchKey ? [currentMatchKey] : []}
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
