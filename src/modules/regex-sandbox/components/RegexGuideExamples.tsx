import { Card, Typography, Tag, Space, Collapse, Steps, Button, message } from "antd";
import { BulbOutlined, ArrowRightOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface UseCase {
  id: string;
  title: string;
  description: string;
  difficulty: "简单" | "中等" | "复杂";
  steps: {
    title: string;
    description: string;
    pattern?: string;
    explanation?: string;
  }[];
  finalPattern: string;
  exampleInput: string;
  exampleOutput: string;
}

const RegexGuideExamples = () => {
  const useCases: UseCase[] = [
    {
      id: "email",
      title: "验证电子邮件地址",
      description: "学习如何构建一个基本的电子邮件验证正则表达式",
      difficulty: "简单",
      steps: [
        {
          title: "匹配用户名部分",
          description: "用户名可以包含字母、数字、点和下划线",
          pattern: "[\\w.]+",
          explanation: "[\\w.]+ 匹配一个或多个字母、数字、下划线或点",
        },
        {
          title: "添加 @ 符号",
          description: "电子邮件必须包含 @ 符号",
          pattern: "[\\w.]+@",
          explanation: "@ 匹配字面的 @ 符号",
        },
        {
          title: "匹配域名部分",
          description: "域名包含字母、数字和点",
          pattern: "[\\w.]+@[\\w.]+",
          explanation: "[\\w.]+ 匹配域名部分",
        },
        {
          title: "添加顶级域名",
          description: "顶级域名通常是 2-4 个字母",
          pattern: "[\\w.]+@[\\w.]+\\.[a-zA-Z]{2,4}",
          explanation: "\\.[a-zA-Z]{2,4} 匹配点号后跟 2-4 个字母",
        },
      ],
      finalPattern: "^[\\w.]+@[\\w.]+\\.[a-zA-Z]{2,4}$",
      exampleInput: "user@example.com",
      exampleOutput: "✓ 匹配成功",
    },
    {
      id: "phone",
      title: "提取电话号码",
      description: "学习如何从文本中提取各种格式的电话号码",
      difficulty: "中等",
      steps: [
        {
          title: "匹配可选的区号",
          description: "电话号码可能以 +86 或 (010) 开头",
          pattern: "(\\+\\d{2,3}|\\(\\d{3,4}\\))?",
          explanation: "(\\+\\d{2,3}|\\(\\d{3,4}\\))? 匹配可选的 +数字 或 (数字)",
        },
        {
          title: "匹配分隔符",
          description: "区号和号码之间可能有空格或横线",
          pattern: "(\\+\\d{2,3}|\\(\\d{3,4}\\))?[-\\s]?",
          explanation: "[-\\s]? 匹配可选的横线或空格",
        },
        {
          title: "匹配主号码",
          description: "主号码通常是 3-4 位数字",
          pattern: "(\\+\\d{2,3}|\\(\\d{3,4}\\))?[-\\s]?\\d{3,4}",
          explanation: "\\d{3,4} 匹配 3-4 位数字",
        },
        {
          title: "匹配分隔符和剩余号码",
          description: "添加分隔符和剩余的 4 位数字",
          pattern: "(\\+\\d{2,3}|\\(\\d{3,4}\\))?[-\\s]?\\d{3,4}[-\\s]?\\d{4}",
          explanation: "[-\\s]?\\d{4} 匹配分隔符和 4 位数字",
        },
      ],
      finalPattern: "(\\+\\d{2,3}|\\(\\d{3,4}\\))?[-\\s]?\\d{3,4}[-\\s]?\\d{4}",
      exampleInput: "联系电话：+86 138-1234-5678",
      exampleOutput: "提取: +86 138-1234-5678",
    },
    {
      id: "url",
      title: "提取 URL 链接",
      description: "学习如何从文本中提取 HTTP/HTTPS 链接",
      difficulty: "中等",
      steps: [
        {
          title: "匹配协议部分",
          description: "URL 以 http:// 或 https:// 开头",
          pattern: "https?://",
          explanation: "https?:// 匹配 http:// 或 https://",
        },
        {
          title: "匹配域名",
          description: "域名包含字母、数字、点和横线",
          pattern: "https?://[\\w.-]+",
          explanation: "[\\w.-]+ 匹配域名部分",
        },
        {
          title: "匹配可选的路径",
          description: "URL 可能包含路径、查询参数等",
          pattern: "https?://[\\w.-]+(?:/[\\w./?%&=-]*)?",
          explanation: "(?:/[\\w./?%&=-]*)? 匹配可选的路径部分",
        },
      ],
      finalPattern: "https?://[\\w.-]+(?:/[\\w./?%&=-]*)?",
      exampleInput: "访问 https://example.com/path?query=123 获取更多信息",
      exampleOutput: "提取: https://example.com/path?query=123",
    },
    {
      id: "date",
      title: "提取日期格式",
      description: "学习如何匹配和提取各种格式的日期",
      difficulty: "简单",
      steps: [
        {
          title: "匹配年-月-日格式",
          description: "常见的 YYYY-MM-DD 格式",
          pattern: "\\d{4}-\\d{2}-\\d{2}",
          explanation: "\\d{4}-\\d{2}-\\d{2} 匹配 4 位年-2 位月-2 位日",
        },
        {
          title: "支持多种分隔符",
          description: "支持 /、.、- 等分隔符",
          pattern: "\\d{4}[-/.]\\d{2}[-/.]\\d{2}",
          explanation: "[-/.] 匹配横线、斜线或点",
        },
        {
          title: "添加边界匹配",
          description: "确保匹配完整的日期",
          pattern: "\\b\\d{4}[-/.]\\d{2}[-/.]\\d{2}\\b",
          explanation: "\\b 确保匹配单词边界",
        },
      ],
      finalPattern: "\\b\\d{4}[-/.]\\d{2}[-/.]\\d{2}\\b",
      exampleInput: "会议日期：2024-01-15 或 2024/01/15",
      exampleOutput: "提取: 2024-01-15, 2024/01/15",
    },
  ];

  const handleTryPattern = (pattern: string) => {
    message.success(`已复制正则表达式: ${pattern}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "简单":
        return "green";
      case "中等":
        return "orange";
      case "复杂":
        return "red";
      default:
        return "default";
    }
  };

  const renderUseCase = (useCase: UseCase) => {
    return (
      <div key={useCase.id} className="use-case-item">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div className="use-case-header">
            <Space>
              <Text strong style={{ fontSize: 15 }}>
                {useCase.title}
              </Text>
              <Tag color={getDifficultyColor(useCase.difficulty)}>{useCase.difficulty}</Tag>
            </Space>
            <Paragraph style={{ fontSize: 12, marginBottom: 0 }}>
              {useCase.description}
            </Paragraph>
          </div>

          <Steps
            direction="vertical"
            size="small"
            items={useCase.steps.map((step) => ({
              title: step.title,
              description: (
                <div className="step-description">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {step.description}
                  </Text>
                  {step.pattern && (
                    <div className="step-pattern">
                      <Text code style={{ fontSize: 11 }}>
                        {step.pattern}
                      </Text>
                    </div>
                  )}
                  {step.explanation && (
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      {step.explanation}
                    </Text>
                  )}
                </div>
              ),
            }))}
          />

          <div className="use-case-result">
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div className="final-pattern">
                <Text strong style={{ fontSize: 12 }}>
                  最终正则表达式：
                </Text>
                <div className="pattern-display">
                  <Text code style={{ fontSize: 13 }}>
                    {useCase.finalPattern}
                  </Text>
                </div>
              </div>

              <div className="example-demo">
                <Text strong style={{ fontSize: 12 }}>
                  示例：
                </Text>
                <div className="example-input">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    输入：
                  </Text>
                  <Text code style={{ fontSize: 11, marginLeft: 8 }}>
                    {useCase.exampleInput}
                  </Text>
                </div>
                <div className="example-output">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    输出：
                  </Text>
                  <Text style={{ fontSize: 11, marginLeft: 8, color: "#52c41a" }}>
                    {useCase.exampleOutput}
                  </Text>
                </div>
              </div>

              <Button
                type="primary"
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={() => handleTryPattern(useCase.finalPattern)}
                block
              >
                尝试此正则表达式
              </Button>
            </Space>
          </div>
        </Space>
      </div>
    );
  };

  return (
    <Card
      title={
        <Space>
          <BulbOutlined />
          <span>常见用例引导示例</span>
        </Space>
      }
      className="regex-guide-examples"
      size="small"
    >
      <Collapse
        defaultActiveKey={["email"]}
        size="small"
        className="regex-guide-examples-collapse"
      >
        {useCases.map((useCase) => (
          <Panel
            header={
              <Space>
                <Text strong style={{ fontSize: 13 }}>
                  {useCase.title}
                </Text>
                <Tag color={getDifficultyColor(useCase.difficulty)} style={{ fontSize: 11 }}>
                  {useCase.difficulty}
                </Tag>
              </Space>
            }
            key={useCase.id}
          >
            {renderUseCase(useCase)}
          </Panel>
        ))}
      </Collapse>

      <div className="guide-tips">
        <Paragraph style={{ fontSize: 11, marginBottom: 0, marginTop: 12 }}>
          <Text type="secondary">
            💡 提示：点击"尝试此正则表达式"按钮可以将正则表达式复制到编辑器中进行测试
          </Text>
        </Paragraph>
      </div>
    </Card>
  );
};

export default RegexGuideExamples;
