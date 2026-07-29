// 元素工具栏 - 添加元素 / 模板加载 / 清空

import React from 'react';
import { Button, Space, Dropdown, Select, Popconfirm, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined, FileTextOutlined, MinusOutlined, QrcodeOutlined,
  BarcodeOutlined, TableOutlined, PictureOutlined,
  ClearOutlined, FolderOpenOutlined,
} from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import type { PrintElement, ElementType } from '../../data/interface';

const { Text } = Typography;

function genId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 创建元素工厂
function createElement(type: ElementType): PrintElement {
  const id = genId();
  switch (type) {
    case 'text':
      return {
        id, type: 'text',
        content: '新文本',
        fontSize: 1, alignment: 'left', bold: false, underline: 0,
        lineSpacing: 30, wrap: false,
      };
    case 'divider':
      return { id, type: 'divider', char: '-' };
    case 'qrcode':
      return {
        id, type: 'qrcode',
        content: 'https://example.com',
        size: 6, errorLevel: 'M', alignment: 'center',
      };
    case 'barcode':
      return {
        id, type: 'barcode',
        barcodeType: 'CODE128',
        content: '1234567890',
        height: 80, width: 3, showText: true, alignment: 'center',
      };
    case 'table':
      return {
        id, type: 'table',
        columns: [
          { width: 2, header: '商品' },
          { width: 1, header: '数量' },
          { width: 1, header: '单价' },
        ],
        rows: [['商品 A', '1', '$5.00'], ['商品 B', '2', '$3.50']],
        alignment: 'left',
      };
    case 'image':
      return {
        id, type: 'image',
        src: '', alignment: 'center', dither: 'threshold',
      };
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
}

const ADD_MENU_ITEMS: MenuProps['items'] = [
  { key: 'text', icon: <FileTextOutlined />, label: '文本' },
  { key: 'divider', icon: <MinusOutlined />, label: '分割线' },
  { key: 'qrcode', icon: <QrcodeOutlined />, label: '二维码' },
  { key: 'barcode', icon: <BarcodeOutlined />, label: '条码' },
  { key: 'table', icon: <TableOutlined />, label: '表格' },
  { key: 'image', icon: <PictureOutlined />, label: '图片' },
];

const ElementToolbar: React.FC = () => {
  const elements = usePrinterStore(s => s.elements);
  const addElement = usePrinterStore(s => s.addElement);
  const setElements = usePrinterStore(s => s.setElements);
  const templates = usePrinterStore(s => s.templates);
  const loadTemplate = usePrinterStore(s => s.loadTemplate);

  const handleAdd = ({ key }: { key: string }) => {
    const el = createElement(key as ElementType);
    addElement(el);
  };

  const handleLoadTemplate = (id: string) => {
    const els = loadTemplate(id);
    if (els) {
      setElements(els);
    }
  };

  const handleClear = () => {
    setElements([]);
  };

  return (
    <Space wrap>
      <Dropdown menu={{ items: ADD_MENU_ITEMS, onClick: handleAdd }}>
        <Button size="small" type="primary" icon={<PlusOutlined />}>
          添加元素
        </Button>
      </Dropdown>

      <Select
        size="small"
        placeholder="加载模板"
        style={{ width: 160 }}
        suffixIcon={<FolderOpenOutlined />}
        onChange={handleLoadTemplate}
        options={templates.map(t => ({
          value: t.id,
          label: `${t.name} (${t.elements.length} 元素)`,
        }))}
      />

      {elements.length > 0 && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {elements.length} 个元素
        </Text>
      )}

      <Popconfirm
        title="确认清空所有元素？"
        okText="清空"
        cancelText="取消"
        onConfirm={handleClear}
        disabled={elements.length === 0}
      >
        <Button
          size="small"
          danger
          icon={<ClearOutlined />}
          disabled={elements.length === 0}
        >
          清空
        </Button>
      </Popconfirm>
    </Space>
  );
};

export default ElementToolbar;
