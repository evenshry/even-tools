import { useState } from "react";
import { List, Typography, Tag, Space, Input, Tabs, Empty, message, Pagination } from "antd";

const { Text, Title } = Typography;

interface RegexPreset {
  id: string;
  name: string;
  description: string;
  pattern: string;
  flags: string;
  category: string;
}

interface RegexLibraryProps {
  presets: RegexPreset[];
  onPresetSelect: (preset: RegexPreset) => void;
  selectedPreset?: RegexPreset | null;
}

const RegexLibrary = ({ presets, onPresetSelect, selectedPreset }: RegexLibraryProps) => {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [currentPage, setCurrentPage] = useState(1);

  const categories = Array.from(new Set(presets.map((preset) => preset.category)));

  const filteredPresets = presets.filter((preset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchText.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchText.toLowerCase()) ||
      preset.pattern.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === "全部" || preset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pageSize = 8;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPresets = filteredPresets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleQuickApply = (preset: RegexPreset) => {
    onPresetSelect(preset);
    message.success(`已应用正则表达式: ${preset.name}`);
  };

  const renderPreset = (preset: RegexPreset) => {
    const isSelected = selectedPreset?.id === preset.id;

    return (
      <List.Item
        key={preset.id}
        className={`preset-item ${isSelected ? "preset-item--selected" : ""}`}
        onClick={() => handleQuickApply(preset)}
      >
        <List.Item.Meta
          title={
            <Space>
              <Text strong style={{ fontSize: 14 }}>
                {preset.name}
              </Text>
              <Tag color="blue" style={{ fontSize: 11 }}>
                {preset.category}
              </Tag>
              {isSelected && <Tag color="green">已选中</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {preset.description}
              </Text>
              <div className="preset-pattern">
                <Text code style={{ fontSize: 11 }}>
                  {preset.pattern}
                </Text>
                <Tag color="purple" style={{ marginLeft: 8, fontSize: 11 }}>
                  {preset.flags || "无标志"}
                </Tag>
              </div>
            </Space>
          }
        />
      </List.Item>
    );
  };

  const categoryItems = [
    { key: "全部", label: "全部" },
    ...categories.map((category) => ({
      key: category,
      label: category,
    })),
  ];

  return (
    <Space direction="vertical" size="small" className="regex-library" style={{ width: "100%", padding: 15 }}>
      <Title level={4}>常用正则表达式</Title>
      <div className="regex-library-search">
        <Input.Search
          placeholder="搜索正则表达式..."
          allowClear
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <Tabs
        activeKey={selectedCategory}
        onChange={handleCategoryChange}
        items={categoryItems}
        size="small"
        tabBarStyle={{ marginBottom: 12 }}
      />

      {filteredPresets.length > 0 ? (
        <>
          <List dataSource={currentPresets} renderItem={renderPreset} className="regex-library-list" size="small" pagination={false} />

          <Pagination
            align="end"
            total={filteredPresets.length}
            pageSize={pageSize}
            current={currentPage}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total) => `共 ${total} 个`}
            style={{ marginTop: 12 }}
          />
        </>
      ) : (
        <Empty description="未找到匹配的正则表达式" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "20px 0" }} />
      )}
    </Space>
  );
};

export default RegexLibrary;
