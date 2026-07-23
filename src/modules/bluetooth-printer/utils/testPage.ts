// 自检页生成器
// TSPL: 发送内置 SELFTEST 指令，让打印机自动打印固件/字库/DIP 等信息
// ESC/POS: 标准 ESC/POS 没有软件自检指令（通常需按住 FEED 键上电触发），
//          这里生成一份涵盖字体/字号/对齐/条码/二维码/切纸的"自检样张"，
//          行为与打印机自检页（字号表+条码+Qr+切纸）保持一致。

import type { PrinterProfile, PrintElement } from '../data/interface';
import { encodePrintElements as encodeEscPosElements } from './escPos/escPosEncoder';
import { encodePrintElementsTspl } from './tspl/tsplEncoder';
import { CMD_SELFTEST } from './tspl/tsplCommands';
import { encodeText } from './gbkEncoder';

/**
 * 触发打印机自检页
 * - TSPL: 发送 SELFTEST\r\n，打印机立即打印内置自检页
 * - ESC/POS: 发送一份覆盖全部常用特性的自检样张（无标准软件自检指令）
 */
export function generateSelfTestBytes(profile: PrinterProfile): Uint8Array {
  if (profile.protocol === 'tspl') {
    // TSPL 是文本协议，ASCII 编码即可
    return encodeText(CMD_SELFTEST, 'utf8');
  }
  // ESC/POS 走"自检样张"实现
  const elements = generateSelfTestElements(profile);
  return encodeEscPosElements(elements, profile.paperWidth, 'gbk').bytes;
}

/**
 * ESC/POS 自检样张元素列表
 * 包含：标题/协议/时间/字号表/对齐表/条码（CODE128+EAN13）/二维码/切纸
 */
function generateSelfTestElements(profile: PrinterProfile): PrintElement[] {
  const now = new Date().toLocaleString('zh-CN');
  const paperLabel = profile.paperWidth === 32 ? '58mm' : profile.paperWidth === 48 ? '80mm' : `${profile.paperWidth}mm`;

  return [
    {
      id: 'self-title',
      type: 'text',
      content: 'PRINTER SELF-TEST',
      fontSize: 3,
      alignment: 'center',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-divider1',
      type: 'divider',
      char: '=',
    },
    {
      id: 'self-info',
      type: 'text',
      content: `Protocol : ESC/POS\nPaper    : ${paperLabel}\nTime     : ${now}`,
      fontSize: 1,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-divider2',
      type: 'divider',
      char: '-',
    },
    // 字号表
    {
      id: 'self-size-h',
      type: 'text',
      content: 'Font Size Test',
      fontSize: 1,
      alignment: 'left',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-size-1',
      type: 'text',
      content: 'Size 1: ABC abc 123',
      fontSize: 1,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-size-2',
      type: 'text',
      content: 'Size 2: ABC abc 123',
      fontSize: 2,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-size-3',
      type: 'text',
      content: 'Size 3: ABC',
      fontSize: 3,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-size-4',
      type: 'text',
      content: 'Size 4: AB',
      fontSize: 4,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-divider3',
      type: 'divider',
      char: '-',
    },
    // 样式 + 对齐
    {
      id: 'self-style-h',
      type: 'text',
      content: 'Style / Align Test',
      fontSize: 1,
      alignment: 'left',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-bold',
      type: 'text',
      content: 'Bold ON',
      fontSize: 2,
      alignment: 'left',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-ul',
      type: 'text',
      content: 'Underline ON',
      fontSize: 2,
      alignment: 'left',
      bold: false,
      underline: 1,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-cn',
      type: 'text',
      content: '中文测试：蓝牙打印机自检页',
      fontSize: 2,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-align-left',
      type: 'text',
      content: '<- Left',
      fontSize: 1,
      alignment: 'left',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-align-center',
      type: 'text',
      content: '<- Center ->',
      fontSize: 1,
      alignment: 'center',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-align-right',
      type: 'text',
      content: 'Right ->',
      fontSize: 1,
      alignment: 'right',
      bold: false,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-divider4',
      type: 'divider',
      char: '-',
    },
    // 条码
    {
      id: 'self-bc-h',
      type: 'text',
      content: 'Barcode Test',
      fontSize: 1,
      alignment: 'left',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-bc-128',
      type: 'barcode',
      barcodeType: 'CODE128',
      content: 'SELFTEST128',
      height: 60,
      width: 2,
      showText: true,
      alignment: 'center',
    },
    {
      id: 'self-bc-ean',
      type: 'barcode',
      barcodeType: 'EAN13',
      content: '1234567890123',
      height: 60,
      width: 2,
      showText: true,
      alignment: 'center',
    },
    {
      id: 'self-divider5',
      type: 'divider',
      char: '-',
    },
    // 二维码
    {
      id: 'self-qr-h',
      type: 'text',
      content: 'QRCode Test',
      fontSize: 1,
      alignment: 'left',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
    {
      id: 'self-qr',
      type: 'qrcode',
      content: 'https://example.com',
      size: 6,
      errorLevel: 'M',
      alignment: 'center',
    },
    {
      id: 'self-divider6',
      type: 'divider',
      char: '=',
    },
    {
      id: 'self-footer',
      type: 'text',
      content: '*** Self-Test Completed ***',
      fontSize: 2,
      alignment: 'center',
      bold: true,
      underline: 0,
      lineSpacing: 30,
      wrap: false,
    },
  ];
}

// ===== 旧的自定义测试页（保留兼容，但设备连接面板不再使用）=====

/**
 * @deprecated 改用 generateSelfTestBytes，保留以备设计模式手动插入"测试样张"
 */
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

/**
 * @deprecated 改用 generateSelfTestBytes
 */
export function generateTestPageBytes(profile: PrinterProfile): Uint8Array {
  const elements = generateTestPageElements(profile);

  if (profile.protocol === 'tspl') {
    return encodePrintElementsTspl(elements, {
      widthMm: Math.max(30, profile.paperWidth),
      heightMm: Math.max(20, Math.ceil(elements.length * 8)),
      gapMm: 2,
      dpi: profile.dpi,
      direction: 0,
    }, 'gbk').bytes;
  }

  return encodeEscPosElements(elements, profile.paperWidth, 'gbk').bytes;
}
