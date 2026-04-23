import React, { useState } from "react";
import { Layout, Button, Tooltip, Modal, message, Dropdown } from "antd";
import { EyeOutlined, ExportOutlined, ImportOutlined, ReloadOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import ComponentPanel from "./components/ComponentPanel";
import CanvasArea from "./components/CanvasArea";
import PropertyPanel from "./components/PropertyPanel";
import { useFloorPlanStore } from "./store/useFloorPlanStore";
import { ExportUtils } from "./utils/exportUtils";
import "./FloorPlanGenerator.scss";

const { Content } = Layout;

const FloorPlanGenerator: React.FC = () => {
  const { 
    previewMode, 
    togglePreview, 
    houseConfig, 
    resetConfig,
    setHouseConfig
  } = useFloorPlanStore();
  
  const [selectedElement, setSelectedElement] = useState<Record<string, any> | null>(null);

  // 渲染编辑模式
  const renderEditMode = () => (
    <div className="workspace-layout">
      <div className="component-panel-container">
        <ComponentPanel />
      </div>
      <div className="canvas-area-container">
        <CanvasArea 
          previewMode={false} 
          onElementSelect={setSelectedElement}
        />
      </div>
      <div className="property-panel-container">
        <PropertyPanel selectedElement={selectedElement} />
      </div>
    </div>
  );

  // 渲染预览模式
  const renderPreviewMode = () => (
    <div className="preview-layout">
      <CanvasArea previewMode={true} />
    </div>
  );

  // 导出功能
  const handleExport = async (type: "svg" | "png" | "json" | "copySvg") => {
    if (houseConfig.rooms.length === 0) {
      message.warning("请先添加房间");
      return;
    }
    
    try {
      if (type === "svg") {
        ExportUtils.exportConfigAsSVG(houseConfig);
        message.success("已导出 SVG");
      } else if (type === "png") {
        await ExportUtils.exportConfigAsPNG(houseConfig);
        message.success("已导出 PNG");
      } else if (type === "json") {
        ExportUtils.exportAsJSON(houseConfig);
        message.success("已导出 JSON");
      } else {
        await ExportUtils.copyConfigSVGToClipboard(houseConfig);
        message.success("已复制 SVG 到剪贴板");
      }
    } catch {
      message.error("导出失败");
    }
  };

  // 重置配置
  const handleReset = () => {
    Modal.confirm({
      title: "确认重置",
      content: "这将清除所有设计内容，是否继续？",
      onOk: () => {
        resetConfig();
        message.success("配置已重置");
      }
    });
  };

  // 处理导入配置
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const config = JSON.parse(content) as FloorPlan.HouseConfig;
            setHouseConfig(config);
            message.success('配置导入成功');
          } catch (error) {
            message.error('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // 头部额外内容
  const headerExtra = (
    <div className="header-actions">
      <Tooltip title="切换预览模式">
        <Button 
          type={previewMode ? "primary" : "default"}
          icon={<EyeOutlined />}
          onClick={togglePreview}
          size="small"
        >
          {previewMode ? "退出预览" : "预览"}
        </Button>
      </Tooltip>
      
      <Tooltip title="导入设计">
        <Button 
          icon={<ImportOutlined />}
          onClick={handleImport}
          size="small"
          style={{ marginLeft: 8 }}
        >
          导入
        </Button>
      </Tooltip>
      
      <Tooltip title="导出设计">
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "svg", label: "导出 SVG" },
              { key: "png", label: "导出 PNG" },
              { key: "json", label: "导出 JSON" },
              { key: "copySvg", label: "复制 SVG" }
            ],
            onClick: ({ key }) => handleExport(key as any)
          }}
        >
          <Button icon={<ExportOutlined />} size="small" style={{ marginLeft: 8 }}>
            导出
          </Button>
        </Dropdown>
      </Tooltip>
      
      <Tooltip title="重置配置">
        <Button 
          icon={<ReloadOutlined />}
          onClick={handleReset}
          size="small"
          style={{ marginLeft: 8 }}
        >
          重置
        </Button>
      </Tooltip>
    </div>
  );

  return (
    <Layout className="floor-plan-generator">
      <ModuleHeader
        title="房屋平面设计图生成器"
        extra={headerExtra}
      />
      <Content style={{ padding: "16px", height: "calc(100vh - 120px)" }}>
        {previewMode ? renderPreviewMode() : renderEditMode()}
      </Content>
    </Layout>
  );
};

export default FloorPlanGenerator;
