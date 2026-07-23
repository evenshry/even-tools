// 打印编辑器 - 元素列表 + 选中编辑
// 左侧为元素列表（可拖动排序 / 选中 / 删除），右侧为选中元素的属性编辑

import React from 'react';
import {
  Card, List, Tag, Button, Space, Empty, Typography, Tooltip,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
  FileTextOutlined, MinusOutlined, QrcodeOutlined, BarcodeOutlined,
  TableOutlined, PictureOutlined, HighlightOutlined,
} from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import type { ElementType } from '../../data/interface';
import PrintElementRenderer from './PrintElementRenderer';

const { Text } = Typography;

// 元素类型图标
const TYPE_ICON: Record<ElementType, React.ReactNode> = {
  text: <FileTextOutlined />,
  divider: <MinusOutlined />,
  qrcode: <QrcodeOutlined />,
  barcode: <BarcodeOutlined />,
  table: <TableOutlined />,
  image: <PictureOutlined />,
};

const TYPE_LABEL: Record<ElementType, string> = {
  text: '文本',
  divider: '分割线',
  qrcode: '二维码',
  barcode: '条码',
  table: '表格',
  image: '图片',
};

const PrintEditor: React.FC = () => {
  const elements = usePrinterStore(s => s.elements);
  const selectedElementId = usePrinterStore(s => s.selectedElementId);
  const selectElement = usePrinterStore(s => s.selectElement);
  const removeElement = usePrinterStore(s => s.removeElement);
  const reorderElements = usePrinterStore(s => s.reorderElements);
  const profile = usePrinterStore(s => s.profile);

  const handleMoveUp = (index: number) => {
    if (index > 0) reorderElements(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < elements.length - 1) reorderElements(index, index + 1);
  };

  if (elements.length === 0) {
    return (
      <Card
        title={<Space><HighlightOutlined />元素列表</Space>}
        size="small"
        style={{ height: '100%' }}
      >
        <Empty description="点击上方'添加元素'开始设计" />
      </Card>
    );
  }

  return (
    <Card
      title={<Space><HighlightOutlined />元素列表</Space>}
      size="small"
      style={{ height: '100%', overflow: 'auto' }}
      styles={{ body: { padding: 8 } }}
    >
      <List
        dataSource={elements}
        renderItem={(el, index) => {
          const selected = el.id === selectedElementId;
          return (
            <div
              onClick={() => selectElement(el.id)}
              style={{
                border: selected ? '2px solid #1890ff' : '1px solid #e8e8e8',
                borderRadius: 4,
                padding: 8,
                marginBottom: 8,
                cursor: 'pointer',
                background: selected ? '#e6f7ff' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}>
                <Space size={4}>
                  {TYPE_ICON[el.type]}
                  <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                    {TYPE_LABEL[el.type]}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    #{index + 1}
                  </Text>
                </Space>
                <Space size={2}>
                  <Tooltip title="上移">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    />
                  </Tooltip>
                  <Tooltip title="下移">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={index === elements.length - 1}
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                    />
                  </Tooltip>
                </Space>
              </div>
              <div style={{
                background: '#fafafa',
                padding: 4,
                borderRadius: 2,
                minHeight: 24,
                overflow: 'hidden',
              }}>
                <PrintElementRenderer element={el} paperWidth={profile.paperWidth} />
              </div>
            </div>
          );
        }}
      />
    </Card>
  );
};

export default PrintEditor;
