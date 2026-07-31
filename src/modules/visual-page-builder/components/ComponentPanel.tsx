import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { Input, Tabs, Space, Typography, Empty, Button } from "antd";
import { SearchOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { getComponentsByCategory } from "../data/componentLibrary";
import { NodeType } from "../types";
import { showShortcutsModal } from "../hooks/useKeyboardShortcuts";
import "./ComponentPanel.scss";

const { Search } = Input;
const { Text } = Typography;

interface DraggableComponentProps {
  component: {
    id: string;
    name: string;
    type: NodeType;
    icon: string;
    description: string;
  };
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({ component }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "component",
    item: () => ({
      type: "component",
      id: component.id,
      componentType: component.type,
      name: component.name,
      icon: component.icon,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`draggable-component ${isDragging ? "dragging" : ""}`}
      title={component.description}
    >
      <span className="component-icon">{component.icon}</span>
      <span className="component-name">{component.name}</span>
    </div>
  );
};

const ComponentPanel: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("layout");
  const [searchTerm, setSearchTerm] = useState("");

  const categories = getComponentsByCategory();

  const tabItems = Object.entries(categories).map(([categoryKey, components]) => {
    const tabLabel =
      {
        layout: "📐 布局",
        basic: "🧱 基础",
        form: "📋 表单",
        media: "🖼️ 媒体",
      }[categoryKey] || categoryKey;

    const filteredComponents = components.filter(
      (component) =>
        component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
      key: categoryKey,
      label: `${tabLabel} (${components.length})`,
      children: (
        <div className="component-list-content">
          {filteredComponents.length > 0 ? (
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              {filteredComponents.map((component) => (
                <DraggableComponent key={component.id} component={component} />
              ))}
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={searchTerm ? "没有找到匹配的组件" : "该分类暂无组件"} />
          )}
        </div>
      ),
    };
  });

  return (
    <div className="component-panel">
      {/* 搜索框 */}
      <div className="search-section">
        <Search
          placeholder="搜索组件..."
          allowClear
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 16 }}
        />
      </div>

      {/* 分类标签和组件列表 */}
      <Tabs
        activeKey={activeCategory}
        onChange={setActiveCategory}
        items={tabItems}
        size="small"
        style={{ height: "calc(100% - 60px)" }}
        tabPosition="top"
        tabBarGutter={8}
      />

      {/* 底部信息 */}
      <div className="panel-footer">
        <Text type="secondary" style={{ fontSize: "12px", flex: 1 }}>
          拖拽组件到画布
        </Text>
        <Button
          size="small"
          type="text"
          icon={<QuestionCircleOutlined />}
          onClick={showShortcutsModal}
          title="键盘快捷键"
        >
          快捷键
        </Button>
      </div>
    </div>
  );
};

export default ComponentPanel;
