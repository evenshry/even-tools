import { Card, Typography, Tag, Space, Collapse, Divider } from "antd";
import { BookOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface SyntaxItem {
  pattern: string;
  description: string;
  example?: string;
}

interface SyntaxCategory {
  title: string;
  items: SyntaxItem[];
}

const RegexCheatSheet = () => {
  const syntaxCategories: SyntaxCategory[] = [
    {
      title: "字符类",
      items: [
        { pattern: ".", description: "匹配任意单个字符（除换行符外）", example: "a.b 匹配 aab, abb, acb" },
        { pattern: "\\d", description: "匹配任意数字（0-9）", example: "\\d+ 匹配 123" },
        { pattern: "\\w", description: "匹配任意字母、数字或下划线", example: "\\w+ 匹配 hello_world" },
        { pattern: "\\s", description: "匹配任意空白字符（空格、制表符、换行符等）", example: "a\\sb 匹配 a b" },
        { pattern: "[abc]", description: "匹配方括号中的任意一个字符", example: "[abc] 匹配 a, b 或 c" },
        { pattern: "[^abc]", description: "匹配不在方括号中的任意字符", example: "[^abc] 匹配 d, e, f 等" },
        { pattern: "[a-z]", description: "匹配小写字母 a 到 z", example: "[a-z]+ 匹配 hello" },
        { pattern: "[A-Z]", description: "匹配大写字母 A 到 Z", example: "[A-Z]+ 匹配 HELLO" },
        { pattern: "[0-9]", description: "匹配数字 0 到 9", example: "[0-9]+ 匹配 123" },
      ],
    },
    {
      title: "量词",
      items: [
        { pattern: "*", description: "匹配前面的元素 0 次或多次", example: "a* 匹配 '', a, aa, aaa" },
        { pattern: "+", description: "匹配前面的元素 1 次或多次", example: "a+ 匹配 a, aa, aaa" },
        { pattern: "?", description: "匹配前面的元素 0 次或 1 次", example: "a? 匹配 '', a" },
        { pattern: "{n}", description: "匹配前面的元素恰好 n 次", example: "a{3} 匹配 aaa" },
        { pattern: "{n,}", description: "匹配前面的元素至少 n 次", example: "a{2,} 匹配 aa, aaa, aaaa" },
        { pattern: "{n,m}", description: "匹配前面的元素至少 n 次，至多 m 次", example: "a{2,4} 匹配 aa, aaa, aaaa" },
      ],
    },
    {
      title: "边界匹配",
      items: [
        { pattern: "^", description: "匹配字符串的开头", example: "^Hello 匹配 Hello world 中的 Hello" },
        { pattern: "$", description: "匹配字符串的结尾", example: "world$ 匹配 Hello world 中的 world" },
        { pattern: "\\b", description: "匹配单词边界", example: "\\bcat\\b 匹配 cat 但不匹配 category" },
        { pattern: "\\B", description: "匹配非单词边界", example: "\\Bcat\\B 匹配 category 中的 cat" },
      ],
    },
    {
      title: "分组和引用",
      items: [
        { pattern: "(abc)", description: "捕获分组，匹配 abc 并记住匹配", example: "(abc)+ 匹配 abcabcabc" },
        { pattern: "(?:abc)", description: "非捕获分组，匹配 abc 但不记住", example: "(?:abc)+ 匹配 abcabcabc" },
        { pattern: "(a|b)", description: "匹配 a 或 b", example: "a|b 匹配 a 或 b" },
        { pattern: "\\1", description: "引用第一个捕获分组", example: "(\\d+)\\1 匹配 123123" },
        { pattern: "\\2", description: "引用第二个捕获分组", example: "(\\d+)-(\\w+)\\2 匹配 123-abc123" },
      ],
    },
    {
      title: "特殊字符",
      items: [
        { pattern: "\\", description: "转义字符，匹配特殊字符本身", example: "\\$ 匹配 $" },
        { pattern: "\\n", description: "匹配换行符", example: "a\\nb 匹配 a\\nb" },
        { pattern: "\\t", description: "匹配制表符", example: "a\\tb 匹配 a\\tb" },
        { pattern: "\\r", description: "匹配回车符", example: "a\\rb 匹配 a\\rb" },
      ],
    },
    {
      title: "常用标志",
      items: [
        { pattern: "g", description: "全局匹配，查找所有匹配项", example: "a/g 匹配所有 a" },
        { pattern: "i", description: "忽略大小写", example: "A/i 匹配 a 和 A" },
        { pattern: "m", description: "多行模式，^ 和 $ 匹配每行的开头和结尾", example: "^Hello/m 匹配每行开头的 Hello" },
        { pattern: "s", description: "点号匹配所有字符，包括换行符", example: "./s 匹配包括换行符在内的所有字符" },
        { pattern: "u", description: "Unicode 模式，正确处理 Unicode 字符", example: "\\u{1F600}/u 匹配 😀" },
        { pattern: "y", description: "粘滞模式，从 lastIndex 开始匹配", example: "a/y 从指定位置开始匹配 a" },
      ],
    },
  ];

  const renderSyntaxItem = (item: SyntaxItem) => {
    return (
      <div className="syntax-item">
        <Space size="small" style={{ width: "100%", justifyContent: "space-between" }}>
          <Tag color="blue" style={{ fontSize: 13, fontFamily: "monospace" }}>
            {item.pattern}
          </Tag>
          <Text style={{ fontSize: 12, flex: 1, textAlign: "left" }}>{item.description}</Text>
        </Space>
        {item.example && (
          <div className="syntax-example">
            <Text type="secondary" style={{ fontSize: 11 }}>
              示例: {item.example}
            </Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          <span>正则表达式语法备忘单</span>
        </Space>
      }
      className="regex-cheat-sheet"
      size="small"
    >
      <Collapse
        defaultActiveKey={["字符类", "量词"]}
        size="small"
        className="regex-cheat-sheet-collapse"
      >
        {syntaxCategories.map((category) => (
          <Panel header={category.title} key={category.title}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {category.items.map((item, itemIndex) => (
                <div key={itemIndex}>
                  {renderSyntaxItem(item)}
                  {itemIndex < category.items.length - 1 && <Divider style={{ margin: "8px 0" }} />}
                </div>
              ))}
            </Space>
          </Panel>
        ))}
      </Collapse>

      <Divider style={{ margin: "16px 0" }} />

      <div className="regex-tips">
        <Text strong style={{ display: "block", marginBottom: 8 }}>💡 使用技巧：</Text>
        <Paragraph style={{ fontSize: 12, marginBottom: 0 }}>
          <ul>
            <li>从简单的模式开始，逐步添加复杂性</li>
            <li>使用在线工具测试和调试正则表达式</li>
            <li>注意转义特殊字符（如 . * + ? ^ $ | \\ ( ) [ ] { }）</li>
            <li>使用非捕获分组 (?:...) 来提高性能</li>
            <li>考虑使用具体的字符类而不是 . 来提高准确性</li>
            <li>测试边界情况和特殊输入</li>
          </ul>
        </Paragraph>
      </div>
    </Card>
  );
};

export default RegexCheatSheet;
