import React, { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Button, Modal, Input, Empty, Spin, message, Tooltip, Popconfirm, Tag, Divider } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import { builtinTemplates, type PageTemplate } from '../data/templates';
import type { SavedTemplate } from '../store/usePagePersistence';
import './TemplateGallery.scss';

const { TextArea } = Input;

interface UserTemplateItem extends PageTemplate {
  /** 用户模板的 DB ID，用于删除 */
  dbId: string;
  createdAt: number;
}

/** 将 SavedTemplate 转换为 PageTemplate 形态用于展示 */
const savedToTemplate = (saved: SavedTemplate): UserTemplateItem => {
  const rootId = saved.rootIds?.[0] || Object.keys(saved.nodes).find((id) => !saved.nodes[id].parentId) || '';
  return {
    id: saved.id,
    dbId: saved.id,
    name: saved.name,
    description: saved.description || '用户自定义模板',
    thumbnail: '⭐',
    builtin: false,
    nodes: saved.nodes,
    rootId,
    createdAt: saved.createdAt,
  };
};

const TemplateGallery: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const applyTemplate = useCanvasStore((s) => s.applyTemplate);
  const saveTemplate = useCanvasStore((s) => s.saveTemplate);
  const listTemplates = useCanvasStore((s) => s.listTemplates);
  const deleteTemplate = useCanvasStore((s) => s.deleteTemplate);

  const [userTemplates, setUserTemplates] = useState<UserTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saving, setSaving] = useState(false);

  /** 加载用户自定义模板列表 */
  const refreshUserTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listTemplates();
      setUserTemplates(list.map(savedToTemplate));
    } catch {
      // 静默失败（IndexedDB 不可用等）
    } finally {
      setLoading(false);
    }
  }, [listTemplates]);

  useEffect(() => {
    refreshUserTemplates();
  }, [refreshUserTemplates]);

  /** 应用模板（覆盖当前画布，可撤销） */
  const handleApply = useCallback(
    (template: PageTemplate | UserTemplateItem) => {
      const nodeCount = Object.keys(template.nodes).length;
      if (nodeCount === 0) {
        message.warning('模板为空，无法应用');
        return;
      }
      Modal.confirm({
        title: '应用模板',
        content: `将使用 "${template.name}" 替换当前画布内容，当前未保存的修改可通过撤销恢复。是否继续？`,
        okText: '应用',
        cancelText: '取消',
        onOk: () => {
          applyTemplate(template.nodes, template.rootId);
          message.success(`已应用模板：${template.name}`);
        },
      });
    },
    [applyTemplate]
  );

  /** 打开"另存为模板"Modal */
  const openSaveModal = useCallback(() => {
    if (Object.keys(nodes).length === 0) {
      message.warning('画布为空，无法保存为模板');
      return;
    }
    setSaveName(`模板 ${new Date().toLocaleString('zh-CN', { hour12: false })}`);
    setSaveDesc('');
    setSaveModalOpen(true);
  }, [nodes]);

  /** 确认保存为模板 */
  const handleSaveAsTemplate = useCallback(async () => {
    if (!saveName.trim()) {
      message.warning('请输入模板名称');
      return;
    }
    setSaving(true);
    try {
      await saveTemplate(saveName.trim(), saveDesc.trim() || undefined);
      message.success('已保存为模板');
      setSaveModalOpen(false);
      await refreshUserTemplates();
    } catch (e) {
      message.error('保存失败（浏览器可能不支持 IndexedDB）');
    } finally {
      setSaving(false);
    }
  }, [saveName, saveDesc, saveTemplate, refreshUserTemplates]);

  /** 删除用户模板 */
  const handleDelete = useCallback(
    async (template: UserTemplateItem) => {
      try {
        await deleteTemplate(template.dbId);
        message.success(`已删除模板：${template.name}`);
        await refreshUserTemplates();
      } catch {
        message.error('删除失败');
      }
    },
    [deleteTemplate, refreshUserTemplates]
  );

  /** 渲染单个模板卡片 */
  const renderTemplateCard = (template: PageTemplate | UserTemplateItem) => {
    const isUser = !template.builtin;
    const nodeCount = Object.keys(template.nodes).length;
    return (
      <Col key={template.id} xs={24} sm={12} md={12} lg={24} xl={24}>
        <Card
          className="template-card"
          size="small"
          hoverable
          onClick={() => handleApply(template)}
          actions={[
            <Tooltip title="应用模板" key="apply">
              <PlusOutlined />
            </Tooltip>,
            isUser ? (
              <Popconfirm
                key="delete"
                title="确认删除此模板？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(template as UserTemplateItem);
                }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <DeleteOutlined onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            ) : (
              <span key="builtin" style={{ visibility: 'hidden' }}>
                <DeleteOutlined />
              </span>
            ),
          ]}
        >
          <div className="template-card-body">
            <span className="template-thumbnail">{template.thumbnail}</span>
            <div className="template-info">
              <div className="template-name">
                {template.name}
                {isUser ? <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>自定义</Tag> : <Tag color="default" style={{ marginLeft: 6, fontSize: 10 }}>预置</Tag>}
              </div>
              <div className="template-desc">{template.description}</div>
              <div className="template-meta">{nodeCount} 个节点</div>
            </div>
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div className="template-gallery">
      <div className="template-gallery-header">
        <span className="template-gallery-title">模板库</span>
        <Tooltip title="刷新用户模板">
          <Button size="small" type="text" icon={<ReloadOutlined />} onClick={refreshUserTemplates} loading={loading} />
        </Tooltip>
        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={openSaveModal}>
          存为模板
        </Button>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div className="template-section">
        <div className="template-section-title">预置模板（{builtinTemplates.length}）</div>
        <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
          {builtinTemplates.map(renderTemplateCard)}
        </Row>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className="template-section">
        <div className="template-section-title">我的模板（{userTemplates.length}）</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin size="small" />
          </div>
        ) : userTemplates.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无自定义模板"
            style={{ margin: '12px 0' }}
          />
        ) : (
          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
            {userTemplates.map(renderTemplateCard)}
          </Row>
        )}
      </div>

      <Modal
        title="保存为模板"
        open={saveModalOpen}
        onCancel={() => setSaveModalOpen(false)}
        onOk={handleSaveAsTemplate}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>模板名称</div>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="请输入模板名称"
              maxLength={50}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>描述（可选）</div>
            <TextArea
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              placeholder="描述模板的用途"
              rows={3}
              maxLength={200}
            />
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            当前画布有 {Object.keys(nodes).length} 个节点，将一并保存到模板。
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TemplateGallery;
