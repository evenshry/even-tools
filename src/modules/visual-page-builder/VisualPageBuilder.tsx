import React, { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Layout, Button, Space, Typography, Card, Modal, message, Tooltip, Tabs } from "antd";
import { SaveOutlined, EyeOutlined, ExportOutlined, ReloadOutlined, UndoOutlined, RedoOutlined, AppstoreOutlined, BlockOutlined, LayoutOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import ComponentPanel from "./components/ComponentPanel";
import LayerPanel from "./components/LayerPanel";
import TemplateGallery from "./components/TemplateGallery";
import CanvasArea from "./components/CanvasArea";
import PropertyPanel from "./components/PropertyPanel";
import PreviewArea from "./components/PreviewArea";
import CodeExportModal from "./components/CodeExportModal";
import { useCanvasStore } from "./store/useCanvasStore";
import { PreviewMode } from "./types";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";
import "./styles/VisualPageBuilder.scss";

const { Content } = Layout;
const { Text } = Typography;

// 自动保存间隔（ms）
const AUTO_SAVE_INTERVAL = 30_000;
// 节点变更后 debounce 自动保存延迟（ms）
const AUTO_SAVE_DEBOUNCE = 5_000;

const VisualPageBuilder: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);
  // 精确订阅：拆分为多个选择器，避免全量订阅导致 hover/drag 时整体重渲染
  const selectedNodeId = useCanvasStore(s => s.selectedNodeId);
  const nodes = useCanvasStore(s => s.nodes);
  const previewMode = useCanvasStore(s => s.previewMode);
  const isDirty = useCanvasStore(s => s.isDirty);
  const isSaving = useCanvasStore(s => s.isSaving);
  const canUndo = useCanvasStore(s => s.canUndo);
  const canRedo = useCanvasStore(s => s.canRedo);
  const togglePreview = useCanvasStore(s => s.togglePreview);
  const resetCanvas = useCanvasStore(s => s.resetCanvas);
  const undo = useCanvasStore(s => s.undo);
  const redo = useCanvasStore(s => s.redo);
  const loadPage = useCanvasStore(s => s.loadPage);
  const saveCurrentPage = useCanvasStore(s => s.saveCurrentPage);

  const [leftPanelTab, setLeftPanelTab] = useState<'components' | 'layers' | 'templates'>('components');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化：加载最近一次保存的页面
  useEffect(() => {
    loadPage().catch(() => {
      // 加载失败（如 IndexedDB 不可用）静默处理，用户可正常使用
    });
  }, [loadPage]);

  // 定时自动保存（依赖数组移除 nodes，定时器内读取最新状态，避免持续编辑时定时器不断重置）
  useEffect(() => {
    const timer = setInterval(() => {
      const state = useCanvasStore.getState();
      if (state.isDirty && !state.isSaving && Object.keys(state.nodes).length > 0) {
        state.saveCurrentPage().catch(() => {
          // 静默失败
        });
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // 节点变更后 debounce 自动保存
  useEffect(() => {
    if (!isDirty) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const state = useCanvasStore.getState();
      if (Object.keys(state.nodes).length > 0 && !state.isSaving) {
        state.saveCurrentPage().catch(() => {});
      }
    }, AUTO_SAVE_DEBOUNCE);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [nodes, isDirty, isSaving]);

  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCanvasStore.getState();
      if (state.isDirty && Object.keys(state.nodes).length > 0) {
        // beforeunload 中无法可靠执行 async，用 sendBeacon 不适用 IndexedDB
        // 仅作提示，实际保存依赖定时/debounce
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 保存画布
  const handleSave = useCallback(async () => {
    const nodeCount = Object.keys(nodes).length;
    if (nodeCount === 0) {
      message.warning("画布为空，无需保存");
      return;
    }
    message.loading({ content: "正在保存...", key: "vpb-save", duration: 0 });
    try {
      await saveCurrentPage();
      message.success({ content: `已保存 ${nodeCount} 个节点`, key: "vpb-save" });
    } catch (e) {
      message.error({ content: "保存失败（浏览器可能不支持 IndexedDB）", key: "vpb-save" });
    }
  }, [nodes, saveCurrentPage]);

  // 重置画布
  const handleReset = useCallback(() => {
    if (Object.keys(nodes).length === 0) {
      message.info("画布已为空");
      return;
    }
    Modal.confirm({
      title: "确认重置画布？",
      content: "当前所有节点将被清空。可使用撤销恢复。",
      okText: "重置",
      okType: "danger",
      cancelText: "取消",
      onOk: () => {
        resetCanvas();
        message.success("画布已重置");
      }
    });
  }, [nodes, resetCanvas]);

  // 导出代码（弹出 Modal，支持 HTML / React / Schema 三种格式）
  const handleExport = useCallback(() => {
    if (Object.keys(nodes).length === 0) {
      message.warning("画布为空，无可导出内容");
      return;
    }
    setExportModalOpen(true);
  }, [nodes]);

  // 渲染编辑模式界面
  const renderEditMode = () => (
    <div className="workspace-layout">
      <Card
        className="component-panel-container"
        size="small"
        style={{ height: "100%", overflow: "hidden" }}
        bodyStyle={{ height: "calc(100% - 40px)", padding: 0 }}
      >
        <Tabs
          activeKey={leftPanelTab}
          onChange={(k) => setLeftPanelTab(k as 'components' | 'layers' | 'templates')}
          size="small"
          className="left-panel-tabs"
          items={[
            {
              key: 'components',
              label: (
                <span>
                  <AppstoreOutlined /> 组件库
                </span>
              ),
              children: <ComponentPanel />,
            },
            {
              key: 'layers',
              label: (
                <span>
                  <BlockOutlined /> 图层
                </span>
              ),
              children: <LayerPanel />,
            },
            {
              key: 'templates',
              label: (
                <span>
                  <LayoutOutlined /> 模板
                </span>
              ),
              children: <TemplateGallery />,
            },
          ]}
        />
      </Card>
      <Card className="canvas-area-container" title="画布" size="small" style={{ height: "100%", overflow: "hidden" }}>
        <CanvasArea />
      </Card>
      <Card className="property-panel-container" title="属性面板" size="small" style={{ height: "100%" }}>
        <PropertyPanel />
      </Card>
    </div>
  );

  const renderPreviewMode = () => (
    <div className="preview-layout">
      <PreviewArea />
    </div>
  );

  const headerExtra = (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Space>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!canUndo}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!canRedo}
          />
        </Tooltip>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
        >
          保存
        </Button>
        <Button type={previewMode !== PreviewMode.EDIT ? "primary" : "default"} icon={<EyeOutlined />} onClick={togglePreview}>
          {previewMode === PreviewMode.EDIT ? "预览" : "返回编辑"}
        </Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </Space>
      <Text>
        节点数: {Object.keys(nodes).length} | 选中: {selectedNodeId ? nodes[selectedNodeId]?.name : "无"}
        {isDirty && <span style={{ color: semanticColors.warning[mode], marginLeft: 8 }}>· 未保存</span>}
      </Text>
    </div>
  );

  const headerTitle = `可视化页面构建器${
    previewMode !== PreviewMode.EDIT ? " - 预览模式" : ""
  }`;

  return (
    <DndProvider backend={HTML5Backend}>
      <Layout className="visual-page-builder">
        <ModuleHeader title={headerTitle} extra={headerExtra} />
        <Content className="builder-body">{previewMode === PreviewMode.EDIT ? renderEditMode() : renderPreviewMode()}</Content>
        <CodeExportModal
          open={exportModalOpen}
          nodes={nodes}
          onClose={() => setExportModalOpen(false)}
        />
      </Layout>
    </DndProvider>
  );
};

export default VisualPageBuilder;
