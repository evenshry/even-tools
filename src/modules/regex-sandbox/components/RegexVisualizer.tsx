import { Card, Typography, Tag, Space, Alert, Collapse, Steps, Tooltip } from "antd";
import { EyeOutlined, InfoCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import type { RegexSandboxTypes } from "@/modules/regex-sandbox/data/interface";

const { Text } = Typography;
const { Panel } = Collapse;

interface RegexPart {
  type: string;
  pattern: string;
  description: string;
  color: string;
}

interface RegexVisualizerProps {
  pattern: string;
  flags: string;
  testString: string;
  selectedPreset?: RegexSandboxTypes.RegexPreset | null;
}

const RegexVisualizer = ({ pattern, flags, testString, selectedPreset }: RegexVisualizerProps) => {
  const parseRegexPattern = (pattern: string): RegexPart[] => {
    const parts: RegexPart[] = [];
    let i = 0;

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === "\\") {
        if (i + 1 < pattern.length) {
          const nextChar = pattern[i + 1];
          const escapeSequences: Record<string, string> = {
            d: "数字 (0-9)",
            w: "字母、数字或下划线",
            s: "空白字符",
            b: "单词边界",
            n: "换行符",
            t: "制表符",
            r: "回车符",
          };

          parts.push({
            type: "转义字符",
            pattern: `\\${nextChar}`,
            description: escapeSequences[nextChar] || `转义字符: ${nextChar}`,
            color: "purple",
          });
          i += 2;
        } else {
          parts.push({
            type: "转义字符",
            pattern: "\\",
            description: "转义字符（不完整）",
            color: "purple",
          });
          i++;
        }
      } else if (char === "[") {
        let bracketContent = "";
        let j = i + 1;
        while (j < pattern.length && pattern[j] !== "]") {
          bracketContent += pattern[j];
          j++;
        }
        if (j < pattern.length) {
          parts.push({
            type: "字符类",
            pattern: `[${bracketContent}]`,
            description: `匹配方括号中的任意一个字符: ${bracketContent}`,
            color: "blue",
          });
          i = j + 1;
        } else {
          parts.push({
            type: "字符类",
            pattern: bracketContent,
            description: "字符类（不完整）",
            color: "blue",
          });
          i = j;
        }
      } else if (char === "(") {
        let groupContent = "";
        let j = i + 1;
        let depth = 1;
        while (j < pattern.length && depth > 0) {
          if (pattern[j] === "(") depth++;
          if (pattern[j] === ")") depth--;
          if (depth > 0) groupContent += pattern[j];
          j++;
        }
        if (depth === 0) {
          const isNonCapturing = groupContent.startsWith("?:");
          parts.push({
            type: isNonCapturing ? "非捕获分组" : "捕获分组",
            pattern: `(${groupContent})`,
            description: isNonCapturing ? "匹配但不捕获分组" : "匹配并捕获分组",
            color: isNonCapturing ? "orange" : "green",
          });
          i = j;
        } else {
          parts.push({
            type: "分组",
            pattern: groupContent,
            description: "分组（不完整）",
            color: "green",
          });
          i = j;
        }
      } else if (char === "^") {
        parts.push({
          type: "边界",
          pattern: "^",
          description: "匹配字符串的开头",
          color: "cyan",
        });
        i++;
      } else if (char === "$") {
        parts.push({
          type: "边界",
          pattern: "$",
          description: "匹配字符串的结尾",
          color: "cyan",
        });
        i++;
      } else if (["*", "+", "?"].includes(char)) {
        const quantifiers: Record<string, string> = {
          "*": "匹配 0 次或多次",
          "+": "匹配 1 次或多次",
          "?": "匹配 0 次或 1 次",
        };
        parts.push({
          type: "量词",
          pattern: char,
          description: quantifiers[char],
          color: "red",
        });
        i++;
      } else if (char === "{") {
        let braceContent = "";
        let j = i + 1;
        while (j < pattern.length && pattern[j] !== "}") {
          braceContent += pattern[j];
          j++;
        }
        if (j < pattern.length) {
          parts.push({
            type: "量词",
            pattern: `{${braceContent}}`,
            description: `重复次数: ${braceContent}`,
            color: "red",
          });
          i = j + 1;
        } else {
          parts.push({
            type: "量词",
            pattern: braceContent,
            description: "量词（不完整）",
            color: "red",
          });
          i = j;
        }
      } else if (char === "|") {
        parts.push({
          type: "选择",
          pattern: "|",
          description: "或运算，匹配左边或右边",
          color: "magenta",
        });
        i++;
      } else if (char === ".") {
        parts.push({
          type: "通配符",
          pattern: ".",
          description: "匹配任意单个字符（除换行符外）",
          color: "geekblue",
        });
        i++;
      } else {
        parts.push({
          type: "字面量",
          pattern: char,
          description: `匹配字面字符: ${char}`,
          color: "default",
        });
        i++;
      }
    }

    return parts;
  };

  const parseFlags = (flags: string): Array<{ flag: string; description: string }> => {
    const flagDescriptions: Record<string, string> = {
      g: "全局匹配，查找所有匹配项",
      i: "忽略大小写",
      m: "多行模式，^ 和 $ 匹配每行的开头和结尾",
      s: "点号匹配所有字符，包括换行符",
      u: "Unicode 模式，正确处理 Unicode 字符",
      y: "粘滞模式，从 lastIndex 开始匹配",
    };

    return flags.split("").map((flag) => ({
      flag,
      description: flagDescriptions[flag] || "未知标志",
    }));
  };

  const regexParts = parseRegexPattern(pattern);
  const flagItems = parseFlags(flags);

  const getTypeColor = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: "#722ed1",
      blue: "#1890ff",
      green: "#52c41a",
      orange: "#fa8c16",
      cyan: "#13c2c2",
      red: "#f5222d",
      magenta: "#eb2f96",
      geekblue: "#2f54eb",
      default: "#8c8c8c",
    };
    return colorMap[color] || colorMap.default;
  };

  return (
    <Card
      title={
        <Space>
          <EyeOutlined />
          <span>正则表达式可视化</span>
        </Space>
      }
      className="regex-visualizer"
      size="small"
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {selectedPreset && (
            <div className="regex-preset-info">
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Space>
                  <FileTextOutlined />
                  <Text strong style={{ fontSize: 14 }}>
                    {selectedPreset.name}
                  </Text>
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    {selectedPreset.category}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedPreset.description}
                </Text>
                <div className="preset-pattern-display">
                  <Text strong style={{ fontSize: 12 }}>
                    正则表达式：
                  </Text>
                  <Text code style={{ fontSize: 13, marginLeft: 8 }}>
                    {selectedPreset.pattern}
                  </Text>
                  {selectedPreset.flags && (
                    <Tag color="cyan" style={{ fontSize: 11, marginLeft: 8 }}>
                      {selectedPreset.flags}
                    </Tag>
                  )}
                </div>
              </Space>
            </div>
        )}

        {pattern ? (
          <>
            <div className="regex-structure">
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                正则表达式结构解析：
              </Text>
              <Space wrap>
                {regexParts.map((part, index) => (
                  <Tooltip key={index} title={part.description}>
                    <Tag
                      color={getTypeColor(part.color)}
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        cursor: "help",
                        marginBottom: 4,
                      }}
                    >
                      {part.pattern}
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            </div>

            <Collapse size="small" className="regex-visualizer-collapse">
              <Panel header="详细解析" key="details">
                <Steps
                  direction="vertical"
                  size="small"
                  items={regexParts.map((part) => ({
                    title: (
                      <Space>
                        <Tag color={getTypeColor(part.color)} style={{ fontSize: 11 }}>
                          {part.type}
                        </Tag>
                        <Text code style={{ fontSize: 12 }}>
                          {part.pattern}
                        </Text>
                      </Space>
                    ),
                    description: (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {part.description}
                      </Text>
                    ),
                  }))}
                />
              </Panel>
            </Collapse>

            {flags && (
              <div className="regex-flags">
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  标志说明：
                </Text>
                <Space wrap>
                  {flagItems.map((item, index) => (
                    <Tooltip key={index} title={item.description}>
                      <Tag
                        color="blue"
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          cursor: "help",
                        }}
                      >
                        {item.flag}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </div>
            )}

            {testString && (
              <Alert
                message="提示"
                description={
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    将鼠标悬停在正则表达式部分上可以查看详细说明。在中间的测试区域可以看到实际的匹配结果。
                  </Text>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />
            )}
          </>
        ) : (
          <Alert
            message="等待输入"
            description="请在左侧输入正则表达式以查看可视化解析"
            type="info"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

export default RegexVisualizer;
