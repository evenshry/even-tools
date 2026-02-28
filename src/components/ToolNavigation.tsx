import React from "react";
import { Link } from "react-router-dom";
import { Card, Typography, Space } from "antd";
import "./ToolNavigation.scss";

const { Title, Text, Paragraph } = Typography;

// 工具元数据接口
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

// 工具导航组件属性
interface ToolNavigationProps {
  tools: Tool[]; // 工具列表
}

// 工具导航组件 - 首页展示所有可用工具
const ToolNavigation: React.FC<ToolNavigationProps> = ({ tools }) => {
  // 提取所有工具分类（去重）
  const categories = Array.from(new Set(tools.map((tool) => tool.category)));

  return (
    <div className="tool-navigation">
      <div className="tool-navigation__header">
        <Title level={2} className="tool-navigation__title">
          实用工具集
        </Title>
        <Text type="secondary" className="tool-navigation__description">
          选择一个工具开始使用
        </Text>
      </div>

      {/* 按分类展示工具 */}
      <div className="tool-navigation__list">
        {categories.map((category) => (
          <div key={category} className="tool-navigation__category">
            <Title level={3} className="tool-navigation__category-title">
              {category}
            </Title>
            <div className="tool-navigation__category-body">
              {tools
                .filter((tool) => tool.category === category) // 筛选当前分类的工具
                .map((tool) => (
                  <div key={tool.id} className="tool-navigation__category-item">
                    <Link to={`/${tool.id}`} className="tool-navigation__link">
                      <Card hoverable className="tool-navigation__card" styles={{ body: { padding: "24px" } }}>
                        <Space orientation="vertical" size={10} className="tool-navigation__space">
                          <div className="tool-navigation__icon">{tool.icon}</div>
                          <Title level={4} className="tool-navigation__tool-title">
                            {tool.name}
                          </Title>
                          <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="tool-navigation__tool-description">
                            {tool.description}
                          </Paragraph>
                        </Space>
                      </Card>
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolNavigation;
