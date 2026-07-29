import { useMemo, useState } from "react";
import { Layout, Tabs, Select, Button, Space, Typography, message } from "antd";
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
import { formatJson, minifyJson, computeStats, byteSize } from "@/modules/json-toolkit/utils/jsonUtils";
import { lenientParseJson, tolerantParseToTree, mapDiagnosticsToPaths, buildErrorNodesFromDiagnostics, getFieldNodeOffsets } from "@/modules/json-toolkit/utils/jsonDiagnostics";
import "@/modules/json-toolkit/JsonToolkit.scss";

const { Content } = Layout;

type PreviewTab = "tree" | "format" | "stats" | "path" | "convert" | "validate";

const JsonToolkit = () => {
  const [rawText, setRawText] = useState<string>(samples[0].content);
  const [indent, setIndent] = useState<JsonToolkitTypes.IndentStyle>(2);
  const [activeTopTab, setActiveTopTab] = useState("main");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("tree");

  // 校验（使用容错解析）
  const validation = useMemo(() => {
    const result = lenientParseJson(rawText);
    return {
      isValid: result.success && result.parsed !== undefined,
      error: result.errors.length > 0 ? result.errors[0].message : undefined,
      errorLine: result.errors.length > 0 ? result.errors[0].line : undefined,
      errorColumn: result.errors.length > 0 ? result.errors[0].column : undefined,
      parsed: result.parsed,
      diagnostics: result.errors,
      fixes: result.fixes,
      fixedText: result.fixedText,
    } satisfies JsonToolkitTypes.ValidationResult;
  }, [rawText]);
  const dataValid = validation.isValid;
  const data = validation.parsed;

  // 统计
  const stats = useMemo(() => {
    if (!dataValid || data === undefined) return null;
    return computeStats(data, rawText);
  }, [data, dataValid, rawText]);

  // 输出预览（根据 indent 实时格式化）
  const formattedOutput = useMemo(() => {
    if (!dataValid) return "";
    const r = formatJson(rawText, indent);
    return r.ok ? r.result : "";
  }, [rawText, indent, dataValid]);

  const handleFormat = () => {
    const r = formatJson(rawText, indent);
    if (r.ok) {
      setRawText(r.result);
    } else {
      message.error(r.error);
    }
  };

  const handleMinify = () => {
    const r = minifyJson(rawText);
    if (r.ok) {
      setRawText(r.result);
    } else {
      message.error(r.error);
    }
  };

  // 缩进按钮：切换后立即应用到文本
  const handleIndentChange = (v: JsonToolkitTypes.IndentStyle) => {
    setIndent(v);
    if (v === 0) {
      const r = minifyJson(rawText);
      if (r.ok) {
        setRawText(r.result);
        message.success("已压缩");
      }
    } else {
      const r = formatJson(rawText, v);
      if (r.ok) {
        setRawText(r.result);
        message.success(`已应用 ${v === "tab" ? "Tab" : `${v} 空格`} 缩进`);
      } else {
        message.error(r.error);
      }
    }
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

  const rowHint = `${rawText.length} 字符 / ${byteSize(rawText)} ${rawText.split("\n").length} 行`;

  // 容错解析：当 JSON 无效时用于可视化树展示部分结构
  const partialData = useMemo(() => {
    if (dataValid) return undefined;
    return tolerantParseToTree(rawText).value;
  }, [rawText, dataValid]);

  // 为无法解析的字段构建错误节点，用于补全树结构
  const errorNodes = useMemo(() => {
    if (!validation.diagnostics?.length) return undefined;
    return buildErrorNodesFromDiagnostics(rawText, validation.diagnostics);
  }, [rawText, validation.diagnostics]);

  // 所有字段在源文本中的偏移映射，用于可视化树保持原始顺序
  const nodeOffsets = useMemo(() => {
    if (!rawText) return undefined;
    return getFieldNodeOffsets(rawText);
  }, [rawText]);

  // 将诊断错误按路径分组，用于在可视化树节点上显示
  // 过滤掉已被 errorNodes 错误子节点覆盖的诊断，避免重复显示
  const pathErrors = useMemo(() => {
    if (!validation.diagnostics?.length) return {};
    const raw = mapDiagnosticsToPaths(rawText, validation.diagnostics);
    // 计算 errorNodes 中所有错误节点覆盖的位置区间
    const coveredRanges: Array<{ path: string; start: number; end: number }> = [];
    if (errorNodes) {
      for (const [parentPath, errs] of Object.entries(errorNodes)) {
        for (const e of errs) {
          coveredRanges.push({ path: parentPath, start: e.startOffset - 5, end: e.startOffset + 200 });
        }
      }
    }
    // 过滤 pathErrors：移除落在 coveredRanges 内的诊断
    const filtered: Record<string, JsonToolkitTypes.JsonDiagnosticError[]> = {};
    for (const [p, diags] of Object.entries(raw)) {
      filtered[p] = diags.filter((d) => {
        for (const r of coveredRanges) {
          if (r.path === p && d.position >= r.start && d.position <= r.end) {
            return false; // 已被错误子节点覆盖，跳过
          }
        }
        return true;
      });
      if (filtered[p].length === 0) delete filtered[p];
    }
    return filtered;
  }, [rawText, validation.diagnostics, errorNodes]);

  // 传递给 JsonValidator 的诊断信息
  const validatorProps = {
    rawText,
    diagnostics: validation.diagnostics,
    fixes: validation.fixes,
    onApplyFixes: () => {
      if (validation.fixedText) {
        setRawText(validation.fixedText);
        message.success(`已自动修复 ${validation.fixes?.length || 0} 处问题`);
      }
    },
  };

  return (
    <Layout className="json-toolkit">
      <ModuleHeader
        center={
          <div className="json-toolkit__header-center">
            <Typography.Title level={3} className="json-toolkit__header-title">
              JSON 工具箱
            </Typography.Title>
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
                dataValid={dataValid}
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
                          {dataValid ? (
                            <JsonTreeViewer data={data} pathErrors={pathErrors} errorNodes={errorNodes} nodeOffsets={nodeOffsets} />
                          ) : partialData !== undefined ? (
                            <JsonTreeViewer data={partialData} pathErrors={pathErrors} errorNodes={errorNodes} nodeOffsets={nodeOffsets} />
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
                          {dataValid ? (
                            <JsonOutput
                              title="格式化输出"
                              content={formattedOutput}
                              language="json"
                              emptyText="输入有效 JSON 后此处显示格式化结果"
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
                          {dataValid ? <JsonStats stats={stats} /> : <JsonValidator {...validatorProps} />}
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
                          {dataValid ? <JsonPathQuery data={data} onDataValid={dataValid} /> : <JsonValidator {...validatorProps} />}
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
                          {dataValid ? <JsonConverter data={data} onDataValid={dataValid} /> : <JsonValidator {...validatorProps} />}
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
