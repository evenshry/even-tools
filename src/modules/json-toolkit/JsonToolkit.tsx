import { useDeferredValue, useMemo, useState } from "react";
import { Layout, Tabs, Select, Button, Space, message } from "antd";
import {
  CheckCircleOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  SwapOutlined,
  FileTextOutlined,
  BarChartOutlined,
  BlockOutlined,
} from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import JsonEditor from "@/modules/json-toolkit/components/JsonEditor";
import JsonOutput from "@/modules/json-toolkit/components/JsonOutput";
import JsonTreeViewer from "@/modules/json-toolkit/components/JsonTreeViewer";
import JsonStats from "@/modules/json-toolkit/components/JsonStats";
import JsonPathQuery from "@/modules/json-toolkit/components/JsonPathQuery";
import JsonConverter from "@/modules/json-toolkit/components/JsonConverter";
import JsonEscapeTool from "@/modules/json-toolkit/components/JsonEscapeTool";
import JsonValidator from "@/modules/json-toolkit/components/JsonValidator";
import { samples } from "@/modules/json-toolkit/data/samples";
import type { JsonToolkitTypes } from "@/modules/json-toolkit/data/interface";
import {
  formatJson,
  minifyJson,
  computeStats,
  byteSize,
  getIndentString,
} from "@/modules/json-toolkit/utils/jsonUtils";
import {
  analyzeJson,
  mapDiagnosticsToPaths,
  buildErrorNodesFromDiagnostics,
} from "@/modules/json-toolkit/utils/jsonDiagnostics";
import "@/modules/json-toolkit/JsonToolkit.scss";

const { Content } = Layout;

type PreviewTab = "tree" | "format" | "stats" | "path" | "convert" | "validate";

const JsonToolkit = () => {
  const [rawText, setRawText] = useState<string>(samples[0].content);
  const [indent, setIndent] = useState<JsonToolkitTypes.IndentStyle>(2);
  const [activeTopTab, setActiveTopTab] = useState("main");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("tree");

  // 诊断文本延后取值：快速输入时跳过中间状态的重解析
  const analyzedText = useDeferredValue(rawText);

  // 一次解析同时得到：严格解析结果 / 容错结构 / 错误诊断 / 自动修复结果 / 字段偏移
  const analysis = useMemo(() => analyzeJson(analyzedText), [analyzedText]);

  const dataValid = analysis.strictValid;
  const hasUsableData = analysis.data !== undefined;
  const status: "valid" | "fixed" | "invalid" = dataValid ? "valid" : hasUsableData ? "fixed" : "invalid";

  // 可视化树：严格有效用解析结果，否则用容错结构（并挂载错误节点）
  const treeData = dataValid ? analysis.strictParsed : analysis.partial;
  const displayData = analysis.data;

  // 统计
  const stats = useMemo(() => {
    if (displayData === undefined) return null;
    return computeStats(displayData, rawText);
  }, [displayData, rawText]);

  // 输出预览（根据 indent 实时格式化）
  const formattedOutput = useMemo(() => {
    if (displayData === undefined) return "";
    try {
      return JSON.stringify(displayData, null, getIndentString(indent));
    } catch {
      return "";
    }
  }, [displayData, indent]);

  // 严格格式化：原文无效时提示先修复，避免静默改写用户输入
  const reformat = (style: JsonToolkitTypes.IndentStyle) =>
    style === 0 ? minifyJson(rawText) : formatJson(rawText, style);

  const reportFormatError = (error: string) => {
    message.error(
      status === "fixed" ? "原文存在语法问题，请先在「校验结果」中一键修复" : error,
    );
  };

  const handleFormat = () => {
    const r = reformat(indent);
    if (!r.ok) {
      reportFormatError(r.error);
      return;
    }
    setRawText(r.result);
  };

  const handleMinify = () => {
    const r = minifyJson(rawText);
    if (!r.ok) {
      reportFormatError(r.error);
      return;
    }
    setRawText(r.result);
  };

  // 缩进切换：能格式化则立即应用到文本，否则只更新偏好
  const handleIndentChange = (v: JsonToolkitTypes.IndentStyle) => {
    setIndent(v);
    const r = reformat(v);
    if (!r.ok) return;
    setRawText(r.result);
    message.success(v === 0 ? "已压缩" : `已应用 ${v === "tab" ? "Tab" : `${v} 空格`} 缩进`);
  };

  const handleClear = () => {
    setRawText("");
    message.info("已清空");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        message.success("已粘贴剪贴板内容");
      } else {
        message.warning("剪贴板为空");
      }
    } catch {
      message.error("无法读取剪贴板，请手动粘贴");
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = samples.find((s) => s.id === sampleId);
    if (sample) {
      setRawText(sample.content);
      message.info(`已载入示例：${sample.name}`);
    }
  };

  const rowHint = useMemo(
    () => `${rawText.length} 字符 / ${byteSize(rawText)} 字节 / ${rawText.split("\n").length} 行`,
    [rawText],
  );

  // 为无法解析的字段构建错误节点，用于补全树结构
  const errorNodes = useMemo(() => {
    if (!analysis.diagnostics.length) return undefined;
    return buildErrorNodesFromDiagnostics(analyzedText, analysis.diagnostics);
  }, [analyzedText, analysis.diagnostics]);

  // 将诊断错误按路径分组，用于在可视化树节点上显示
  // 已由 errorNodes 错误子节点覆盖的诊断不再重复内联显示
  const pathErrors = useMemo(() => {
    if (!analysis.diagnostics.length) return {};
    const raw = mapDiagnosticsToPaths(analyzedText, analysis.diagnostics);
    const covered: Array<{ path: string; start: number; end: number }> = [];
    if (errorNodes) {
      for (const [parentPath, groups] of Object.entries(errorNodes)) {
        for (const g of groups) {
          covered.push({ path: parentPath, start: g.startOffset, end: g.endOffset });
        }
      }
    }
    const filtered: Record<string, JsonToolkitTypes.JsonDiagnosticError[]> = {};
    for (const [p, diags] of Object.entries(raw)) {
      const kept = diags.filter(
        (d) => !covered.some((r) => r.path === p && d.position >= r.start && d.position < r.end),
      );
      if (kept.length > 0) filtered[p] = kept;
    }
    return filtered;
  }, [analyzedText, analysis.diagnostics, errorNodes]);

  // 传递给 JsonValidator 的诊断信息
  const validatorProps = {
    strictValid: dataValid,
    error: analysis.diagnostics[0]?.message,
    errorLine: analysis.diagnostics[0]?.line,
    errorColumn: analysis.diagnostics[0]?.column,
    parsed: displayData,
    diagnostics: analysis.diagnostics,
    fixCount: analysis.fixes.length,
    indent,
    onApplyFixes: analysis.fixedText
      ? () => {
          setRawText(analysis.fixedText!);
          message.success(`已自动修复 ${analysis.fixes.length} 处问题`);
        }
      : undefined,
  };

  return (
    <Layout className="json-toolkit">
      <ModuleHeader
        title="JSON 工具箱"
        center={
          <div className="json-toolkit__header-center">
            <Tabs
              activeKey={activeTopTab}
              onChange={setActiveTopTab}
              className="json-toolkit__header-tabs"
              items={[
                {
                  key: "main",
                  label: (
                    <span>
                      <NodeIndexOutlined />
                      JSON 处理
                    </span>
                  ),
                },
                {
                  key: "escape",
                  label: (
                    <span>
                      <BlockOutlined />
                      字符串转义
                    </span>
                  ),
                },
              ]}
            />
          </div>
        }
        extra={
          <Space>
            <Select
              placeholder="载入示例"
              style={{ width: 180 }}
              onChange={handleLoadSample}
              options={samples.map((s) => ({
                label: s.name,
                value: s.id,
              }))}
              suffixIcon={null}
            />
            <Button onClick={() => setRawText(samples[0].content)}>重置示例</Button>
          </Space>
        }
      />

      <Content className="json-toolkit__content">
        {activeTopTab === "main" ? (
          <div className="json-toolkit__main">
            {/* 左侧：编辑器（内嵌状态栏） */}
            <div className="json-toolkit__editor-col">
              <JsonEditor
                value={rawText}
                onChange={setRawText}
                indent={indent}
                onIndentChange={handleIndentChange}
                onFormat={handleFormat}
                onMinify={handleMinify}
                onClear={handleClear}
                onPaste={handlePaste}
                rowHint={rowHint}
                status={status}
                sizeBytes={stats?.size}
                totalNodes={stats?.totalNodes}
                depth={stats?.depth}
                keys={stats?.keys}
              />
            </div>

            {/* 右侧：预览区（默认可视化树） */}
            <div className="json-toolkit__preview-col">
              <div className="json-toolkit__preview-tabs-wrapper">
                <Tabs
                  activeKey={previewTab}
                  onChange={(k) => setPreviewTab(k as PreviewTab)}
                  className="json-toolkit__preview-tabs"
                  items={[
                    {
                      key: "tree",
                      label: (
                        <span>
                          <NodeIndexOutlined />
                          可视化树
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body json-toolkit__preview-body--tree">
                          {treeData !== undefined ? (
                            <JsonTreeViewer
                              data={treeData}
                              pathErrors={pathErrors}
                              errorNodes={errorNodes}
                              nodeOffsets={analysis.offsets}
                            />
                          ) : (
                            <JsonValidator {...validatorProps} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "format",
                      label: (
                        <span>
                          <FileTextOutlined />
                          格式化预览
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body">
                          {displayData !== undefined ? (
                            <JsonOutput
                              title={dataValid ? "格式化输出" : "格式化输出（已按自动修复结果预览）"}
                              content={formattedOutput}
                              language="json"
                              emptyText="输入 JSON 后此处显示格式化结果"
                            />
                          ) : (
                            <JsonValidator {...validatorProps} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "stats",
                      label: (
                        <span>
                          <BarChartOutlined />
                          统计分析
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body">
                          {displayData !== undefined ? (
                            <JsonStats stats={stats} />
                          ) : (
                            <JsonValidator {...validatorProps} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "path",
                      label: (
                        <span>
                          <SearchOutlined />
                          路径查询
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body">
                          {displayData !== undefined ? (
                            <JsonPathQuery data={displayData} dataValid={hasUsableData} />
                          ) : (
                            <JsonValidator {...validatorProps} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "convert",
                      label: (
                        <span>
                          <SwapOutlined />
                          格式转换
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body">
                          {displayData !== undefined ? (
                            <JsonConverter data={displayData} dataValid={hasUsableData} />
                          ) : (
                            <JsonValidator {...validatorProps} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "validate",
                      label: (
                        <span>
                          <CheckCircleOutlined />
                          校验结果
                        </span>
                      ),
                      children: (
                        <div className="json-toolkit__preview-body">
                          <JsonValidator {...validatorProps} />
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="json-toolkit__two-col">
            <div className="json-toolkit__col">
              <JsonEscapeTool />
            </div>
            <div className="json-toolkit__col">
              <JsonOutput title="转义规则说明" content={escapeHints} language="text" emptyText="" />
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

const escapeHints = [
  "JSON 字符串中需要转义的特殊字符：",
  "",
  '  \\"      双引号',
  "  \\\\     反斜杠",
  "  \\/      正斜杠（可省略）",
  "  \\n      换行 LF",
  "  \\r      回车 CR",
  "  \\t      制表符",
  "  \\f      换页",
  "  \\b      退格",
  "  \\uXXXX  Unicode 字符（4 位十六进制）",
  "",
  "示例：",
  '  原文（含换行与引号）：He said "hi"',
  "  New line",
  '  转义后：  "He said \\"hi\\"\\nNew line"',
  "",
  "提示：",
  "  - 非 ASCII 字符（如中文）可直接保留，无需转义",
  "  - 数字、布尔、null 不需要引号",
  "  - 键名必须是字符串，必须用双引号包裹",
  "  - 单引号字符串在 JSON 中是非法的",
].join("\n");

export default JsonToolkit;
