import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Space, Tag, Empty, Collapse } from "antd";
import "./UnitList.scss";

const { Title, Text } = Typography;

// 单位列表组件属性
interface UnitListProps {
  selectedCategory: UnitConversion.UnitCategory | null; // 当前选中的单位类型
  selectedFromUnit: UnitConversion.Unit | null; // 当前选中的源单位
  selectedToUnit: UnitConversion.Unit | null; // 当前选中的目标单位
  onSelectFromUnit: (unit: UnitConversion.Unit) => void; // 选择源单位的回调函数
  onSelectToUnit: (unit: UnitConversion.Unit) => void; // 选择目标单位的回调函数
}

// 单位列表组件 - 展示选中类型下的所有单位，支持选择源单位和目标单位
const UnitList: React.FC<UnitListProps> = ({ selectedCategory, selectedFromUnit, selectedToUnit, onSelectFromUnit, onSelectToUnit }) => {
  // 控制折叠面板展开状态
  const [activeKey, setActiveKey] = useState<string[]>([]);

  // 当切换单位类型时，自动展开第一个分组
  useEffect(() => {
    if (selectedCategory && selectedCategory.groups.length > 0) {
      setActiveKey([selectedCategory.groups[0].id]);
    }
  }, [selectedCategory]);

  // 未选择单位类型时显示空状态
  if (!selectedCategory) {
    return (
      <div className="unit-list__empty">
        <Empty description="请选择一个单位类型" />
      </div>
    );
  }

  return (
    <div>
      <Title level={3} className="unit-list__title">
        选择单位
      </Title>
      
      {/* 折叠面板展示各分组下的单位 */}
      <Collapse
        accordion // 手风琴模式，同时只能展开一个面板
        activeKey={activeKey}
        onChange={(keys) => setActiveKey(keys as string[])}
        items={selectedCategory.groups.map((group: UnitConversion.UnitGroup) => ({
          key: group.id,
          label: (
            <Space>
              <Text strong>{group.name}</Text>
              {group.description && (
                <Text type="secondary" className="unit-list__collapse-label-description">
                  - {group.description}
                </Text>
              )}
            </Space>
          ),
          children: (
            <Space direction="vertical" size={16} className="unit-list__space">
              {group.units.map((unit: UnitConversion.Unit) => (
                <Card
                  key={unit.id}
                  className={`unit-list__card ${selectedFromUnit?.id === unit.id ? "unit-list__card--from-selected" : ""} ${
                    selectedToUnit?.id === unit.id ? "unit-list__card--to-selected" : ""
                  }`}
                  styles={{ body: { padding: "16px" } }}
                >
                  <Space orientation="vertical" size={12} className="unit-list__space">
                    <div className="unit-list__card-header">
                      <Space>
                        <Title level={5} className="unit-list__card-title">
                          {unit.name}
                        </Title>
                        {/* 单位类型标签：现代单位或古代单位 */}
                        <Tag color={unit.type === "modern" ? "blue" : "orange"}>{unit.type === "modern" ? "现代" : "古代"}</Tag>
                      </Space>
                      <Text code className="unit-list__card-symbol">
                        {unit.symbol}
                      </Text>
                    </div>

                    {unit.description && (
                      <Text type="secondary" className="unit-list__card-description">
                        {unit.description}
                      </Text>
                    )}

                    {/* 操作按钮：设为源单位或目标单位 */}
                    <Space size={8}>
                      <Button
                        type={selectedFromUnit?.id === unit.id ? "primary" : "default"}
                        onClick={() => onSelectFromUnit(unit)}
                        disabled={selectedFromUnit?.id === unit.id}
                        className={selectedFromUnit?.id === unit.id ? "unit-list__button--from-selected" : ""}
                      >
                        {selectedFromUnit?.id === unit.id ? "已选作源单位" : "设为源单位"}
                      </Button>
                      <Button
                        type={selectedToUnit?.id === unit.id ? "primary" : "default"}
                        onClick={() => onSelectToUnit(unit)}
                        disabled={selectedToUnit?.id === unit.id}
                        className={selectedToUnit?.id === unit.id ? "unit-list__button--to-selected" : ""}
                      >
                        {selectedToUnit?.id === unit.id ? "已选作目标单位" : "设为目标单位"}
                      </Button>
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
          ),
        }))}
      />
    </div>
  );
};

export default UnitList;
