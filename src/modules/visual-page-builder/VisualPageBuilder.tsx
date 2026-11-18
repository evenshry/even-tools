import React, { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Layout, Button, Space, Typography, Card, Modal, message, Tooltip, Tabs, List, Input, Popconfirm, Tag } from "antd";
import { SaveOutlined, EyeOutlined, ExportOutlined, ReloadOutlined, UndoOutlined, RedoOutlined, AppstoreOutlined, BlockOutlined, LayoutOutlined, FileTextOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import ComponentPanel from "./components/ComponentPanel";
import LayerPanel from "./components/LayerPanel";
import TemplateGallery from "./components/TemplateGallery";
import CanvasArea from "./components/CanvasArea";
import PropertyPanel from "./components/PropertyPanel";
import PreviewArea from "./components/PreviewArea";
import CodeExportModal from "./components/CodeExportModal";
import HelpDrawer from "./components/HelpDrawer";
import { useCanvasStore } from "./store/useCanvasStore";
import type { SavedPage } from "./store/usePagePersistence";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
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
  const currentPageId = useCanvasStore(s => s.pageId);
  const pageName = useCanvasStore(s => s.pageName);
  const listPages = useCanvasStore(s => s.listPages);
  const createPage = useCanvasStore(s => s.createPage);
  const switchPage = useCanvasStore(s => s.switchPage);
  const renamePage = useCanvasStore(s => s.renamePage);
  const deletePage = useCanvasStore(s => s.deletePage);

  const [leftPanelTab, setLeftPanelTab] = useState<'components' | 'layers' | 'templates'>('components');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [pageActionLoading, setPageActionLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 快捷键挂载在模块根组件：编辑/预览模式均可响应
  useKeyboardShortcuts();

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
      if (state.isDirty && !state.isSaving) {
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
      if (!state.isSaving) {
        state.saveCurrentPage().catch(() => {});
      }
    }, AUTO_SAVE_DEBOUNCE);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [nodes, isDirty, isSaving]);

  // 页面卸载前提示未保存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = useCanvasStore.getState();
      if (state.isDirty) {
        // 浏览器只允许通过 preventDefault 触发原生确认弹窗
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 保存画布
  const handleSave = useCallback(async () => {
    const nodeCount = Object.keys(nodes).length;
    message.loading({ content: "正在保存...", key: "vpb-save", duration: 0 });
    try {
      await saveCurrentPage();
      message.success({ content: `已保存 ${nodeCount} 个节点`, key: "vpb-save" });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error({ content: `保存失败（浏览器可能不支持 IndexedDB）：${detail}`, key: "vpb-save" });
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

  // 刷新页面列表
  const refreshPages = useCallback(async () => {
    try {
      setPages(await listPages());
    } catch {
      // IndexedDB 不可用时保持空列表，不影响编辑
    }
  }, [listPages]);

  // 执行页面操作：统一处理 loading、错误提示与列表刷新
  const runPageAction = useCallback(
    async (action: () => Promise<void>, successText?: string) => {
      setPageActionLoading(true);
      try {
        await action();
        await refreshPages();
        if (successText) message.success(successText);
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(detail);
      } finally {
        setPageActionLoading(false);
      }
    },
    [refreshPages]
  );

  const handleOpenPageModal = useCallback(() => {
    setPageModalOpen(true);
    refreshPages();
  }, [refreshPages]);

  const handleCreatePage = useCallback(() => {
    runPageAction(() => createPage(), "已新建页面");
  }, [runPageAction, createPage]);

  const handleSwitchPage = useCallback(
    (id: string) => {
      runPageAction(() => switchPage(id));
    },
    [runPageAction, switchPage]
  );

  const handleRenamePage = useCallback(
    (id: string, name: string) => {
      runPageAction(() => renamePage(id, name));
    },
    [runPageAction, renamePage]
  );

  const handleDeletePage = useCallback(
    (id: string) => {
      runPageAction(() => deletePage(id), "页面已删除");
    },
    [runPageAction, deletePage]
  );

  // 渲染编辑模式界面
  const renderEditMode = () => (
    <div className="workspace-layout">
      <Card
        className="component-panel-container"
        size="small"
        style={{ height: "100%", overflow: "hidden" }}
        styles={{ body: { height: "calc(100% - 40px)", padding: 0 } }}
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
        <CanvasArea extraActions={canvasExtraActions} />
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

  const canvasExtraActions = (
    <>
      <Space>
        <Tooltip title="页面管理">
          <Button size="small" icon={<FileTextOutlined />} onClick={handleOpenPageModal}>
            页面
          </Button>
        </Tooltip>
        <Tooltip title="操作指南">
          <Button size="small" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)}>
            指南
          </Button>
        </Tooltip>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!canUndo}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!canRedo}
          />
        </Tooltip>
        <Button
          size="small"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
        >
          保存
        </Button>
        <Button
          size="small"
          type={previewMode !== PreviewMode.EDIT ? "primary" : "default"}
          icon={<EyeOutlined />}
          onClick={togglePreview}
        >
          {previewMode === PreviewMode.EDIT ? "预览" : "返回编辑"}
        </Button>
        <Button size="small" icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </Space>
      <Text style={{ fontSize: 12, color: "var(--et-ink-2)" }}>
        页面: {pageName} | 节点数: {Object.keys(nodes).length} | 选中: {selectedNodeId ? nodes[selectedNodeId]?.name : "无"}
        {isDirty && <span style={{ color: semanticColors.warning[mode], marginLeft: 8 }}>· 未保存</span>}
      </Text>
    </>
  );

  const headerTitle = `可视化页面构建器${
    previewMode !== PreviewMode.EDIT ? " - 预览模式" : ""
  }`;

  return (
    <DndProvider backend={HTML5Backend}>
      <Layout className="visual-page-builder">
        <ModuleHeader title={headerTitle} />
        <Content className="builder-body">{previewMode === PreviewMode.EDIT ? renderEditMode() : renderPreviewMode()}</Content>
        <CodeExportModal
          open={exportModalOpen}
          nodes={nodes}
          onClose={() => setExportModalOpen(false)}
        />
        <Modal
          title="页面管理"
          open={pageModalOpen}
          onCancel={() => setPageModalOpen(false)}
          footer={null}
          width={560}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={handleCreatePage}
              loading={pageActionLoading}
            >
              新建页面
            </Button>
            <List
              bordered
              dataSource={pages}
              locale={{ emptyText: "暂无已保存页面" }}
              renderItem={(page) => (
                <List.Item
                  actions={[
                    page.id === currentPageId ? (
                      <Tag color="blue" key="current">当前</Tag>
                    ) : (
                      <Button
                        key="switch"
                        type="link"
                        size="small"
                        onClick={() => handleSwitchPage(page.id)}
                      >
                        切换
                      </Button>
                    ),
                    <Popconfirm
                      key="delete"
                      title="删除该页面？"
                      description="删除后不可恢复"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeletePage(page.id)}
                    >
                      <Button type="link" size="small" danger>删除</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Input
                        key={`${page.id}-${page.name}`}
                        size="small"
                        defaultValue={page.name}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (!value) {
                            e.target.value = page.name;
                            return;
                          }
                          if (value !== page.name) handleRenamePage(page.id, value);
                        }}
                      />
                    }
                    description={`更新于 ${new Date(page.updatedAt).toLocaleString()} · ${Object.keys(page.nodes).length} 个节点`}
                  />
                </List.Item>
              )}
            />
          </Space>
        </Modal>
        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      </Layout>
    </DndProvider>
  );
};

export default VisualPageBuilder;
