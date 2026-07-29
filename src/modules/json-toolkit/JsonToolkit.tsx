import { useMemo, useState } from "react";
import { Layout, Tabs, Select, Button, Space, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  EyeOutlined,
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
  validateJson,
  formatJson,
  minifyJson,
  computeStats,
  byteSize,
} from "@/modules/json-toolkit/utils/jsonUtils";
import "@/modules/json-toolkit/JsonToolkit.scss";

const { Content } = Layout;
const { Text } = Typography;

const JsonToolkit = () => {
  const [rawText, setRawText] = useState<string>(samples[0].content);
  const [indent, setIndent] = useState<JsonToolkitTypes.IndentStyle>(2);
  const [activeTab, setActiveTab] = useState("format");

  // 校验
  const validation = useMemo(() => validateJson(rawText), [rawText]);
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
      message.success("已格式化");
    } else {
      message.error(r.error);
    }
  };

  const handleMinify = () => {
    const r = minifyJson(rawText);
    if (r.ok) {
      setRawText(r.result);
      message.success("已压缩");
    } else {
      message.error(r.error);
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

  return (
    <Layout className="json-toolkit">
      <ModuleHeader
        title="JSON 工具箱"
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="json-toolkit__tabs"
          items={[
            {
              key: "format",
              label: (
                <span>
                  <FileTextOutlined />
                  格式化 / 校验
                </span>
              ),
              children: (
                <div className="json-toolkit__two-col">
                  <div className="json-toolkit__col">
                    <JsonEditor
                      value={rawText}
                      onChange={setRawText}
                      error={validation.error}
                      errorLine={validation.errorLine}
                      indent={indent}
                      onIndentChange={setIndent}
                      onFormat={handleFormat}
                      onMinify={handleMinify}
                      onClear={handleClear}
                      onPaste={handlePaste}
                      rowHint={rowHint}
                    />
                  </div>
                  <div className="json-toolkit__col">
                    {dataValid ? (
                      <JsonOutput
                        title="格式化预览"
                        content={formattedOutput}
                        language="json"
                        emptyText="输入有效 JSON 后此处显示格式化结果"
                      />
                    ) : (
                      <JsonValidator rawText={rawText} />
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "tree",
              label: (
                <span>
                  <NodeIndexOutlined />
                  可视化树
                </span>
              ),
              children: (
                <div className="json-toolkit__tree-wrap">
                  {dataValid ? (
                    <JsonTreeViewer data={data} />
                  ) : (
                    <JsonValidator rawText={rawText} />
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
                <div className="json-toolkit__two-col">
                  <div className="json-toolkit__col">
                    <JsonStats stats={stats} />
                  </div>
                  <div className="json-toolkit__col">
                    {dataValid ? (
                      <JsonOutput
                        title="原始 JSON"
                        content={rawText}
                        language="json"
                        emptyText="尚无内容"
                      />
                    ) : (
                      <JsonValidator rawText={rawText} />
                    )}
                  </div>
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
                <div className="json-toolkit__two-col">
                  <div className="json-toolkit__col">
                    <JsonPathQuery data={data} onDataValid={dataValid} />
                  </div>
                  <div className="json-toolkit__col">
                    {dataValid ? (
                      <JsonOutput
                        title="当前 JSON"
                        content={formattedOutput || rawText}
                        language="json"
                        emptyText="尚无内容"
                      />
                    ) : (
                      <JsonValidator rawText={rawText} />
                    )}
                  </div>
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
                <div className="json-toolkit__single-col">
                  {dataValid ? (
                    <JsonConverter data={data} onDataValid={dataValid} />
                  ) : (
                    <JsonValidator rawText={rawText} />
                  )}
                </div>
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
              children: (
                <div className="json-toolkit__two-col">
                  <div className="json-toolkit__col">
                    <JsonEscapeTool />
                  </div>
                  <div className="json-toolkit__col">
                    <JsonOutput
                      title="提示"
                      content={escapeHints}
                      language="text"
                      emptyText=""
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "validate",
              label: (
                <span>
                  <CheckCircleOutlined />
                  校验
                </span>
              ),
              children: (
                <div className="json-toolkit__two-col">
                  <div className="json-toolkit__col">
                    <JsonEditor
                      value={rawText}
                      onChange={setRawText}
                      error={validation.error}
                      errorLine={validation.errorLine}
                      indent={indent}
                      onIndentChange={setIndent}
                      onFormat={handleFormat}
                      onMinify={handleMinify}
                      onClear={handleClear}
                      onPaste={handlePaste}
                      rowHint={rowHint}
                    />
                  </div>
                  <div className="json-toolkit__col">
                    <JsonValidator rawText={rawText} />
                    {dataValid && stats && (
                      <div style={{ marginTop: 12 }}>
                        <JsonStats stats={stats} />
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />

        <div className="json-toolkit__status-bar">
          <Space size="large">
            <Text type={dataValid ? "success" : "danger"} style={{ fontSize: 12 }}>
              {dataValid ? "● JSON 有效" : "● JSON 无效"}
            </Text>
            {stats && (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  大小：{byteSize(rawText)} B
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  节点：{stats.totalNodes}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  深度：{stats.depth}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  键数：{stats.keys}
                </Text>
              </>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              <EyeOutlined /> 当前缩进：{indent === "tab" ? "Tab" : indent === 0 ? "压缩" : `${indent} 空格`}
            </Text>
          </Space>
        </div>
      </Content>
    </Layout>
  );
};

const escapeHints = [
  "JSON 字符串中需要转义的特殊字符：",
  "",
  '  \\"      双引号',
  '  \\\\     反斜杠',
  '  \\/      正斜杠（可省略）',
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
