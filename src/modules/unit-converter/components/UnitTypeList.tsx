import React from "react";
import { Card, Typography, Row, Col, Statistic } from "antd";
import "./UnitTypeList.scss";

const { Title } = Typography;

// 单位类型列表组件属性
interface UnitTypeListProps {
  categories: UnitConversion.UnitCategory[]; // 单位类型列表
  selectedCategoryId: string | null; // 当前选中的单位类型ID
  onSelectCategory: (categoryId: string) => void; // 选择单位类型的回调函数
}

// 单位类型列表组件 - 展示所有可用的单位类型（如长度、重量、温度等）
const UnitTypeList: React.FC<UnitTypeListProps> = ({ categories, selectedCategoryId, onSelectCategory }) => {
  return (
    <div>
      <Title level={3} className="unit-type-list__title">
        单位类型
      </Title>
      <Row gutter={[16, 16]}>
        {categories.map((category) => (
          <Col xs={24} sm={24} md={24} key={category.id}>
            <Card
              hoverable
              onClick={() => onSelectCategory(category.id)}
              className={`unit-type-list__card ${selectedCategoryId === category.id ? "unit-type-list__card--selected" : ""}`}
              styles={{ body: { padding: "20px" } }}
            >
              <div className="unit-type-list__card-header">
                <Title level={4} className="unit-type-list__card-title">
                  {category.name}
                </Title>
                {category.description && (
                  <Typography.Text type="secondary" className="unit-type-list__card-description">
                    {category.description}
                  </Typography.Text>
                )}
              </div>
              {/* 显示该类型下的分组数和单位总数 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="分组" value={category.groups.length} valueStyle={{ fontSize: "20px" }} />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="单位"
                    value={category.groups.reduce((total, group) => total + group.units.length, 0)}
                    valueStyle={{ fontSize: "20px" }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default UnitTypeList;
