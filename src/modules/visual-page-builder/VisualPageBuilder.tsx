import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Layout, Button, Space, Typography, Card } from "antd";
import { SaveOutlined, EyeOutlined, ExportOutlined, ReloadOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import ComponentPanel from "./components/ComponentPanel";
import CanvasArea from "./components/CanvasArea";
import PropertyPanel from "./components/PropertyPanel";
import PreviewArea from "./components/PreviewArea";
import { useCanvasStore } from "./store/useCanvasStore";
import { PreviewMode } from "./types";
import "./styles/VisualPageBuilder.scss";

const { Content } = Layout;
const { Text } = Typography;

const VisualPageBuilder: React.FC = () => {
  const { selectedNodeId, nodes, previewMode, togglePreview } = useCanvasStore();

  // 渲染编辑模式界面
  const renderEditMode = () => (
    <div className="workspace-layout">
      {/* 左侧组件面板 */}
      <Card className="component-panel-container" title="组件库" size="small" style={{ height: "100%" }}>
        <ComponentPanel />
      </Card>

      {/* 中间画布区 */}
      <Card className="canvas-area-container" title="画布" size="small" style={{ height: "100%", overflow: "hidden" }}>
        <CanvasArea />
      </Card>

      {/* 右侧属性面板 */}
      <Card className="property-panel-container" title="属性面板" size="small" style={{ height: "100%" }}>
        <PropertyPanel />
      </Card>
    </div>
  );

  // 渲染预览模式界面
  const renderPreviewMode = () => (
    <div className="preview-layout">
      <PreviewArea />
    </div>
  );

  // 构建头部额外内容
  const headerExtra = (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Space>
        <Button type="primary" icon={<SaveOutlined />}>
          保存
        </Button>
        <Button type={previewMode !== PreviewMode.EDIT ? "primary" : "default"} icon={<EyeOutlined />} onClick={togglePreview}>
          {previewMode === PreviewMode.EDIT ? "预览" : "返回编辑"}
        </Button>
        <Button icon={<ExportOutlined />}>导出</Button>
        <Button icon={<ReloadOutlined />}>重置</Button>
      </Space>
      <Text>
        节点数: {Object.keys(nodes).length} | 选中: {selectedNodeId ? nodes[selectedNodeId]?.name : "无"}
      </Text>
    </div>
  );

  // 构建标题
  const headerTitle = `可视化页面构建器${
    previewMode !== PreviewMode.EDIT ? ` - ${previewMode === PreviewMode.PREVIEW ? "预览模式" : "实时模式"}` : ""
  }`;

  return (
    <DndProvider backend={HTML5Backend}>
      <Layout className="visual-page-builder">
        {/* 顶部工具栏 */}
        <ModuleHeader title={headerTitle} extra={headerExtra} />

        {/* 主工作区 */}
        <Content className="builder-body">{previewMode === PreviewMode.EDIT ? renderEditMode() : renderPreviewMode()}</Content>
      </Layout>
    </DndProvider>
  );
};

export default VisualPageBuilder;
