import { useState, useEffect } from "react";
import { Layout } from "antd";
import UnitTypeList from "@/modules/unit-converter/components/UnitTypeList";
import UnitList from "@/modules/unit-converter/components/UnitList";
import ConversionResultDisplay from "@/modules/unit-converter/components/ConversionResultDisplay";
import GlobalSearch from "@/modules/unit-converter/components/GlobalSearch";
import ModuleHeader from "@/components/ModuleHeader";
import { unitData } from "@/modules/unit-converter/data/unitData";
import "@/modules/unit-converter/UnitConverter.scss";

const { Content, Sider } = Layout;

// 单位换算器主组件 - 管理整个单位换算流程的状态和布局
const UnitConverter = () => {
  // 选中的单位类型ID
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  // 选中的源单位（要转换的单位）
  const [selectedFromUnit, setSelectedFromUnit] = useState<UnitConversion.Unit | null>(null);
  // 选中的目标单位（转换后的单位）
  const [selectedToUnit, setSelectedToUnit] = useState<UnitConversion.Unit | null>(null);

  // 根据选中的ID获取完整的单位类型数据
  const selectedCategory = unitData.find((category) => category.id === selectedCategoryId) || null;

  // 初始化：默认选择第一个单位类型和前两个单位
  useEffect(() => {
    if (unitData.length > 0 && !selectedCategoryId) {
      const firstCategory = unitData[0];
      setSelectedCategoryId(firstCategory.id);
      // 获取该类型下所有单位
      const allUnits = firstCategory.groups.flatMap((group) => group.units);
      if (allUnits.length >= 2) {
        setSelectedFromUnit(allUnits[0]);
        setSelectedToUnit(allUnits[1]);
      }
    }
  }, [selectedCategoryId]);

  // 处理单位类型选择
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = unitData.find((c) => c.id === categoryId);
    if (category) {
      // 获取新类型下的所有单位
      const allUnits = category.groups.flatMap((group) => group.units);
      if (allUnits.length >= 2) {
        // 默认选择前两个单位
        setSelectedFromUnit(allUnits[0]);
        setSelectedToUnit(allUnits[1]);
      } else {
        setSelectedFromUnit(null);
        setSelectedToUnit(null);
      }
    }
  };

  // 处理源单位选择
  const handleSelectFromUnit = (unit: UnitConversion.Unit) => {
    setSelectedFromUnit(unit);
    // 如果目标单位未选择或与源单位相同，自动选择不同的单位
    if (!selectedToUnit || selectedToUnit.id === unit.id) {
      const allUnits = selectedCategory?.groups.flatMap((group) => group.units) || [];
      const firstDifferentUnit = allUnits.find((u) => u.id !== unit.id);
      if (firstDifferentUnit) {
        setSelectedToUnit(firstDifferentUnit);
      }
    }
  };

  // 处理目标单位选择
  const handleSelectToUnit = (unit: UnitConversion.Unit) => {
    setSelectedToUnit(unit);
  };

  // 交换源单位和目标单位
  const handleSwapUnits = () => {
    if (selectedFromUnit && selectedToUnit) {
      const tempUnit = selectedFromUnit;
      setSelectedFromUnit(selectedToUnit);
      setSelectedToUnit(tempUnit);
    }
  };

  // 处理全局搜索结果点击
  const handleGlobalSearchResultClick = (categoryId: string, unit: UnitConversion.Unit) => {
    setSelectedCategoryId(categoryId);
    const category = unitData.find((c) => c.id === categoryId);
    if (category) {
      const allUnits = category.groups.flatMap((group) => group.units);
      if (allUnits.length >= 2) {
        setSelectedFromUnit(unit);
        const firstDifferentUnit = allUnits.find((u) => u.id !== unit.id);
        if (firstDifferentUnit) {
          setSelectedToUnit(firstDifferentUnit);
        } else {
          setSelectedToUnit(null);
        }
      } else {
        setSelectedFromUnit(unit);
        setSelectedToUnit(null);
      }
    }
  };

  return (
    <Layout className="unit-converter">
      <ModuleHeader 
        title="单位换算大全"
        extra={<GlobalSearch onSearchResultClick={handleGlobalSearchResultClick} />}
      />

      <Layout>
        {/* 左侧边栏：单位类型列表 */}
        <Sider width={400} className="unit-converter__sider">
          <UnitTypeList categories={unitData} selectedCategoryId={selectedCategoryId} onSelectCategory={handleSelectCategory} />
        </Sider>
        {/* 中间边栏：单位选择列表 */}
        <Sider width={400} className="unit-converter__unit-list">
          <UnitList
            selectedCategory={selectedCategory}
            selectedFromUnit={selectedFromUnit}
            selectedToUnit={selectedToUnit}
            onSelectFromUnit={handleSelectFromUnit}
            onSelectToUnit={handleSelectToUnit}
          />
        </Sider>

        {/* 右侧内容区：换算结果显示 */}
        <Content className="unit-converter__content">
          <div className="unit-converter__result-container">
            <ConversionResultDisplay selectedFromUnit={selectedFromUnit} selectedToUnit={selectedToUnit} onSwapUnits={handleSwapUnits} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default UnitConverter;
