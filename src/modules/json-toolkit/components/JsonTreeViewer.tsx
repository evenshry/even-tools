import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { Tree, Input, Tag, Typography, Empty, Tooltip, message, Button, Space, Popover } from "antd";
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
  SettingOutlined,
  ColumnHeightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import type { JsonToolkitTypes } from "../data/interface";
import { buildTree } from "../utils/jsonUtils";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

const { Text } = Typography;

interface JsonTreeViewerProps {
  data: unknown;
  onPathClick?: (path: string, value: unknown) => void;
  pathErrors?: Record<string, JsonToolkitTypes.JsonDiagnosticError[]>;
  errorNodes?: Record<
    string,
    {
      keyName: string;
      errorMessage: string;
      errorSuggestion: string;
      valueText: string;
      startOffset: number;
      errorTypes?: string[];
      hasCriticalError?: boolean;
      errors?: JsonToolkitTypes.JsonDiagnosticError[];
    }[]
  >;
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
  showCount: boolean;
  currentMatchKey: string | null; // 当前高亮匹配节点 key
}

// 判断节点是否为数组下标项（keyName 为纯数字字符串）
const isArrayItem = (node: JsonToolkitTypes.TreeNode) => /^\d+$/.test(node.keyName);

// 渲染节点的值部分（按类型上色）
const renderValueText = (node: JsonToolkitTypes.TreeNode, showCount: boolean) => {
  let text = node.valueText;
  if (!showCount && (node.type === "object" || node.type === "array")) {
    text = stripCountFromValueText(text);
  }
  const color = typeValueColor[node.type];
  return <span style={{ color, fontFamily: '"Monaco","Menlo","Consolas",monospace', fontSize: 12 }}>{text}</span>;
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
  mode: 'light' | 'dark',
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
          style={{ color: semanticColors.info[mode], fontFamily: '"Monaco","Menlo","Consolas",monospace', fontSize: 12, fontWeight: 500 }}
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
          <div style={{ color: semanticColors.error[mode], fontWeight: 500, marginBottom: 6 }}>
            <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />共 {count} 处问题
          </div>
        )}
        {individualErrors.length > 0 ? (
          individualErrors.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "4px 0",
                borderBottom: i < individualErrors.length - 1 ? "1px solid #303030" : "none",
              }}
            >
              <div style={{ color: semanticColors.error2[mode], fontSize: 12, fontWeight: 500 }}>
                <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                {e.message}
              </div>
              <div style={{ color: semanticColors.warning[mode], fontSize: 12, marginTop: 2 }}>
                <BulbOutlined style={{ marginInlineEnd: 4 }} />
                {e.suggestion}
              </div>
              <div style={{ color: semanticColors.gray8c[mode], fontSize: 11, marginTop: 2 }}>
                第 {e.line} 行，第 {e.column} 列
              </div>
            </div>
          ))
        ) : (
          <>
            <div style={{ color: semanticColors.error2[mode], fontSize: 12, fontWeight: 500 }}>
              <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
              {node.errorMessage}
            </div>
            {node.errorSuggestion && (
              <div style={{ color: semanticColors.warning[mode], fontSize: 12, marginTop: 2 }}>
                <BulbOutlined style={{ marginInlineEnd: 4 }} />
                {node.errorSuggestion}
              </div>
            )}
          </>
        )}
      </div>
    );

    // 补全建议的 hover 内容
    const allSuggestions =
      individualErrors.length > 0
        ? individualErrors.map((e) => e.suggestion).filter(Boolean)
        : node.errorSuggestion
          ? [node.errorSuggestion]
          : [];

    const suggestionContent =
      allSuggestions.length > 0 ? (
        <div style={{ maxWidth: 320 }}>
          <div style={{ color: semanticColors.warning[mode], fontWeight: 500, marginBottom: 4 }}>
            <BulbOutlined style={{ marginInlineEnd: 4 }} />
            修复建议
          </div>
          {allSuggestions.map((s, i) => (
            <div key={i} style={{ color: "#fff", fontSize: 12, marginTop: 2 }}>
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
                <span className="json-tree-viewer__colon" style={{ marginInlineEnd: 6, color: semanticColors.gray8c[mode] }}>
                  :
                </span>
              </>
            )}
            {/* 显示原始值（从源文本提取，可能包含原始错误格式）*/}
            {node.errorOriginalValue && <span className="json-tree-viewer__error-original-value">{node.errorOriginalValue}</span>}
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
  const errorInline =
    nodeErrors && nodeErrors.length > 0 ? (
      <span className="json-tree-viewer__error-inline">
        {(() => {
          const hasMultiple = nodeErrors.length > 1;
          const primaryErr = nodeErrors[0];
          const count = nodeErrors.length;
          const summary = hasMultiple ? `${primaryErr.message} 等 ${count} 处问题` : primaryErr.message;

          // 构建 hover 详情
          const detailContent = (
            <div style={{ maxWidth: 360 }}>
              {hasMultiple && (
                <div style={{ color: semanticColors.error[mode], fontWeight: 500, marginBottom: 6 }}>
                  <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />共 {count} 处问题
                </div>
              )}
              {nodeErrors.map((e, i) => (
                <div
                  key={i}
                  style={{
                    padding: "4px 0",
                    borderBottom: i < nodeErrors.length - 1 ? "1px solid #303030" : "none",
                  }}
                >
                  <div style={{ color: semanticColors.error2[mode], fontSize: 12, fontWeight: 500 }}>
                    <CloseCircleOutlined style={{ marginInlineEnd: 4 }} />
                    {e.message}
                  </div>
                  <div style={{ color: semanticColors.warning[mode], fontSize: 12, marginTop: 2 }}>
                    <BulbOutlined style={{ marginInlineEnd: 4 }} />
                    {e.suggestion}
                  </div>
                  <div style={{ color: semanticColors.gray8c[mode], fontSize: 11, marginTop: 2 }}>
                    第 {e.line} 行，第 {e.column} 列
                  </div>
                </div>
              ))}
            </div>
          );

          // 合并修复建议
          const allSuggestions = nodeErrors.map((e) => e.suggestion).filter(Boolean);
          const suggestionContent = (
            <div style={{ maxWidth: 320 }}>
              <div style={{ color: semanticColors.warning[mode], fontWeight: 500, marginBottom: 4 }}>
                <BulbOutlined style={{ marginInlineEnd: 4 }} />
                修复建议
              </div>
              {allSuggestions.map((s, i) => (
                <div key={i} style={{ color: "#fff", fontSize: 12, marginTop: 2 }}>
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
    <span className={`json-tree-viewer__node ${matchesKeyword ? "" : "is-dim"} ${isCurrentMatch ? "is-current-match" : ""}`}>
      <span className="json-tree-viewer__main">
        {indexTag}
        {keyPart}
        {!isRoot && keyPart !== null && (
          <span className="json-tree-viewer__colon" style={{ marginInlineEnd: 6, color: semanticColors.gray8c[mode] }}>
            :
          </span>
        )}
        {renderValueText(node, opts.showCount)}
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
    children: node.children?.map((c) => convertNode(c, keyword, opts, handleCopyPath, pathErrors, mode)),
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

// 获取指定路径节点的所有祖先节点 key（不含自身），从根到直接父级排列
const getAncestorKeys = (targetPath: string, root: JsonToolkitTypes.TreeNode): string[] => {
  const ancestors: string[] = [];
  if (targetPath === root.path) return ancestors;
  const walk = (node: JsonToolkitTypes.TreeNode): boolean => {
    if (!node.children) return false;
    for (const child of node.children) {
      if (child.path === targetPath) {
        ancestors.push(node.path);
        return true;
      }
      if (walk(child)) {
        ancestors.push(node.path);
        return true;
      }
    }
    return false;
  };
  walk(root);
  return ancestors.reverse();
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

// 根据路径计算节点的层级深度
// 根节点 $ 为 0 层，$.user 为 1 层，$.items[0].name 为 3 层
const getDepthFromPath = (path: string): number => {
  if (path === "$") return 0;
  let depth = 0;
  for (let i = 1; i < path.length; i++) {
    const ch = path[i];
    if (ch === "." || ch === "[") depth++;
  }
  return depth;
};

// 收集指定深度层级的所有可展开节点 key
const collectKeysByDepth = (node: JsonToolkitTypes.TreeNode, targetDepth: number, currentDepth = 0, out: string[] = []): string[] => {
  if (currentDepth === targetDepth && node.expandable) {
    out.push(node.path);
  }
  if (node.children) {
    node.children.forEach((c) => collectKeysByDepth(c, targetDepth, currentDepth + 1, out));
  }
  return out;
};

// 获取树中存在可展开节点的所有有效深度（过滤掉只有叶子节点的层级）
const getEffectiveDepths = (node: JsonToolkitTypes.TreeNode): number[] => {
  const depths = new Set<number>();
  const walk = (n: JsonToolkitTypes.TreeNode, depth: number) => {
    if (n.expandable && depth >= 0) {
      depths.add(depth);
    }
    if (n.children) {
      n.children.forEach((c) => walk(c, depth + 1));
    }
  };
  walk(node, 0);
  return Array.from(depths).sort((a, b) => a - b);
};

// 从 valueText 中提取不含计数的文本（如 "{} (3 项)" → "{}"）
const stripCountFromValueText = (valueText: string): string => {
  return valueText.replace(/\s*\(\d+[^\)]*\)/, "").trim();
};

const JsonTreeViewer = ({ data, onPathClick, pathErrors = {}, errorNodes, nodeOffsets }: JsonTreeViewerProps) => {
  const mode = useThemeStore((s) => s.mode);
  const [search, setSearch] = useState("");
  const [showType, setShowType] = useState(true);
  const [showIndex, setShowIndex] = useState(true);
  const [showPath, setShowPath] = useState(false);
  const [showCount, setShowCount] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [treeHeight, setTreeHeight] = useState(() => window.innerHeight - 240);
  const [matchIndex, setMatchIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    console.log(
      "[JsonTreeViewer] root tree:",
      JSON.stringify(
        tree,
        (key, value) => {
          if (key === "value" && typeof value === "object" && value !== null) return "[object]";
          return value;
        },
        2,
      ),
    );
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

  // 计算树的有效深度层级（只统计有可展开节点的层级）
  const effectiveDepths = useMemo(() => {
    if (!root) return [];
    return getEffectiveDepths(root);
  }, [root]);

  const treeData = useMemo(() => {
    if (!root) return [];
    return [convertNode(root, search, { showType, showIndex, showPath, showCount, currentMatchKey }, handleCopyPath, pathErrors, mode, true)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, search, showType, showIndex, showPath, showCount, currentMatchKey, pathErrors, mode]);

  // data 变化时默认全展开
  useEffect(() => {
    if (root) {
      setExpandedKeys(collectAllKeys(root));
    } else {
      setExpandedKeys([]);
    }
  }, [root]);

// 标记需要滚动的目标节点 + 待展开的祖先 key
  const [pendingScroll, setPendingScroll] = useState<{
    key: string;
    ancestors: string[];
  } | null>(null);

  // 触发定位：先收集需要展开的祖先，再请求滚动
  useEffect(() => {
    if (!currentMatchKey) return;
    if (matchKeys.length < 2) return; // 只有一项无需滚动定位
    if (!root) return;

    const ancestorKeys = getAncestorKeys(currentMatchKey, root);
    const expandedSet = new Set(expandedKeys);
    const toExpand = ancestorKeys.filter((k) => !expandedSet.has(k));
    if (toExpand.length > 0) {
      setExpandedKeys((prev) => Array.from(new Set([...prev, ...toExpand])));
    }
    // 始终设置 pendingScroll，让下面的 effect 在 expandedKeys 提交后再滚动
    setPendingScroll({ key: currentMatchKey, ancestors: ancestorKeys });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchKey, matchKeys.length]);

  // 真正执行滚动：等 expandedKeys 完成 commit、DOM 全部展开后再滚动
  useEffect(() => {
    if (!pendingScroll) return;
    const { key, ancestors } = pendingScroll;
    // 确保目标节点的所有祖先都已展开
    const expandedSet = new Set(expandedKeys);
    const allReady = ancestors.every((k) => expandedSet.has(k));
    if (!allReady) return; // 等待下一轮 expandedKeys 更新

    // 清除 pendingScroll
    setPendingScroll(null);

    // 多帧延迟：等虚拟列表、布局、滚动条全部稳定
    const scroll = () => {
      if (treeRef.current?.scrollTo) {
        try {
          treeRef.current.scrollTo({ key, align: "top" });
          return;
        } catch {
          // fallback to DOM query
        }
      }
      const holders = document.querySelectorAll(".ant-tree-list-holder");
      holders.forEach((holderEl) => {
        const holder = holderEl as HTMLElement;
        const target = holder.querySelector(
          `[data-key="${CSS.escape(key)}"]`,
        ) as HTMLElement | null;
        if (target) {
          holder.scrollTop = target.offsetTop;
        }
      });
    };

    // 3 帧 rAF + 一次 setTimeout 兜底，应对 antd Tree 内部虚拟列表的异步渲染
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scroll();
          // 兜底：再次执行滚动，应对 antd Tree 内部的虚拟列表异步渲染
          setTimeout(scroll, 50);
        });
      });
    });
  }, [pendingScroll, expandedKeys]);

  const handlePrev = () => {
    if (matchKeys.length === 0) return;
    setMatchIndex((i) => (i - 1 + matchKeys.length) % matchKeys.length);
  };

  const handleNext = () => {
    if (matchKeys.length === 0) return;
    setMatchIndex((i) => (i + 1) % matchKeys.length);
  };

  // 根据 UI 层级序号获取实际树深度
  const getDepthForLevel = (level: number): number => {
    return effectiveDepths[level - 1] ?? 0;
  };

  // 判断指定 UI 层级的所有可展开节点是否全部在 expandedKeys 中
  const isLevelFullyExpanded = (level: number): boolean => {
    if (!root) return false;
    const depth = getDepthForLevel(level);
    const keysAtDepth = collectKeysByDepth(root, depth);
    if (keysAtDepth.length === 0) return true;
    const expandedSet = new Set(expandedKeys);
    return keysAtDepth.every((k) => expandedSet.has(k));
  };

  // 判断所有节点是否全部展开
  const isAllExpanded = useMemo(() => {
    if (!root) return false;
    const allKeys = collectAllKeys(root);
    if (allKeys.length === 0) return true;
    const expandedSet = new Set(expandedKeys);
    return allKeys.every((k) => expandedSet.has(k));
  }, [root, expandedKeys]);

  // 全展开/全收起 切换
  const handleToggleAll = () => {
    if (!root) return;
    if (isAllExpanded) {
      setExpandedKeys([]);
    } else {
      setExpandedKeys(collectAllKeys(root));
    }
  };

  // 逐层展开/收起 切换（使用有效深度映射）
  const handleToggleLevel = (level: number) => {
    if (!root) return;
    const targetDepth = getDepthForLevel(level);
    if (isLevelFullyExpanded(level)) {
      // 该层已展开：收起该层及所有更深层级
      const filtered = expandedKeys.filter((key) => getDepthFromPath(key) < targetDepth);
      setExpandedKeys(filtered);
    } else {
      // 该层未展开：展开该层及所有祖先层级（有效深度中 <= targetDepth 的）
      const newKeys = new Set(expandedKeys);
      for (const d of effectiveDepths) {
        if (d <= targetDepth) {
          collectKeysByDepth(root, d).forEach((k) => newKeys.add(k));
        }
      }
      setExpandedKeys(Array.from(newKeys));
    }
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
          <Button size="small" type={showIndex ? "primary" : "default"} icon={<NumberOutlined />} onClick={() => setShowIndex((v) => !v)}>
            序号
          </Button>
          <Button
            size="small"
            type={showCount ? "primary" : "default"}
            icon={<ColumnHeightOutlined />}
            onClick={() => setShowCount((v) => !v)}
          >
            数量
          </Button>
          <Button size="small" type={showType ? "primary" : "default"} icon={<TagOutlined />} onClick={() => setShowType((v) => !v)}>
            类型
          </Button>
          <Button size="small" type={showPath ? "primary" : "default"} icon={<NodeIndexOutlined />} onClick={() => setShowPath((v) => !v)}>
            路径
          </Button>

          <span className="json-tree-viewer__divider" />

          <Button
            size="small"
            icon={isAllExpanded ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            type={isAllExpanded ? "primary" : "default"}
            onClick={handleToggleAll}
            title={isAllExpanded ? "收起全部" : "展开全部"}
          >
            {isAllExpanded ? "全收起" : "全展开"}
          </Button>

          {/* 逐层展开/收起控制 */}
          <Popover
            forceRender
            content={
              <div className="json-tree-viewer__level-popover" key={expandedKeys.join(",")}>
                <div className="json-tree-viewer__level-popover-title">
                  <ColumnHeightOutlined /> 层级控制（共 {effectiveDepths.length} 层）
                </div>
                <div className="json-tree-viewer__level-buttons">
                  {effectiveDepths.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      当前无可嵌套的层级
                    </Text>
                  )}
                  {effectiveDepths.map((_, idx) => {
                    const level = idx + 1;
                    const expanded = isLevelFullyExpanded(level);
                    // 第 1 层始终可用；第 N 层只有当前面所有层都展开时才可用
                    const prevAllExpanded =
                      level === 1 || Array.from({ length: level - 1 }, (_, i) => i + 1).every((l) => isLevelFullyExpanded(l));
                    const disabled = !prevAllExpanded;
                    return (
                      <div key={level} className="json-tree-viewer__level-row">
                        <span className={`json-tree-viewer__level-label ${disabled ? "is-disabled" : ""}`}>第 {level} 层</span>
                        <Button
                          size="small"
                          type={expanded ? "primary" : "default"}
                          icon={expanded ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                          disabled={disabled}
                          onClick={() => handleToggleLevel(level)}
                          title={disabled ? "请先展开上层" : expanded ? `收起第 ${level} 层` : `展开第 ${level} 层`}
                          style={{ minWidth: 72 }}
                        >
                          {expanded ? "收起" : "展开"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            }
            title={null}
            trigger="click"
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          >
            <Button size="small" icon={<SettingOutlined />}>
              层级
            </Button>
          </Popover>

          {/* {Object.entries(typeValueColor).map(([t, c]) => (
            <Tag key={t} color={typeTagColor[t]} style={{ marginInlineEnd: 3, fontSize: 11, marginBottom: 0 }}>
              <span style={{ color: c }}>●</span> {t}
            </Tag>
          ))} */}
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
