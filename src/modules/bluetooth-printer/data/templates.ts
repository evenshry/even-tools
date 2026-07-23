// 编辑模式 - 内置打印模板
import type { Template } from './interface';

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'tpl-receipt-basic',
    name: '基础小票',
    description: '商店名称 + 商品列表 + 合计 + 二维码',
    variables: ['shopName', 'items', 'total', 'qrUrl'],
    category: 'receipt',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elements: [
      {
        id: genId('el'),
        type: 'text',
        content: 'My Shop',
        fontSize: 2,
        alignment: 'center',
        bold: true,
        underline: 0,
        lineSpacing: 30,
        wrap: false,
      },
      {
        id: genId('el'),
        type: 'divider',
        char: '-',
      },
      {
        id: genId('el'),
        type: 'text',
        content: 'Item 1                  $5.00\nItem 2                  $3.50',
        fontSize: 1,
        alignment: 'left',
        bold: false,
        underline: 0,
        lineSpacing: 30,
        wrap: true,
      },
      {
        id: genId('el'),
        type: 'divider',
        char: '-',
      },
      {
        id: genId('el'),
        type: 'text',
        content: 'Total: $8.50',
        fontSize: 2,
        alignment: 'right',
        bold: true,
        underline: 0,
        lineSpacing: 30,
        wrap: false,
      },
      {
        id: genId('el'),
        type: 'qrcode',
        content: 'https://example.com',
        size: 6,
        errorLevel: 'M',
        alignment: 'center',
      },
    ],
  },
  {
    id: 'tpl-label-simple',
    name: '简单标签',
    description: '条码 + 产品名称',
    variables: ['barcode', 'name'],
    category: 'label',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elements: [
      {
        id: genId('el'),
        type: 'text',
        content: 'Product Name',
        fontSize: 2,
        alignment: 'center',
        bold: true,
        underline: 0,
        lineSpacing: 30,
        wrap: false,
      },
      {
        id: genId('el'),
        type: 'barcode',
        barcodeType: 'CODE128',
        content: '1234567890',
        height: 80,
        width: 3,
        showText: true,
        alignment: 'center',
      },
    ],
  },
];
