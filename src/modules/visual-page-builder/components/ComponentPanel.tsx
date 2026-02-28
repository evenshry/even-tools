import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { Input, Tabs, Space, Typography, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getComponentsByCategory } from "../data/componentLibrary";
import { NodeType } from "../types";
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
    item: () => {
      console.log(`开始拖拽组件: ${component.name} (${component.type})`);
      return {
        type: "component",
        id: component.id,
        componentType: component.type,
        name: component.name,
        icon: component.icon,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_, monitor) => {
      if (monitor.didDrop()) {
        console.log(`组件 ${component.name} 成功放置`);
      } else {
        console.log(`组件 ${component.name} 拖拽取消`);
      }
    },
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
            <Space orientation="vertical" style={{ width: "100%" }} size="small">
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
        tabPlacement="top"
        tabBarGutter={8}
      />

      {/* 底部信息 */}
      <div className="panel-footer">
        <Text type="secondary" style={{ fontSize: "12px" }}>
          拖拽组件到画布
        </Text>
      </div>
    </div>
  );
};

export default ComponentPanel;
