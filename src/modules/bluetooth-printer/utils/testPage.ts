// 打印测试页生成器
// 根据当前协议生成包含文本、条码、二维码的测试内容

import type { PrinterProfile, PrintElement } from '../data/interface';
import { encodePrintElements as encodeEscPosElements } from './escPos/escPosEncoder';
import { encodePrintElementsTspl } from './tspl/tsplEncoder';

export function generateTestPageElements(profile: PrinterProfile): PrintElement[] {
  const now = new Date().toLocaleString('zh-CN');
  const isLabel = profile.protocol === 'tspl';

  const elements: PrintElement[] = [
    {
      id: 'title',
      type: 'text',
      content: '打印机测试页',
      fontSize: 3,
      alignment: 'center',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'divider1',
      type: 'divider',
      char: '-',
    },
    {
      id: 'info',
      type: 'text',
      content: `协议: ${profile.protocol.toUpperCase()}\n纸宽: ${isLabel ? profile.paperWidth + 'mm' : (profile.paperWidth === 32 ? '58mm' : '80mm')}\n时间: ${now}`,
      fontSize: 1,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: true,
    },
    {
      id: 'divider2',
      type: 'divider',
      char: '-',
    },
    {
      id: 'barcode',
      type: 'barcode',
      barcodeType: 'CODE128',
      content: 'TEST123456',
      height: isLabel ? 80 : 60,
      width: 3,
      showText: true,
      alignment: 'center',
    },
    {
      id: 'qrcode',
      type: 'qrcode',
      content: 'https://example.com',
      size: isLabel ? 6 : 5,
      errorLevel: 'M',
      alignment: 'center',
    },
    {
      id: 'footer',
      type: 'text',
      content: '测试完成',
      fontSize: 2,
      alignment: 'center',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
  ];

  return elements;
}

export function generateTestPageBytes(profile: PrinterProfile): Uint8Array {
  const elements = generateTestPageElements(profile);

  if (profile.protocol === 'tspl') {
    return encodePrintElementsTspl(elements, {
      widthMm: Math.max(30, profile.paperWidth),
      heightMm: Math.max(20, Math.ceil(elements.length * 8)),
      gapMm: 2,
      dpi: profile.dpi,
      direction: 1,
    }, 'gbk');
  }

  return encodeEscPosElements(elements, profile.paperWidth, 'gbk');
}
