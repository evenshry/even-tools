// TSPL 编码器 - 链式 API
// 将助记符指令或打印元素编码为 TSPL 字节流
//
// 与 ESC/POS 编码器不同：TSPL 是文本协议，编译结果是字符串
// 最后用 TextEncoder 转为字节流
// TSPL 需要维护一个"游标"概念，因为元素需要绝对坐标

import { encodeText as gbkEncodeText } from '../gbkEncoder';
import { displayWidth } from '../textWidth';
import { getQrModuleSize } from '../escPos/qrEncoder';
import type {
  PrintElement, QrErrorLevel, BarcodeType, Alignment,
  TextElement, BarcodeElement, QrCodeElement, DividerElement, TableElement, ImageElement,
} from '../../data/interface';
import { processImage } from '../imageProcessor';
import {
  TSPL_NEWLINE, CMD_CLS, cmdSize, cmdGap, cmdDirection, cmdCodepage,
  cmdText, cmdBarcode, cmdQrcode, cmdBar, cmdBox, cmdPrint, cmdSound, cmdCut, cmdBitmap,
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

  // ===== 流式布局元素 (维护游标 y) =====

  // 流式文本：按当前游标绘制并在每行后推进 y（供助记符模式使用）
  streamText(content: string, alignment: Alignment = 'left', fontSize: number = 1): this {
    const fontInfo = FONT_MAP[fontSize] || FONT_MAP[1];
    const charWidthDots = 8 * fontInfo.xMul;
    const lineHeight = 8 * fontInfo.yMul + 2;
    for (const line of content.split('\n')) {
      const lineWidthDots = this.measureLine(line, charWidthDots);
      this.buffer.push(cmdText(
        this.alignX(lineWidthDots, alignment),
        this.cursorY,
        fontInfo.font,
        line,
        { xMul: fontInfo.xMul, yMul: fontInfo.yMul },
      ));
      this.cursorY += lineHeight;
    }
    return this;
  }

  // 流式一维条码
  streamBarcode(type: BarcodeType, content: string, opts?: {
    height?: number; showText?: boolean; width?: number; alignment?: Alignment;
  }): this {
    const width = Math.max(1, Math.min(4, opts?.width ?? 2));
    const height = Math.max(8, opts?.height ?? 60);
    const showText = opts?.showText ?? true;
    const barWidthDots = (content.length * 8 + 20) * width;
    this.buffer.push(cmdBarcode(this.alignX(barWidthDots, opts?.alignment ?? 'left'), this.cursorY, type, content, {
      height, readable: showText ? 1 : 0, narrow: width, wide: width * 2,
    }));
    this.cursorY += height + (showText ? 16 : 4);
    return this;
  }

  // 流式二维码（按真实模块数计算占用高度）
  streamQrCode(content: string, opts?: {
    level?: QrErrorLevel; cellWidth?: number; alignment?: Alignment;
  }): this {
    const cell = Math.max(1, Math.min(10, opts?.cellWidth ?? 6));
    const level = opts?.level ?? 'M';
    const qrSizeDots = getQrModuleSize(content, level) * cell;
    this.buffer.push(cmdQrcode(this.alignX(qrSizeDots, opts?.alignment ?? 'left'), this.cursorY, content, {
      level, cellWidth: cell,
    }));
    this.cursorY += qrSizeDots + 4;
    return this;
  }

  // 仅推进游标（空行/换行）
  advance(lines: number = 1): this {
    this.cursorY += Math.max(0, lines) * 12;
    return this;
  }

  private measureLine(line: string, charWidthDots: number): number {
    // 按显示宽度计算：中文占 2 个字符位
    return displayWidth(line) * charWidthDots;
  }

  private alignX(contentWidthDots: number, alignment: Alignment): number {
    if (alignment === 'center') {
      return Math.max(0, Math.floor((this.labelWidthDots - contentWidthDots) / 2));
    }
    if (alignment === 'right') {
      return Math.max(0, this.labelWidthDots - contentWidthDots);
    }
    return 0;
  }

  // 添加文本元素并推进游标
  private addTextElement(el: TextElement): void {
    const fontInfo = FONT_MAP[el.fontSize] || FONT_MAP[1];
    const charWidthDots = 8 * fontInfo.xMul;
    const lineHeight = 8 * fontInfo.yMul + Math.floor(el.lineSpacing / 4);
    for (const line of el.content.split('\n')) {
      const lineWidthDots = this.measureLine(line, charWidthDots);
      this.buffer.push(cmdText(this.alignX(lineWidthDots, el.alignment), this.cursorY, fontInfo.font, line, {
        xMul: fontInfo.xMul, yMul: fontInfo.yMul,
      }));
      this.cursorY += lineHeight;
    }
  }

  private addBarcodeElement(el: BarcodeElement): void {
    const barWidthDots = (el.content.length * 8 + 20) * el.width;
    this.buffer.push(cmdBarcode(this.alignX(barWidthDots, el.alignment), this.cursorY, el.barcodeType, el.content, {
      height: el.height, readable: el.showText ? 1 : 0, narrow: el.width, wide: el.width * 2,
    }));
    this.cursorY += el.height + (el.showText ? 16 : 4);
  }

  private addQrElement(el: QrCodeElement): void {
    // 用真实模块数估算边长，避免预留高度偏小导致后续元素重叠
    const cellWidth = Math.max(1, Math.min(10, el.size));
    const qrSizeDots = getQrModuleSize(el.content, el.errorLevel) * cellWidth;
    this.buffer.push(cmdQrcode(this.alignX(qrSizeDots, el.alignment), this.cursorY, el.content, {
      level: el.errorLevel, cellWidth,
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

  // ===== 编码打印元素数组 - 同步版本（跳过图片）=====
  encodeElements(elements: PrintElement[]): this {
    for (const el of elements) {
      switch (el.type) {
        case 'text': this.addTextElement(el); break;
        case 'barcode': this.addBarcodeElement(el); break;
        case 'qrcode': this.addQrElement(el); break;
        case 'divider': this.addDividerElement(el); break;
        case 'table': this.addTableElement(el); break;
        case 'image': break;
      }
    }
    return this;
  }

  // ===== 编码打印元素数组 - 异步版本（支持图片）=====
  async encodeElementsAsync(elements: PrintElement[]): Promise<this> {
    for (const el of elements) {
      switch (el.type) {
        case 'text': this.addTextElement(el); break;
        case 'barcode': this.addBarcodeElement(el); break;
        case 'qrcode': this.addQrElement(el); break;
        case 'divider': this.addDividerElement(el); break;
        case 'table': this.addTableElement(el); break;
        case 'image': await this.addImageElement(el); break;
      }
    }
    return this;
  }

  private async addImageElement(el: ImageElement): Promise<void> {
    if (!el.src) return;
    // TSPL: 图片宽度 = 标签宽度（点）
    const targetWidthPx = this.labelWidthDots;
    const bitmap = await processImage(el.src, targetWidthPx, el.dither);
    const widthBytes = Math.ceil(bitmap.width / 8);
    let x = 0;
    if (el.alignment === 'center') {
      x = Math.max(0, Math.floor((this.labelWidthDots - bitmap.width) / 2));
    } else if (el.alignment === 'right') {
      x = Math.max(0, this.labelWidthDots - bitmap.width);
    }
    this.buffer.push(cmdBitmap(x, this.cursorY, widthBytes, bitmap.height, bitmap.data));
    this.cursorY += bitmap.height + 4;
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
  labelConfig: TsplLabelConfig;
}

// 根据内容高度计算标签高度（毫米）
function calcDynamicHeightMm(contentHeightDots: number, dpi: number): number {
  const paddingMm = 4; // 上下边距各约 2mm
  const contentHeightMm = Math.ceil(contentHeightDots * 25.4 / dpi);
  return Math.max(10, contentHeightMm + paddingMm); // 最小 10mm
}

// 便捷函数：编码打印元素为 TSPL 字节流
export function encodePrintElementsTspl(
  elements: PrintElement[],
  labelConfig: TsplLabelConfig = DEFAULT_LABEL_CONFIG,
  encoding: 'gbk' | 'utf8' = 'utf8',
): TsplCompileResult {
  // 1. 预排版测量内容高度
  const measureEncoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(labelConfig);
  measureEncoder.encodeElements(elements);
  const contentHeightDots = measureEncoder.getCursorY();

  // 2. 动态计算标签高度
  const dynamicHeightMm = calcDynamicHeightMm(contentHeightDots, labelConfig.dpi);
  const finalConfig: TsplLabelConfig = { ...labelConfig, heightMm: dynamicHeightMm };

  // 3. 正式编码
  const encoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(finalConfig);
  encoder.size(finalConfig.widthMm, finalConfig.heightMm);
  encoder.gap(finalConfig.gapMm);
  encoder.direction(finalConfig.direction);
  encoder.codepage(encoding === 'utf8' ? 'UTF-8' : 'GB18030');
  encoder.cls();
  encoder.encodeElements(elements);
  encoder.print(1, 1);
  const text = encoder.getText();
  const bytes = encoder.flush();
  return { bytes, text, labelConfig: finalConfig };
}

// 便捷函数：编码打印元素为 TSPL 字节流（异步，支持图片）
export async function encodePrintElementsTsplAsync(
  elements: PrintElement[],
  labelConfig: TsplLabelConfig = DEFAULT_LABEL_CONFIG,
  encoding: 'gbk' | 'utf8' = 'utf8',
): Promise<TsplCompileResult> {
  // 1. 预排版测量内容高度
  const measureEncoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(labelConfig);
  await measureEncoder.encodeElementsAsync(elements);
  const contentHeightDots = measureEncoder.getCursorY();

  // 2. 动态计算标签高度
  const dynamicHeightMm = calcDynamicHeightMm(contentHeightDots, labelConfig.dpi);
  const finalConfig: TsplLabelConfig = { ...labelConfig, heightMm: dynamicHeightMm };

  // 3. 正式编码
  const encoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(finalConfig);
  encoder.size(finalConfig.widthMm, finalConfig.heightMm);
  encoder.gap(finalConfig.gapMm);
  encoder.direction(finalConfig.direction);
  encoder.codepage(encoding === 'utf8' ? 'UTF-8' : 'GB18030');
  encoder.cls();
  await encoder.encodeElementsAsync(elements);
  encoder.print(1, 1);
  const text = encoder.getText();
  const bytes = encoder.flush();
  return { bytes, text, labelConfig: finalConfig };
}
