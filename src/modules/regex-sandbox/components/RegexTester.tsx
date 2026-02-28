import { Input, Card, Space, Typography, Tag, Empty, Alert, Statistic, Row, Col } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

interface MatchResult {
  match: string;
  index: number;
  groups: string[];
}

interface TestResult {
  input: string;
  matches: MatchResult[];
  isValid: boolean;
  error?: string;
}

interface RegexTesterProps {
  testString: string;
  onTestStringChange: (value: string) => void;
  testResult: TestResult | null;
}

const RegexTester = ({ testString, onTestStringChange, testResult }: RegexTesterProps) => {
  const renderHighlightedText = (text: string, matches: MatchResult[]) => {
    if (matches.length === 0) {
      return <Text>{text}</Text>;
    }

    const parts: Array<{ text: string; isMatch: boolean }> = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          isMatch: false,
        });
      }
      parts.push({
        text: match.match,
        isMatch: true,
      });
      lastIndex = match.index + match.match.length;
    });

    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isMatch: false,
      });
    }

    return (
      <div className="highlighted-text">
        {parts.map((part, index) => (
          <span key={index} className={part.isMatch ? "match-highlight" : "text-normal"}>
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  const calculateMatchStats = (matches: MatchResult[]) => {
    if (matches.length === 0) {
      return { totalLength: 0, avgLength: 0, maxMatch: "", minMatch: "" };
    }

    const lengths = matches.map((m) => m.match.length);
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const avgLength = Math.round(totalLength / matches.length);
    const maxMatch = matches.reduce((max, m) => (m.match.length > max.match.length ? m : max));
    const minMatch = matches.reduce((min, m) => (m.match.length < min.match.length ? m : min));

    return { totalLength, avgLength, maxMatch: maxMatch.match, minMatch: minMatch.match };
  };

  const renderMatchExplanation = (match: MatchResult) => {
    const hasGroups = match.groups.length > 0;
    const groupCount = match.groups.filter((g) => g !== undefined && g !== null).length;

    return (
      <div className="match-explanation">
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <div className="explanation-basic">
            <InfoCircleOutlined style={{ color: "#1890ff", marginRight: 8 }} />
            <Text type="secondary">
              在位置 <Text code>{match.index}</Text> 处找到匹配，长度为 <Text code>{match.match.length}</Text> 个字符
            </Text>
          </div>
          {hasGroups && (
            <div className="explanation-groups">
              <Text type="secondary">
                捕获了 <Text code>{groupCount}</Text> 个分组
              </Text>
            </div>
          )}
        </Space>
      </div>
    );
  };

  return (
    <>
      <Card title="测试字符串" className="regex-tester-input">
        <TextArea
          value={testString}
          onChange={(e) => onTestStringChange(e.target.value)}
          placeholder="输入要测试的字符串..."
          rows={6}
          className="regex-test-textarea"
        />
      </Card>

      <Card title="匹配结果" className="regex-tester-result">
        {testResult ? (
          testResult.error ? (
            <Alert message="正则表达式错误" description={testResult.error} type="error" showIcon icon={<CloseCircleOutlined />} />
          ) : testResult.matches.length > 0 ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <div className="match-summary">
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    找到 {testResult.matches.length} 个匹配
                  </Text>
                </Space>
              </div>

              <div className="match-stats">
                <Text strong style={{ marginBottom: 12, display: "block" }}>
                  匹配统计：
                </Text>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="总匹配长度"
                      value={calculateMatchStats(testResult.matches).totalLength}
                      suffix="字符"
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="平均长度"
                      value={calculateMatchStats(testResult.matches).avgLength}
                      suffix="字符"
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic title="匹配数量" value={testResult.matches.length} valueStyle={{ fontSize: 18 }} />
                  </Col>
                </Row>
              </div>

              <div className="match-preview">
                <Text strong className="match-preview-title">高亮显示：</Text>
                <div className="match-preview-content">{renderHighlightedText(testResult.input, testResult.matches)}</div>
              </div>

              <div className="match-details">
                <Text strong>匹配详情：</Text>
                <div className="match-list">
                  {testResult.matches.map((match, index) => (
                    <div key={index} className="match-item">
                      <div className="match-item-header">
                        <Tag color="blue">匹配 #{index + 1}</Tag>
                        <Text code style={{ fontSize: 13 }}>
                          {match.match}
                        </Text>
                        <Text type="secondary">位置: {match.index}</Text>
                        <Text type="secondary">长度: {match.match.length}</Text>
                      </div>

                      {renderMatchExplanation(match)}

                      {match.groups.length > 0 && (
                        <div className="match-groups">
                          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                            捕获分组：
                          </Text>
                          <Space wrap>
                            {match.groups.map((group, groupIndex) => (
                              <Tag key={groupIndex} color={group ? "geekblue" : "default"} style={{ fontSize: 12 }}>
                                ${groupIndex + 1}: {group || "(空)"}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Space>
          ) : (
            <Empty description="未找到匹配" />
          )
        ) : (
          <Empty description="输入正则表达式和测试字符串后查看结果" />
        )}
      </Card>
    </>
  );
};

export default RegexTester;
