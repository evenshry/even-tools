import React from 'react';
import {
  Card,
  Tabs,
  Input,
  Select,
  ColorPicker,
  Typography,
  Space,
  Empty,
  Divider,
  Row,
  Col,
  Button,
  Tooltip,
  message
} from 'antd';
import {
  EditOutlined,
  LayoutOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  CopyOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import { NodeType, type PageNode } from '../types';
import './PropertyPanel.scss';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// 样式编辑器组件
interface StyleEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const StyleEditor: React.FC<StyleEditorProps> = ({ node, onUpdate }) => (
  <div className="style-editor">
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Row gutter={8}>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>宽度</Text>
            <Input
              size="small"
              value={node.style.width || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, width: e.target.value }
              })}
              placeholder="auto"
            />
          </div>
        </Col>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>高度</Text>
            <Input
              size="small"
              value={node.style.height || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, height: e.target.value }
              })}
              placeholder="auto"
            />
          </div>
        </Col>
      </Row>
      
      <Row gutter={8}>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>背景颜色</Text>
            <ColorPicker
              size="small"
              value={node.style.backgroundColor || '#ffffff'}
              onChange={(_, color) => onUpdate({
                style: { ...node.style, backgroundColor: color }
              })}
              showText
            />
          </div>
        </Col>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>字体颜色</Text>
            <ColorPicker
              size="small"
              value={node.style.color || '#000000'}
              onChange={(_, color) => onUpdate({
                style: { ...node.style, color: color }
              })}
              showText
            />
          </div>
        </Col>
      </Row>
      
      <Row gutter={8}>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>字体大小</Text>
            <Input
              size="small"
              value={node.style.fontSize || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, fontSize: e.target.value }
              })}
              placeholder="14px"
            />
          </div>
        </Col>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>内边距</Text>
            <Input
              size="small"
              value={node.style.padding || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, padding: e.target.value }
              })}
              placeholder="0"
            />
          </div>
        </Col>
      </Row>
      
      <Row gutter={8}>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>外边距</Text>
            <Input
              size="small"
              value={node.style.margin || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, margin: e.target.value }
              })}
              placeholder="0"
            />
          </div>
        </Col>
        <Col span={12}>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>圆角</Text>
            <Input
              size="small"
              value={node.style.borderRadius || ''}
              onChange={(e) => onUpdate({
                style: { ...node.style, borderRadius: e.target.value }
              })}
              placeholder="0"
            />
          </div>
        </Col>
      </Row>
      
      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>边框</Text>
        <Input
          size="small"
          value={node.style.border || ''}
          onChange={(e) => onUpdate({
            style: { ...node.style, border: e.target.value }
          })}
          placeholder="1px solid #ccc"
        />
      </div>
    </Space>
  </div>
);

// 布局编辑器组件
interface LayoutEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const LayoutEditor: React.FC<LayoutEditorProps> = ({ node, onUpdate }) => (
  <div className="layout-editor">
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>显示类型</Text>
        <Select
          size="small"
          value={node.layout.display}
          onChange={(value) => onUpdate({
            layout: { ...node.layout, display: value }
          })}
          style={{ width: '100%' }}
        >
          <Option value="block">块级 (block)</Option>
          <Option value="inline">行内 (inline)</Option>
          <Option value="inline-block">行内块 (inline-block)</Option>
          <Option value="flex">弹性 (flex)</Option>
          <Option value="grid">网格 (grid)</Option>
          <Option value="none">隐藏 (none)</Option>
        </Select>
      </div>
      
      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>定位方式</Text>
        <Select
          size="small"
          value={node.layout.position || 'static'}
          onChange={(value) => onUpdate({
            layout: { ...node.layout, position: value }
          })}
          style={{ width: '100%' }}
        >
          <Option value="static">静态 (static)</Option>
          <Option value="relative">相对 (relative)</Option>
          <Option value="absolute">绝对 (absolute)</Option>
          <Option value="fixed">固定 (fixed)</Option>
          <Option value="sticky">粘性 (sticky)</Option>
        </Select>
      </div>
      
      {node.layout.display === 'flex' && (
        <>
          <Divider style={{ margin: '8px 0', fontSize: '12px' }}>
            弹性布局
          </Divider>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>主轴方向</Text>
            <Select
              size="small"
              value={node.layout.flexDirection || 'row'}
              onChange={(value) => onUpdate({
                layout: { ...node.layout, flexDirection: value }
              })}
              style={{ width: '100%' }}
            >
              <Option value="row">水平 (row)</Option>
              <Option value="column">垂直 (column)</Option>
              <Option value="row-reverse">水平反向 (row-reverse)</Option>
              <Option value="column-reverse">垂直反向 (column-reverse)</Option>
            </Select>
          </div>
          
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>换行方式</Text>
            <Select
              size="small"
              value={node.layout.flexWrap || 'nowrap'}
              onChange={(value) => onUpdate({
                layout: { ...node.layout, flexWrap: value }
              })}
              style={{ width: '100%' }}
            >
              <Option value="nowrap">不换行 (nowrap)</Option>
              <Option value="wrap">换行 (wrap)</Option>
              <Option value="wrap-reverse">反向换行 (wrap-reverse)</Option>
            </Select>
          </div>
        </>
      )}
      
      {node.layout.display === 'grid' && (
        <>
          <Divider style={{ margin: '8px 0', fontSize: '12px' }}>
            网格布局
          </Divider>
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>列模板</Text>
            <Input
              size="small"
              value={node.layout.gridTemplateColumns || ''}
              onChange={(e) => onUpdate({
                layout: { ...node.layout, gridTemplateColumns: e.target.value }
              })}
              placeholder="repeat(3, 1fr)"
            />
          </div>
          
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>行模板</Text>
            <Input
              size="small"
              value={node.layout.gridTemplateRows || ''}
              onChange={(e) => onUpdate({
                layout: { ...node.layout, gridTemplateRows: e.target.value }
              })}
              placeholder="auto"
            />
          </div>
        </>
      )}
    </Space>
  </div>
);

// 内容编辑器组件
interface ContentEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ node, onUpdate }) => (
  <div className="content-editor">
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {(node.type === NodeType.TEXT || node.type === NodeType.HEADING) && (
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>
            {node.type === NodeType.TEXT ? '文本内容' : '标题内容'}
          </Text>
          <TextArea
            rows={3}
            value={node.content.text || ''}
            onChange={(e) => onUpdate({
              content: { ...node.content, text: e.target.value }
            })}
            placeholder={
              node.type === NodeType.TEXT ? '输入文本内容' : '输入标题内容'
            }
          />
        </div>
      )}
      
      {node.type === NodeType.BUTTON && (
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>按钮文本</Text>
          <Input
            size="small"
            value={node.content.text || ''}
            onChange={(e) => onUpdate({
              content: { ...node.content, text: e.target.value }
            })}
            placeholder="按钮"
          />
        </div>
      )}
      
      {node.type === NodeType.IMAGE && (
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>图片地址</Text>
          <Input
            size="small"
            value={node.content.src || ''}
            onChange={(e) => onUpdate({
              content: { ...node.content, src: e.target.value }
            })}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      )}
    </Space>
  </div>
);

// 交互编辑器组件
interface InteractionEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const InteractionEditor: React.FC<InteractionEditorProps> = ({ node, onUpdate }) => (
  <div className="interaction-editor">
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>点击事件</Text>
        <Select
          size="small"
          value={node.events.onClick?.actionType || 'none'}
          onChange={(value) => {
            const events = value === 'none'
              ? { ...node.events, onClick: undefined }
              : { ...node.events, onClick: { actionType: value as 'navigate' | 'alert' | 'toggleVisibility' | 'custom', payload: '' } };
            onUpdate({ events });
          }}
          style={{ width: '100%' }}
        >
          <Option value="none">无</Option>
          <Option value="alert">弹出提示</Option>
          <Option value="navigate">跳转链接</Option>
          <Option value="toggleVisibility">切换显隐</Option>
          <Option value="custom">自定义</Option>
        </Select>
        {node.events.onClick && (
          <Input
            size="small"
            placeholder={node.events.onClick.actionType === 'navigate' ? 'https://...' : '提示文本 / 自定义参数'}
            value={node.events.onClick.payload || ''}
            onChange={(e) => {
              onUpdate({
                events: {
                  ...node.events,
                  onClick: { ...node.events.onClick!, payload: e.target.value }
                }
              });
            }}
            style={{ marginTop: 4 }}
          />
        )}
      </div>

      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>悬停事件</Text>
        <Select
          size="small"
          value={node.events.onHover?.actionType || 'none'}
          onChange={(value) => {
            const events = value === 'none'
              ? { ...node.events, onHover: undefined }
              : { ...node.events, onHover: { actionType: value as 'navigate' | 'alert' | 'toggleVisibility' | 'custom', payload: '' } };
            onUpdate({ events });
          }}
          style={{ width: '100%' }}
        >
          <Option value="none">无</Option>
          <Option value="alert">弹出提示</Option>
          <Option value="toggleVisibility">切换显隐</Option>
          <Option value="custom">自定义</Option>
        </Select>
      </div>
    </Space>
  </div>
);

// 多选批量操作工具栏组件（T4.3e）
const MultiSelectToolbar: React.FC = () => {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const alignSelected = useCanvasStore((s) => s.alignSelected);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  // 计算选中节点中可对齐（绝对/固定定位）的数量
  const alignableCount = selectedNodeIds.filter((id) => {
    const n = nodes[id];
    return n && (n.layout.position === 'absolute' || n.layout.position === 'fixed');
  }).length;

  const handleAlign = (align: 'left' | 'right' | 'top' | 'bottom' | 'centerHorizontal' | 'centerVertical') => {
    if (alignableCount < 2) {
      message.warning('至少需要 2 个绝对/固定定位节点才能对齐');
      return;
    }
    alignSelected(align);
  };

  const handleDelete = () => {
    deleteSelected();
    message.success(`已删除 ${selectedNodeIds.length} 个节点`);
  };

  const handleDuplicate = () => {
    duplicateSelected();
    message.success(`已复制 ${selectedNodeIds.length} 个节点`);
  };

  // 对齐按钮配置
  const alignButtons: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    align: 'left' | 'right' | 'top' | 'bottom' | 'centerHorizontal' | 'centerVertical';
  }> = [
    { key: 'left', icon: <AlignLeftOutlined />, label: '左对齐', align: 'left' },
    { key: 'centerH', icon: <AlignCenterOutlined />, label: '水平居中', align: 'centerHorizontal' },
    { key: 'right', icon: <AlignRightOutlined />, label: '右对齐', align: 'right' },
    { key: 'top', icon: <VerticalAlignTopOutlined />, label: '顶对齐', align: 'top' },
    { key: 'centerV', icon: <VerticalAlignMiddleOutlined />, label: '垂直居中', align: 'centerVertical' },
    { key: 'bottom', icon: <VerticalAlignBottomOutlined />, label: '底对齐', align: 'bottom' },
  ];

  return (
    <div className="property-panel multi-select-panel">
      {/* 多选状态头部 */}
      <Card
        size="small"
        style={{ marginBottom: '12px' }}
        bodyStyle={{ padding: '12px' }}
      >
        <div className="multi-select-header">
          <Space align="center" style={{ width: '100%' }}>
            <div className="multi-select-badge">{selectedNodeIds.length}</div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '14px', display: 'block' }}>
                已选 {selectedNodeIds.length} 个节点
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                可对齐: {alignableCount} 个（绝对/固定定位）
              </Text>
            </div>
            <Tooltip title="取消多选">
              <CloseOutlined
                style={{ cursor: 'pointer', color: '#8c8c8c' }}
                onClick={clearSelection}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>

      {/* 批量操作 */}
      <Card size="small" style={{ marginBottom: '12px' }} bodyStyle={{ padding: '12px' }}>
        <div className="batch-section">
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            批量对齐
          </Text>
          <div className="align-button-grid">
            {alignButtons.map((btn) => (
              <Tooltip key={btn.key} title={btn.label}>
                <Button
                  size="small"
                  icon={btn.icon}
                  onClick={() => handleAlign(btn.align)}
                  disabled={alignableCount < 2}
                />
              </Tooltip>
            ))}
          </div>
          {alignableCount < 2 && (
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '6px' }}>
              提示：仅对绝对/固定定位节点生效，至少需 2 个
            </Text>
          )}
        </div>

        <Divider style={{ margin: '10px 0' }} />

        <div className="batch-section">
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            批量操作
          </Text>
          <Space style={{ width: '100%' }}>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handleDuplicate}
            >
              复制
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              删除
            </Button>
          </Space>
        </div>
      </Card>

      {/* 选中节点列表 */}
      <Card
        size="small"
        title={<Text strong style={{ fontSize: '12px' }}>选中节点列表</Text>}
        bodyStyle={{ padding: '8px', maxHeight: '300px', overflow: 'auto' }}
      >
        <div className="selected-node-list">
          {selectedNodeIds.map((id) => {
            const n = nodes[id];
            if (!n) return null;
            const icon = ({
              [NodeType.TEXT]: '📝',
              [NodeType.HEADING]: '📋',
              [NodeType.BUTTON]: '🔘',
              [NodeType.IMAGE]: '🖼️',
              [NodeType.DIV]: '🧱',
              [NodeType.SECTION]: '📦',
              [NodeType.CONTAINER]: '📁',
              [NodeType.FLEX]: '📐',
              [NodeType.GRID]: '🔲',
              [NodeType.INPUT]: '⌨️',
              [NodeType.FORM]: '📝',
            } as Record<string, string>)[n.type] || '📄';
            return (
              <div key={id} className="selected-node-item">
                <span style={{ marginRight: '6px' }}>{icon}</span>
                <Text style={{ fontSize: '12px' }} ellipsis>
                  {n.name}
                </Text>
                <Text type="secondary" style={{ fontSize: '10px', marginLeft: 'auto' }}>
                  {n.layout.position === 'absolute' || n.layout.position === 'fixed' ? '可对齐' : '流式'}
                </Text>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// 主属性面板组件
const PropertyPanel: React.FC = () => {
  const { nodes, selectedNodeId, selectedNodeIds, updateNode, deleteNode } = useCanvasStore();

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  // 多选模式：选中多于 1 个节点时显示批量操作工具栏
  if (selectedNodeIds.length > 1) {
    return <MultiSelectToolbar />;
  }

  if (!selectedNode) {
    return (
      <div className="property-panel">
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👆</div>
              <Text strong style={{ fontSize: '14px' }}>选择节点以编辑属性</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                点击画布上的节点开始编辑
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                Shift+点击追加 · Ctrl+点击切换
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  const handleUpdate = (updates: Partial<PageNode>) => {
    updateNode(selectedNode.id, updates);
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  const tabItems = [
    {
      key: 'style',
      label: (
        <span>
          <EditOutlined />
          样式
        </span>
      ),
      children: <StyleEditor node={selectedNode} onUpdate={handleUpdate} />
    },
    {
      key: 'layout',
      label: (
        <span>
          <LayoutOutlined />
          布局
        </span>
      ),
      children: <LayoutEditor node={selectedNode} onUpdate={handleUpdate} />
    },
    {
      key: 'content',
      label: (
        <span>
          <FileTextOutlined />
          内容
        </span>
      ),
      children: <ContentEditor node={selectedNode} onUpdate={handleUpdate} />
    },
    {
      key: 'interaction',
      label: (
        <span>
          <ThunderboltOutlined />
          交互
        </span>
      ),
      children: <InteractionEditor node={selectedNode} onUpdate={handleUpdate} />
    }
  ];

  const nodeIcon = ({
    [NodeType.TEXT]: '📝',
    [NodeType.HEADING]: '📋',
    [NodeType.BUTTON]: '🔘',
    [NodeType.IMAGE]: '🖼️',
    [NodeType.DIV]: '🧱',
    [NodeType.SECTION]: '📦',
    [NodeType.CONTAINER]: '📁',
    [NodeType.FLEX]: '📐',
    [NodeType.GRID]: '🔲',
    [NodeType.STACK]: '📚',
    [NodeType.SPAN]: '🔗',
    [NodeType.FORM]: '📝',
    [NodeType.INPUT]: '⌨️',
    [NodeType.SELECT]: '🔽',
    [NodeType.CHECKBOX]: '☑️',
    [NodeType.VIDEO]: '🎥',
    [NodeType.ICON]: '🔣',
    [NodeType.CUSTOM]: '🔧'
  } as Record<string, string>)[selectedNode.type] || '📄';

  return (
    <div className="property-panel">
      {/* 节点信息头部 */}
      <Card 
        size="small" 
        style={{ marginBottom: '16px' }}
        bodyStyle={{ padding: '12px' }}
      >
        <div className="node-info">
          <Space align="start" style={{ width: '100%' }}>
            <div style={{ fontSize: '24px' }}>{nodeIcon}</div>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: '14px', display: 'block' }}>
                {selectedNode.name}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedNode.type}
              </Text>
            </div>
            <DeleteOutlined 
              style={{ color: '#ff4d4f', cursor: 'pointer' }}
              onClick={handleDelete}
              title="删除节点"
            />
          </Space>
        </div>
      </Card>

      {/* 属性标签页 */}
      <Tabs
        size="small"
        items={tabItems}
        style={{ height: 'calc(100% - 80px)' }}
        tabPosition="top"
      />
    </div>
  );
};

export default PropertyPanel;