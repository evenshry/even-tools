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
  Upload,
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
  CloseOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import { NodeType, type PageNode } from '../types';
import { getNodeTypeIcon } from '../utils/nodeIcons';
import './PropertyPanel.scss';
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// 样式编辑器组件
interface StyleEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const StyleEditor: React.FC<StyleEditorProps> = ({ node, onUpdate }) => {
  const style = node.style;

  const setStyle = (patch: Partial<PageNode['style']>) => {
    onUpdate({ style: { ...style, ...patch } });
  };

  /** 通用文本样式输入（尺寸、间距、定位等自由输入项） */
  const textField = (label: string, key: keyof PageNode['style'], placeholder = 'auto') => (
    <div className="property-group" key={key}>
      <Text strong style={{ fontSize: '12px' }}>{label}</Text>
      <Input
        size="small"
        value={(style[key] as string | number | undefined) ?? ''}
        onChange={(e) => setStyle({ [key]: e.target.value } as Partial<PageNode['style']>)}
        placeholder={placeholder}
      />
    </div>
  );

  const isPositioned = !!node.layout.position && node.layout.position !== 'static';
  const isMedia = node.type === NodeType.IMAGE || node.type === NodeType.VIDEO;

  return (
    <div className="style-editor">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Divider style={{ margin: '4px 0', fontSize: '12px' }}>尺寸</Divider>
        <Row gutter={8}>
          <Col span={12}>{textField('宽度', 'width')}</Col>
          <Col span={12}>{textField('高度', 'height')}</Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>{textField('最小宽度', 'minWidth')}</Col>
          <Col span={12}>{textField('最小高度', 'minHeight')}</Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>{textField('最大宽度', 'maxWidth')}</Col>
          <Col span={12}>{textField('最大高度', 'maxHeight')}</Col>
        </Row>

        <Divider style={{ margin: '4px 0', fontSize: '12px' }}>间距</Divider>
        <Row gutter={8}>
          <Col span={12}>{textField('内边距', 'padding', '0 / 8px 16px')}</Col>
          <Col span={12}>{textField('外边距', 'margin', '0 / 0 auto')}</Col>
        </Row>

        <Divider style={{ margin: '4px 0', fontSize: '12px' }}>排版</Divider>
        <Row gutter={8}>
          <Col span={12}>{textField('字体大小', 'fontSize', '14px')}</Col>
          <Col span={12}>{textField('行高', 'lineHeight', '1.5')}</Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>字重</Text>
              <Select
                size="small"
                value={(style.fontWeight as string) || 'normal'}
                onChange={(value) => setStyle({ fontWeight: value })}
                style={{ width: '100%' }}
              >
                <Option value="normal">常规 (normal)</Option>
                <Option value="500">中等 (500)</Option>
                <Option value="600">半粗 (600)</Option>
                <Option value="bold">加粗 (bold)</Option>
              </Select>
            </div>
          </Col>
          <Col span={12}>{textField('字间距', 'letterSpacing', '0')}</Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>文本对齐</Text>
              <Select
                size="small"
                value={style.textAlign || 'left'}
                onChange={(value) => setStyle({ textAlign: value })}
                style={{ width: '100%' }}
              >
                <Option value="left">左对齐</Option>
                <Option value="center">居中</Option>
                <Option value="right">右对齐</Option>
                <Option value="justify">两端对齐</Option>
              </Select>
            </div>
          </Col>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>文本装饰</Text>
              <Select
                size="small"
                value={style.textDecoration || 'none'}
                onChange={(value) => setStyle({ textDecoration: value })}
                style={{ width: '100%' }}
              >
                <Option value="none">无</Option>
                <Option value="underline">下划线</Option>
                <Option value="line-through">删除线</Option>
              </Select>
            </div>
          </Col>
        </Row>
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>空白处理</Text>
          <Select
            size="small"
            value={style.whiteSpace || 'normal'}
            onChange={(value) => setStyle({ whiteSpace: value })}
            style={{ width: '100%' }}
          >
            <Option value="normal">自动换行 (normal)</Option>
            <Option value="nowrap">不换行 (nowrap)</Option>
            <Option value="pre-wrap">保留空白并换行 (pre-wrap)</Option>
          </Select>
        </div>

        <Divider style={{ margin: '4px 0', fontSize: '12px' }}>外观</Divider>
        <Row gutter={8}>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>背景颜色</Text>
              <ColorPicker
                size="small"
                value={style.backgroundColor || '#ffffff'}
                onChange={(_, color) => setStyle({ backgroundColor: color })}
                showText
              />
            </div>
          </Col>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>字体颜色</Text>
              <ColorPicker
                size="small"
                value={style.color || '#000000'}
                onChange={(_, color) => setStyle({ color })}
                showText
              />
            </div>
          </Col>
        </Row>
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>边框</Text>
          <Input
            size="small"
            value={style.border || ''}
            onChange={(e) => setStyle({ border: e.target.value })}
            placeholder="1px solid #ccc"
          />
        </div>
        <Row gutter={8}>
          <Col span={12}>{textField('圆角', 'borderRadius', '0')}</Col>
          <Col span={12}>{textField('透明度', 'opacity', '1')}</Col>
        </Row>
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>阴影</Text>
          <Input
            size="small"
            value={style.boxShadow || ''}
            onChange={(e) => setStyle({ boxShadow: e.target.value })}
            placeholder="0 2px 8px rgba(0,0,0,0.15)"
          />
        </div>
        <Row gutter={8}>
          <Col span={12}>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>溢出处理</Text>
              <Select
                size="small"
                value={style.overflow || 'visible'}
                onChange={(value) => setStyle({ overflow: value })}
                style={{ width: '100%' }}
              >
                <Option value="visible">显示 (visible)</Option>
                <Option value="hidden">隐藏 (hidden)</Option>
                <Option value="auto">自动滚动 (auto)</Option>
                <Option value="scroll">强制滚动 (scroll)</Option>
              </Select>
            </div>
          </Col>
          <Col span={12}>{textField('层级 z-index', 'zIndex', 'auto')}</Col>
        </Row>
        {isMedia && (
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>填充方式</Text>
            <Select
              size="small"
              value={style.objectFit || 'fill'}
              onChange={(value) => setStyle({ objectFit: value })}
              style={{ width: '100%' }}
            >
              <Option value="fill">拉伸填充 (fill)</Option>
              <Option value="contain">完整显示 (contain)</Option>
              <Option value="cover">裁剪填满 (cover)</Option>
              <Option value="none">原始尺寸 (none)</Option>
              <Option value="scale-down">等比缩小 (scale-down)</Option>
            </Select>
          </div>
        )}

        {isPositioned && (
          <>
            <Divider style={{ margin: '4px 0', fontSize: '12px' }}>定位偏移</Divider>
            <Row gutter={8}>
              <Col span={12}>{textField('left', 'left', '0px')}</Col>
              <Col span={12}>{textField('top', 'top', '0px')}</Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}>{textField('right', 'right', 'auto')}</Col>
              <Col span={12}>{textField('bottom', 'bottom', 'auto')}</Col>
            </Row>
          </>
        )}
      </Space>
    </div>
  );
};

// 布局编辑器组件
interface LayoutEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const LayoutEditor: React.FC<LayoutEditorProps> = ({ node, onUpdate }) => {
  // 父节点布局决定子项可用的布局能力（flex 子项 / grid 子项）
  const parent = useCanvasStore((s) => (node.parentId ? s.nodes[node.parentId] : null));
  const parentDisplay = parent?.layout.display;

  const updateLayout = (patch: Partial<PageNode['layout']>) => {
    onUpdate({ layout: { ...node.layout, ...patch } });
  };

  const updateStyle = (patch: Partial<PageNode['style']>) => {
    onUpdate({ style: { ...node.style, ...patch } });
  };

  return (
    <div className="layout-editor">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div className="property-group">
          <Text strong style={{ fontSize: '12px' }}>显示类型</Text>
          <Select
            size="small"
            value={node.layout.display}
            onChange={(value) => updateLayout({ display: value })}
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
            onChange={(value) => updateLayout({ position: value })}
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
                onChange={(value) => updateLayout({ flexDirection: value })}
                style={{ width: '100%' }}
              >
                <Option value="row">水平 (row)</Option>
                <Option value="column">垂直 (column)</Option>
                <Option value="row-reverse">水平反向 (row-reverse)</Option>
                <Option value="column-reverse">垂直反向 (column-reverse)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>主轴对齐</Text>
              <Select
                size="small"
                value={node.layout.justifyContent || 'flex-start'}
                onChange={(value) => updateLayout({ justifyContent: value })}
                style={{ width: '100%' }}
              >
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="space-between">两端对齐 (space-between)</Option>
                <Option value="space-around">环绕分布 (space-around)</Option>
                <Option value="space-evenly">均匀分布 (space-evenly)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>交叉轴对齐</Text>
              <Select
                size="small"
                value={node.layout.alignItems || 'stretch'}
                onChange={(value) => updateLayout({ alignItems: value })}
                style={{ width: '100%' }}
              >
                <Option value="stretch">拉伸填充 (stretch)</Option>
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="baseline">基线对齐 (baseline)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>换行方式</Text>
              <Select
                size="small"
                value={node.layout.flexWrap || 'nowrap'}
                onChange={(value) => updateLayout({ flexWrap: value })}
                style={{ width: '100%' }}
              >
                <Option value="nowrap">不换行 (nowrap)</Option>
                <Option value="wrap">换行 (wrap)</Option>
                <Option value="wrap-reverse">反向换行 (wrap-reverse)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>多行对齐</Text>
              <Select
                size="small"
                value={node.layout.alignContent || 'stretch'}
                onChange={(value) => updateLayout({ alignContent: value })}
                style={{ width: '100%' }}
              >
                <Option value="stretch">拉伸填充 (stretch)</Option>
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="space-between">两端对齐 (space-between)</Option>
                <Option value="space-around">环绕分布 (space-around)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>间距</Text>
              <Input
                size="small"
                value={node.style.gap || ''}
                onChange={(e) => updateStyle({ gap: e.target.value })}
                placeholder="10px"
              />
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
                onChange={(e) => updateLayout({ gridTemplateColumns: e.target.value })}
                placeholder="repeat(3, 1fr)"
              />
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>行模板</Text>
              <Input
                size="small"
                value={node.layout.gridTemplateRows || ''}
                onChange={(e) => updateLayout({ gridTemplateRows: e.target.value })}
                placeholder="auto"
              />
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>自动流</Text>
              <Select
                size="small"
                value={node.layout.gridAutoFlow || 'row'}
                onChange={(value) => updateLayout({ gridAutoFlow: value })}
                style={{ width: '100%' }}
              >
                <Option value="row">按行 (row)</Option>
                <Option value="column">按列 (column)</Option>
                <Option value="row dense">按行紧凑 (row dense)</Option>
                <Option value="column dense">按列紧凑 (column dense)</Option>
              </Select>
            </div>

            <Row gutter={8}>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>自动行高</Text>
                  <Input
                    size="small"
                    value={node.layout.gridAutoRows || ''}
                    onChange={(e) => updateLayout({ gridAutoRows: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>自动列宽</Text>
                  <Input
                    size="small"
                    value={node.layout.gridAutoColumns || ''}
                    onChange={(e) => updateLayout({ gridAutoColumns: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </Col>
            </Row>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>水平对齐</Text>
              <Select
                size="small"
                value={node.layout.justifyContent || 'flex-start'}
                onChange={(value) => updateLayout({ justifyContent: value })}
                style={{ width: '100%' }}
              >
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="space-between">两端对齐 (space-between)</Option>
                <Option value="space-around">环绕分布 (space-around)</Option>
                <Option value="space-evenly">均匀分布 (space-evenly)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>垂直对齐</Text>
              <Select
                size="small"
                value={node.layout.alignItems || 'stretch'}
                onChange={(value) => updateLayout({ alignItems: value })}
                style={{ width: '100%' }}
              >
                <Option value="stretch">拉伸填充 (stretch)</Option>
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="baseline">基线对齐 (baseline)</Option>
              </Select>
            </div>

            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>间距</Text>
              <Input
                size="small"
                value={node.style.gap || ''}
                onChange={(e) => updateStyle({ gap: e.target.value })}
                placeholder="10px"
              />
            </div>
          </>
        )}

        {parentDisplay === 'flex' && (
          <>
            <Divider style={{ margin: '8px 0', fontSize: '12px' }}>
              作为弹性子项
            </Divider>
            <Row gutter={8}>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>伸缩比例</Text>
                  <Input
                    size="small"
                    value={node.style.flexGrow ?? ''}
                    onChange={(e) => updateStyle({ flexGrow: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>基准尺寸</Text>
                  <Input
                    size="small"
                    value={node.style.flexBasis ?? ''}
                    onChange={(e) => updateStyle({ flexBasis: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </Col>
            </Row>
            <div className="property-group">
              <Text strong style={{ fontSize: '12px' }}>自身对齐</Text>
              <Select
                size="small"
                value={node.style.alignSelf || 'auto'}
                onChange={(value) => updateStyle({ alignSelf: value === 'auto' ? undefined : value })}
                style={{ width: '100%' }}
              >
                <Option value="auto">跟随容器 (auto)</Option>
                <Option value="stretch">拉伸填充 (stretch)</Option>
                <Option value="flex-start">起始对齐 (flex-start)</Option>
                <Option value="flex-end">末尾对齐 (flex-end)</Option>
                <Option value="center">居中 (center)</Option>
                <Option value="baseline">基线对齐 (baseline)</Option>
              </Select>
            </div>
          </>
        )}

        {parentDisplay === 'grid' && (
          <>
            <Divider style={{ margin: '8px 0', fontSize: '12px' }}>
              作为网格子项
            </Divider>
            <Row gutter={8}>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>网格列</Text>
                  <Input
                    size="small"
                    value={node.style.gridColumn ?? ''}
                    onChange={(e) => updateStyle({ gridColumn: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="property-group">
                  <Text strong style={{ fontSize: '12px' }}>网格行</Text>
                  <Input
                    size="small"
                    value={node.style.gridRow ?? ''}
                    onChange={(e) => updateStyle({ gridRow: e.target.value })}
                    placeholder="auto"
                  />
                </div>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </div>
  );
};

// 内容编辑器组件
interface ContentEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ node, onUpdate }) => {
  // 本地上传图片：转为 dataURL 存入 content.src，限制大小避免撑爆 IndexedDB
  const handleImageUpload = (file: File) => {
    const MAX_SIZE = 1.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      message.warning('图片超过 1.5MB，建议压缩后上传或改用图片链接');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdate({ content: { ...node.content, src: reader.result } });
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
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
          <>
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
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleImageUpload}
              >
                <Button size="small" icon={<UploadOutlined />} style={{ marginTop: 4 }}>
                  本地上传
                </Button>
              </Upload>
            </div>
            {node.content.src && (
              <div className="property-group">
                <Text strong style={{ fontSize: '12px' }}>预览</Text>
                <img
                  src={node.content.src}
                  alt={node.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 120,
                    objectFit: 'contain',
                    border: '1px solid var(--et-line)',
                    borderRadius: 4,
                  }}
                />
              </div>
            )}
          </>
        )}

        {node.type === NodeType.VIDEO && (
          <div className="property-group">
            <Text strong style={{ fontSize: '12px' }}>视频地址</Text>
            <Input
              size="small"
              value={node.content.src || ''}
              onChange={(e) => onUpdate({
                content: { ...node.content, src: e.target.value }
              })}
              placeholder="https://example.com/video.mp4"
            />
          </div>
        )}
      </Space>
    </div>
  );
};

// 交互编辑器组件
interface InteractionEditorProps {
  node: PageNode;
  onUpdate: (updates: Partial<PageNode>) => void;
}

const InteractionEditor: React.FC<InteractionEditorProps> = ({ node, onUpdate }) => {
  const nodes = useCanvasStore((s) => s.nodes);

  type ActionType = 'navigate' | 'alert' | 'toggleVisibility' | 'custom';

  // 可作为「切换显隐」目标的节点（排除自身）
  const nodeOptions = Object.values(nodes)
    .filter((n) => n.id !== node.id)
    .map((n) => ({ value: n.id, label: `${n.name}（${n.type}）` }));

  const renderPayload = (
    actionType: ActionType,
    payload: string | undefined,
    onChange: (value: string) => void
  ) => {
    if (actionType === 'toggleVisibility') {
      return (
        <Select
          size="small"
          showSearch
          optionFilterProp="label"
          placeholder="选择要切换显隐的节点"
          value={payload || undefined}
          onChange={onChange}
          options={nodeOptions}
          notFoundContent="暂无其他节点"
          style={{ width: '100%', marginTop: 4 }}
        />
      );
    }

    return (
      <Input
        size="small"
        style={{ marginTop: 4 }}
        placeholder={
          actionType === 'navigate'
            ? 'https://...'
            : actionType === 'alert'
              ? '提示文本'
              : '自定义参数'
        }
        value={payload || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  return (
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
                : { ...node.events, onClick: { actionType: value as ActionType, payload: '' } };
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
          {node.events.onClick && renderPayload(
            node.events.onClick.actionType,
            node.events.onClick.payload,
            (payload) => onUpdate({
              events: {
                ...node.events,
                onClick: { ...node.events.onClick!, payload }
              }
            })
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
                : { ...node.events, onHover: { actionType: value as ActionType, payload: '' } };
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
          {node.events.onHover && renderPayload(
            node.events.onHover.actionType,
            node.events.onHover.payload,
            (payload) => onUpdate({
              events: {
                ...node.events,
                onHover: { ...node.events.onHover!, payload }
              }
            })
          )}
        </div>
      </Space>
    </div>
  );
};

// 多选批量操作工具栏组件（T4.3e）
const MultiSelectToolbar: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);
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
        styles={{ body: { padding: '12px' } }}
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
                style={{ cursor: 'pointer', color: semanticColors.gray8c[mode] }}
                onClick={clearSelection}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>

      {/* 批量操作 */}
      <Card size="small" style={{ marginBottom: '12px' }} styles={{ body: { padding: '12px' } }}>
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
        styles={{ body: { padding: '8px', maxHeight: '300px', overflow: 'auto' } }}
      >
        <div className="selected-node-list">
          {selectedNodeIds.map((id) => {
            const n = nodes[id];
            if (!n) return null;
            const icon = getNodeTypeIcon(n.type);
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
  const mode = useThemeStore((s) => s.mode);
  // 精确订阅：避免全量订阅导致 hover/drag 等无关变化触发重渲染
  const selectedNodeId = useCanvasStore(s => s.selectedNodeId);
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const selectedNode = useCanvasStore(s => (s.selectedNodeId ? s.nodes[s.selectedNodeId] : null));
  const updateNode = useCanvasStore(s => s.updateNode);
  const deleteNode = useCanvasStore(s => s.deleteNode);

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

  const nodeIcon = getNodeTypeIcon(selectedNode.type);

  return (
    <div className="property-panel">
      {/* 节点信息头部 */}
      <Card 
        size="small" 
        style={{ marginBottom: '16px' }}
        styles={{ body: { padding: '12px' } }}
      >
        <div className="node-info">
          <Space align="start" style={{ width: '100%' }}>
            <div style={{ fontSize: '24px' }}>{nodeIcon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                size="small"
                value={selectedNode.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                placeholder="节点名称"
                style={{ marginBottom: 4 }}
              />
              <Input
                size="small"
                value={selectedNode.alias || ''}
                onChange={(e) => handleUpdate({ alias: e.target.value || undefined })}
                placeholder="别名（可选）"
                style={{ marginBottom: 4 }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedNode.type}
              </Text>
            </div>
            <DeleteOutlined 
              style={{ color: semanticColors.error[mode], cursor: 'pointer' }}
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