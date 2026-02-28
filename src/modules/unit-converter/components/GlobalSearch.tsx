import React, { useState, useMemo } from "react";
import { Input, List, Card, Tag, Typography, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { unitData } from "@/modules/unit-converter/data/unitData";
import "@/modules/unit-converter/components/GlobalSearch.scss";

const { Text } = Typography;

// 全局搜索结果项
interface SearchResultItem {
  unit: UnitConversion.Unit;
  categoryId: string;
  categoryName: string;
  groupId: string;
  groupName: string;
}

// 全局搜索组件属性
interface GlobalSearchProps {
  onSearchResultClick: (categoryId: string, unit: UnitConversion.Unit) => void;
}

// 全局搜索组件 - 支持跨类型搜索单位
const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSearchResultClick }) => {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);

  // 跨类型搜索所有单位
  const searchResults = useMemo((): SearchResultItem[] => {
    if (!searchKeyword.trim()) return [];

    const lowerKeyword = searchKeyword.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    unitData.forEach((category) => {
      category.groups.forEach((group) => {
        group.units.forEach((unit) => {
          const nameMatch = unit.name.toLowerCase().includes(lowerKeyword);
          const symbolMatch = unit.symbol.toLowerCase().includes(lowerKeyword);
          const descriptionMatch = unit.description ? unit.description.toLowerCase().includes(lowerKeyword) : false;

          if (nameMatch || symbolMatch || descriptionMatch) {
            results.push({
              unit,
              categoryId: category.id,
              categoryName: category.name,
              groupId: group.id,
              groupName: group.name,
            });
          }
        });
      });
    });

    return results;
  }, [searchKeyword]);

  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setShowResults(true);
  };

  // 处理搜索结果点击
  const handleResultClick = (result: SearchResultItem) => {
    onSearchResultClick(result.categoryId, result.unit);
    setShowResults(false);
    setSearchKeyword("");
  };

  // 处理输入框失焦
  const handleBlur = () => {
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  // 处理输入框聚焦
  const handleFocus = () => {
    if (searchKeyword.trim()) {
      setShowResults(true);
    }
  };

  return (
    <div className="global-search">
      <Input
        placeholder="全局搜索单位"
        prefix={<SearchOutlined />}
        value={searchKeyword}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        allowClear
        size="large"
        className="global-search__input"
      />

      {showResults && searchKeyword.trim() && (
        <Card className="global-search__results" bordered={false}>
          {searchResults.length === 0 ? (
            <Empty description={`未找到与"${searchKeyword}"匹配的单位`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={searchResults}
              renderItem={(item) => (
                <List.Item
                  className="global-search__result-item"
                  onClick={() => handleResultClick(item)}
                >
                  <div className="global-search__result-content">
                    <div className="global-search__result-header">
                      <Text strong className="global-search__result-name">
                        {item.unit.name}
                      </Text>
                      <Text code className="global-search__result-symbol">
                        {item.unit.symbol}
                      </Text>
                      <Tag color={item.unit.type === "modern" ? "blue" : "orange"} className="global-search__result-tag">
                        {item.unit.type === "modern" ? "现代" : "古代"}
                      </Tag>
                    </div>
                    <div className="global-search__result-meta">
                      <Text type="secondary" className="global-search__result-category">
                        {item.categoryName}
                      </Text>
                      <Text type="secondary" className="global-search__result-group">
                        {item.groupName}
                      </Text>
                    </div>
                    {item.unit.description && (
                      <Text type="secondary" className="global-search__result-description">
                        {item.unit.description}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
