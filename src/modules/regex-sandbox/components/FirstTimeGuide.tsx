import { useState } from "react";
import { Modal, Button, Typography, Space, Steps, Card, Alert, Divider } from "antd";
import { RocketOutlined, ThunderboltOutlined, EyeOutlined, BookOutlined, BulbOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Text, Paragraph, Title } = Typography;

interface FirstTimeGuideProps {
  visible: boolean;
  onClose: () => void;
}

const FirstTimeGuide = ({ visible, onClose }: FirstTimeGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "欢迎使用正则表达式沙盒",
      icon: <RocketOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            正则表达式（Regular Expression）是一种强大的文本匹配工具，可以帮助你快速查找、替换和验证文本模式。
          </Paragraph>
          <Alert
            message="本工具专为初学者设计"
            description="即使你没有正则表达式基础，也能通过本工具轻松学习和使用正则表达式。"
            type="info"
            showIcon
          />
          <Card size="small" title="主要功能">
            <ul>
              <li>📝 实时编辑和测试正则表达式</li>
              <li>📚 内置常用正则表达式库</li>
              <li>🔍 详细的匹配结果和解释</li>
              <li>📖 正则表达式语法备忘单</li>
              <li>💡 常见用例引导示例</li>
              <li>👁️ 交互式正则表达式可视化</li>
            </ul>
          </Card>
        </Space>
      ),
    },
    {
      title: "界面布局介绍",
      icon: <ThunderboltOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            正则表达式沙盒采用三栏布局，让你可以高效地进行正则表达式开发。
          </Paragraph>
          <Card size="small">
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div>
                <Text strong>📌 左侧面板 - 常用正则表达式库</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  包含预定义的常用正则表达式，点击即可一键应用。支持按分类筛选和搜索。
                </Paragraph>
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Text strong>📌 中间面板 - 编辑和测试区</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  上方是正则表达式编辑器，可以输入模式和选择标志；下方是测试区域，可以输入测试字符串并查看匹配结果。
                </Paragraph>
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Text strong>📌 右侧面板 - 辅助工具区</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  包含正则表达式可视化、选中正则的详细说明、常见用例引导示例和语法备忘单。
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Space>
      ),
    },
    {
      title: "正则表达式可视化",
      icon: <EyeOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            正则表达式可视化功能可以帮助你理解正则表达式的结构和每个部分的作用。
          </Paragraph>
          <Alert
            message="如何使用"
            description="在中间面板输入正则表达式后，右侧面板会自动显示可视化解析。将鼠标悬停在正则表达式的各个部分上，可以看到详细的说明。"
            type="success"
            showIcon
          />
          <Card size="small" title="可视化功能特点">
            <ul>
              <li>🎨 不同颜色标识不同类型的正则表达式元素</li>
              <li>💬 鼠标悬停显示详细说明</li>
              <li>📋 支持展开查看完整的步骤解析</li>
              <li>🚩 标志说明，帮助你理解每个标志的作用</li>
            </ul>
          </Card>
        </Space>
      ),
    },
    {
      title: "常见用例引导示例",
      icon: <BulbOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            常见用例引导示例通过实际案例教你如何构建正则表达式，解决实际问题。
          </Paragraph>
          <Alert
            message="学习路径"
            description="每个用例都按照从简单到复杂的步骤展示正则表达式的构建过程，帮助你理解每个步骤的作用。"
            type="info"
            showIcon
          />
          <Card size="small" title="包含的用例">
            <ul>
              <li>📧 验证电子邮件地址</li>
              <li>📱 提取电话号码</li>
              <li>🔗 提取 URL 链接</li>
              <li>📅 提取日期格式</li>
            </ul>
          </Card>
          <Paragraph>
            每个用例都包含详细的步骤说明、最终正则表达式和示例，你可以点击"尝试此正则表达式"按钮将正则表达式复制到编辑器中进行测试。
          </Paragraph>
        </Space>
      ),
    },
    {
      title: "语法备忘单",
      icon: <BookOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            正则表达式语法备忘单是一个快速参考指南，帮助你快速查找和记忆正则表达式的语法。
          </Paragraph>
          <Card size="small" title="包含的内容">
            <ul>
              <li>🔤 字符类（如 <Text code>\\d</Text>、<Text code>\\w</Text>、<Text code>\\s</Text>）</li>
              <li>🔢 量词（如 *、+、?、<Text code>{`{n}`}</Text>）</li>
              <li>📍 边界匹配（如 ^、$、<Text code>\\b</Text>）</li>
              <li>👥 分组和引用（如 ()、<Text code>\\1</Text>）</li>
              <li>⚡ 特殊字符（如换行符、制表符）</li>
              <li>🚩 常用标志（如 g、i、m）</li>
            </ul>
          </Card>
          <Alert
            message="使用技巧"
            description="每个语法元素都包含描述和示例，帮助你理解其用法。你可以随时展开查看，不需要记忆所有内容。"
            type="success"
            showIcon
          />
        </Space>
      ),
    },
    {
      title: "开始使用",
      icon: <CheckCircleOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Paragraph>
            恭喜！你已经了解了正则表达式沙盒的主要功能和使用方法。现在可以开始使用了！
          </Paragraph>
          <Card size="small" title="快速开始建议">
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div>
                <Text strong>1️⃣ 从预设开始</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  在左侧面板选择一个预设的正则表达式，查看它的效果。
                </Paragraph>
              </div>
              <div>
                <Text strong>2️⃣ 修改和测试</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  在中间面板修改正则表达式或测试字符串，实时查看匹配结果。
                </Paragraph>
              </div>
              <div>
                <Text strong>3️⃣ 学习用例</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  在右侧面板查看常见用例引导示例，学习如何构建正则表达式。
                </Paragraph>
              </div>
              <div>
                <Text strong>4️⃣ 查阅语法</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  遇到不熟悉的语法时，查阅语法备忘单获取帮助。
                </Paragraph>
              </div>
            </Space>
          </Card>
          <Alert
            message="💡 提示"
            description="正则表达式是一个强大的工具，但需要练习才能熟练掌握。多尝试、多练习，你会发现它非常有用！"
            type="info"
            showIcon
          />
        </Space>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          <span>欢迎使用正则表达式沙盒</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="skip" onClick={handleSkip}>
          跳过教程
        </Button>,
        <Button key="prev" onClick={handlePrev} disabled={currentStep === 0}>
          上一步
        </Button>,
        <Button key="next" type="primary" onClick={handleNext}>
          {currentStep === steps.length - 1 ? "开始使用" : "下一步"}
        </Button>,
      ]}
      className="first-time-guide-modal"
    >
      <div style={{ padding: "24px 0" }}>
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 32 }}
          items={steps.map((step) => ({
            title: step.title,
            icon: step.icon,
          }))}
        />

        <div className="guide-content">
          <Title level={4} style={{ marginBottom: 16 }}>
            {steps[currentStep].title}
          </Title>
          {steps[currentStep].content}
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Text type="secondary">
            步骤 {currentStep + 1} / {steps.length}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default FirstTimeGuide;
