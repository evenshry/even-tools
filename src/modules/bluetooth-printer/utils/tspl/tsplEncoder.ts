// TSPL 编码器 - 链式 API
// 将助记符指令或打印元素编码为 TSPL 字节流
//
// 与 ESC/POS 编码器不同：TSPL 是文本协议，编译结果是字符串
// 最后用 TextEncoder 转为字节流
// TSPL 需要维护一个"游标"概念，因为元素需要绝对坐标

import { encodeText as gbkEncodeText } from '../gbkEncoder';
import type {
  PrintElement, QrErrorLevel, BarcodeType,
  TextElement, BarcodeElement, QrCodeElement, DividerElement, TableElement,
} from '../../data/interface';
import {
  TSPL_NEWLINE, CMD_CLS, cmdSize, cmdGap, cmdDirection, cmdCodepage,
  cmdText, cmdBarcode, cmdQrcode, cmdBar, cmdBox, cmdPrint, cmdSound, cmdCut,
  byteLength,
} from './tsplCommands';

// 标签默认配置
export interface TsplLabelConfig {
  widthMm: number;
  heightMm: number;
  gapMm: number;
  dpi: 203 | 300;
  direction: 0 | 1;
}

export const DEFAULT_LABEL_CONFIG: TsplLabelConfig = {
  widthMm: 40,
  heightMm: 30,
  gapMm: 0,
  dpi: 203,
  direction: 0,
};

// 字号映射: PrintElement.fontSize -> TSPL 字体与放大倍数
const FONT_MAP: Record<number, { font: string; xMul: number; yMul: number }> = {
  1: { font: '1', xMul: 1, yMul: 1 },   // 8x8 点阵
  2: { font: '1', xMul: 2, yMul: 2 },   // 16x16
  3: { font: '2', xMul: 2, yMul: 2 },   // 16x32
  4: { font: '2', xMul: 3, yMul: 3 },   // 24x48
};

export class TsplEncoder {
  private buffer: string[] = [];
  private encoding: 'gbk' | 'utf8' = 'utf8';
  private labelConfig: TsplLabelConfig = DEFAULT_LABEL_CONFIG;
  // 游标：当前 y 坐标（点），元素从上到下排列
  private cursorY = 0;
  // 标签像素宽度（点）
  private labelWidthDots = 0;

  setEncoding(enc: 'gbk' | 'utf8'): this {
    this.encoding = enc;
    return this;
  }

  setLabelConfig(config: Partial<TsplLabelConfig>): this {
    this.labelConfig = { ...this.labelConfig, ...config };
    this.labelWidthDots = Math.floor(this.labelConfig.widthMm * this.labelConfig.dpi / 25.4);
    return this;
  }

  // ===== 基础指令 =====
  size(widthMm: number, heightMm: number): this {
    this.buffer.push(cmdSize(widthMm, heightMm));
    return this;
  }
  gap(gapMm: number): this {
    this.buffer.push(cmdGap(gapMm));
    return this;
  }
  direction(n: 0 | 1): this {
    this.buffer.push(cmdDirection(n));
    return this;
  }
  cls(): this {
    this.cursorY = 0;
    this.buffer.push(CMD_CLS);
    return this;
  }
  codepage(n: number | string): this {
    this.buffer.push(cmdCodepage(n));
    return this;
  }
  sound(level: number, duration: number): this {
    this.buffer.push(cmdSound(level, duration));
    return this;
  }
  cut(n: number = 0): this {
    this.buffer.push(cmdCut(n));
    return this;
  }
  print(copies: number = 1, quantity: number = 1): this {
    this.buffer.push(cmdPrint(copies, quantity));
    return this;
  }

  // ===== 原始文本指令 =====
  raw(text: string): this {
    this.buffer.push(text.endsWith(TSPL_NEWLINE) ? text : text + TSPL_NEWLINE);
    return this;
  }

  // ===== 绝对坐标元素 =====
  text(x: number, y: number, font: string, content: string, opts?: {
    rotation?: 0 | 90 | 180 | 270; xMul?: number; yMul?: number;
  }): this {
    this.buffer.push(cmdText(x, y, font, content, opts));
    return this;
  }

  barcode(x: number, y: number, type: BarcodeType, content: string, opts?: {
    height?: number; readable?: 0 | 1; rotation?: 0 | 90 | 180 | 270;
    narrow?: number; wide?: number;
  }): this {
    this.buffer.push(cmdBarcode(x, y, type, content, opts));
    return this;
  }

  qrcode(x: number, y: number, content: string, opts?: {
    level?: QrErrorLevel; cellWidth?: number; mode?: 0 | 1 | 2 | 3;
    rotation?: 0 | 90 | 180 | 270;
  }): this {
    this.buffer.push(cmdQrcode(x, y, content, opts));
    return this;
  }

  bar(x: number, y: number, width: number, height: number): this {
    this.buffer.push(cmdBar(x, y, width, height));
    return this;
  }

  box(x1: number, y1: number, x2: number, y2: number, thickness?: number): this {
    this.buffer.push(cmdBox(x1, y1, x2, y2, thickness));
    return this;
  }

  // ===== 流式布局元素 (维护游标 y) =====

  // 添加文本元素并推进游标
  private addTextElement(el: TextElement): void {
    const fontInfo = FONT_MAP[el.fontSize] || FONT_MAP[1];
    // 估算文本宽度（点）：字符数 × 字符宽度 × 放大倍数
    const charWidthDots = 8 * fontInfo.xMul; // 简化：每字符约 8 点
    const textWidthDots = byteLength(el.content.split('\n')[0] || '', this.encoding) * charWidthDots;
    // 根据对齐计算 x 坐标
    let x = 0;
    if (el.alignment === 'center') {
      x = Math.max(0, Math.floor((this.labelWidthDots - textWidthDots) / 2));
    } else if (el.alignment === 'right') {
      x = Math.max(0, this.labelWidthDots - textWidthDots);
    }
    // 多行文本：每行推进 y
    const lines = el.content.split('\n');
    const lineHeight = 8 * fontInfo.yMul + Math.floor(el.lineSpacing / 4);
    for (const line of lines) {
      let lineX = x;
      if (el.alignment === 'center' || el.alignment === 'right') {
        const lineWidthDots = byteLength(line, this.encoding) * charWidthDots;
        if (el.alignment === 'center') {
          lineX = Math.max(0, Math.floor((this.labelWidthDots - lineWidthDots) / 2));
        } else {
          lineX = Math.max(0, this.labelWidthDots - lineWidthDots);
        }
      }
      this.buffer.push(cmdText(lineX, this.cursorY, fontInfo.font, line, {
        xMul: fontInfo.xMul, yMul: fontInfo.yMul,
      }));
      this.cursorY += lineHeight;
    }
  }

  private addBarcodeElement(el: BarcodeElement): void {
    const barWidthDots = (el.content.length * 8 + 20) * el.width;
    let x = 0;
    if (el.alignment === 'center') {
      x = Math.max(0, Math.floor((this.labelWidthDots - barWidthDots) / 2));
    } else if (el.alignment === 'right') {
      x = Math.max(0, this.labelWidthDots - barWidthDots);
    }
    this.buffer.push(cmdBarcode(x, this.cursorY, el.barcodeType, el.content, {
      height: el.height, readable: el.showText ? 1 : 0, narrow: el.width, wide: el.width * 2,
    }));
    this.cursorY += el.height + (el.showText ? 16 : 4);
  }

  private addQrElement(el: QrCodeElement): void {
    const qrSizeDots = el.size * 8; // 估算 QR 边长
    let x = 0;
    if (el.alignment === 'center') {
      x = Math.max(0, Math.floor((this.labelWidthDots - qrSizeDots) / 2));
    } else if (el.alignment === 'right') {
      x = Math.max(0, this.labelWidthDots - qrSizeDots);
    }
    this.buffer.push(cmdQrcode(x, this.cursorY, el.content, {
      level: el.errorLevel, cellWidth: Math.max(1, Math.min(10, el.size)),
    }));
    this.cursorY += qrSizeDots + 4;
  }

  private addDividerElement(el: DividerElement): void {
    // 用 BAR 画一条横线
    const thickness = 2;
    this.buffer.push(cmdBar(0, this.cursorY, this.labelWidthDots, thickness));
    this.cursorY += thickness + 4;
    // 不使用 el.char，因为 TSPL 不像 ESC/POS 有字符行概念
    void el;
  }

  private addTableElement(el: TableElement): void {
    // 表格：用 BOX 画框，TEXT 填充
    const rowHeight = 24;
    const totalWidth = el.columns.reduce((s, c) => s + c.width, 0) || 1;
    const colWidths = el.columns.map(c => Math.floor(this.labelWidthDots * c.width / totalWidth));
    // 表头行
    this.buffer.push(cmdBox(0, this.cursorY, this.labelWidthDots, this.cursorY + rowHeight, 1));
    let cx = 0;
    el.columns.forEach((col, i) => {
      this.buffer.push(cmdText(cx + 2, this.cursorY + 4, '1', col.header, { xMul: 1, yMul: 1 }));
      cx += colWidths[i];
    });
    this.cursorY += rowHeight;
    // 数据行
    for (const row of el.rows) {
      this.buffer.push(cmdBox(0, this.cursorY, this.labelWidthDots, this.cursorY + rowHeight, 1));
      cx = 0;
      el.columns.forEach((_, i) => {
        this.buffer.push(cmdText(cx + 2, this.cursorY + 4, '1', row[i] || '', { xMul: 1, yMul: 1 }));
        cx += colWidths[i];
      });
      this.cursorY += rowHeight;
    }
    void el;
  }

  // ===== 编码打印元素数组 =====
  encodeElements(elements: PrintElement[]): this {
    for (const el of elements) {
      switch (el.type) {
        case 'text': this.addTextElement(el); break;
        case 'barcode': this.addBarcodeElement(el); break;
        case 'qrcode': this.addQrElement(el); break;
        case 'divider': this.addDividerElement(el); break;
        case 'table': this.addTableElement(el); break;
        case 'image': break; // Phase 2
      }
    }
    return this;
  }

  // ===== 输出 =====
  flush(): Uint8Array {
    const text = this.buffer.join('');
    this.buffer = [];
    this.cursorY = 0;
    return gbkEncodeText(text, this.encoding);
  }

  getText(): string {
    return this.buffer.join('');
  }

  // 当前游标 y 坐标（点）
  getCursorY(): number {
    return this.cursorY;
  }

  // 标签宽度（点）
  getLabelWidthDots(): number {
    return this.labelWidthDots;
  }
}

export interface TsplCompileResult {
  bytes: Uint8Array;
  text: string;
}

// 便捷函数：编码打印元素为 TSPL 字节流
export function encodePrintElementsTspl(
  elements: PrintElement[],
  labelConfig: TsplLabelConfig = DEFAULT_LABEL_CONFIG,
  encoding: 'gbk' | 'utf8' = 'utf8',
): TsplCompileResult {
  const encoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(labelConfig);
  encoder.size(labelConfig.widthMm, labelConfig.heightMm);
  encoder.gap(labelConfig.gapMm);
  encoder.direction(labelConfig.direction);
  encoder.codepage(encoding === 'utf8' ? 'UTF-8' : 'GB18030');
  encoder.cls();
  encoder.encodeElements(elements);
  encoder.print(1, 1);
  const text = encoder.getText();
  const bytes = encoder.flush();
  return { bytes, text };
}
