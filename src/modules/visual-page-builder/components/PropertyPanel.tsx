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
  Col
} from 'antd';
import { 
  EditOutlined, 
  LayoutOutlined, 
  FileTextOutlined, 
  ThunderboltOutlined,
  DeleteOutlined
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
          value={node.events.onClick ? 'enabled' : 'disabled'}
          onChange={(value) => {
            const events = value === 'enabled' 
              ? { ...node.events, onClick: () => console.log('点击事件') }
              : { ...node.events, onClick: undefined };
            onUpdate({ events });
          }}
          style={{ width: '100%' }}
        >
          <Option value="disabled">禁用</Option>
          <Option value="enabled">启用</Option>
        </Select>
      </div>
      
      <div className="property-group">
        <Text strong style={{ fontSize: '12px' }}>悬停事件</Text>
        <Select
          size="small"
          value={node.events.onHover ? 'enabled' : 'disabled'}
          onChange={(value) => {
            const events = value === 'enabled' 
              ? { ...node.events, onHover: () => console.log('悬停事件') }
              : { ...node.events, onHover: undefined };
            onUpdate({ events });
          }}
          style={{ width: '100%' }}
        >
          <Option value="disabled">禁用</Option>
          <Option value="enabled">启用</Option>
        </Select>
      </div>
    </Space>
  </div>
);

// 主属性面板组件
const PropertyPanel: React.FC = () => {
  const { nodes, selectedNodeId, updateNode, deleteNode } = useCanvasStore();
  
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

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