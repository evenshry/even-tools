// ESC/POS 编码器 - 链式 API
// 将打印元素或助记符指令编码为 ESC/POS 字节流

import type {
  Alignment, PrintElement, QrErrorLevel, BarcodeType,
  TextElement, BarcodeElement, QrCodeElement, DividerElement,
  TableElement,
} from '../../data/interface';
import {
  CMD_INIT, cmdAlign, cmdBold, cmdUnderline, cmdFontSize,
  cmdLineSpacing, cmdFeed, cmdCut, cmdBuzzer,
  BARCODE_TYPE_MAP, cmdBarcodeHeight, cmdBarcodeWidth, cmdBarcodeText,
  cmdBarcode, cmdQrModel, QR_LEVEL_MAP, cmdQrLevel, cmdQrSize, cmdQrData,
  CMD_QR_PRINT, cmdImage, LF,
} from './escPosCommands';

import { encodeText as gbkEncodeText } from '../gbkEncoder';

function encodeText(text: string, encoding: 'gbk' | 'utf8'): number[] {
  return Array.from(gbkEncodeText(text, encoding));
}

export class EscPosEncoder {
  private buffer: number[] = [];
  private textBuffer: string[] = [];
  private encoding: 'gbk' | 'utf8' = 'gbk';

  setEncoding(enc: 'gbk' | 'utf8'): this {
    this.encoding = enc;
    return this;
  }

  // ===== 基础指令 =====
  init(): this { this.buffer.push(...CMD_INIT); this.textBuffer.push('ESC @'); return this; }
  align(value: Alignment): this {
    this.buffer.push(...cmdAlign(value === 'left' ? 0 : value === 'center' ? 1 : 2));
    this.textBuffer.push(`ESC a ${value}`);
    return this;
  }
  bold(on: boolean): this { this.buffer.push(...cmdBold(on ? 1 : 0)); this.textBuffer.push(`ESC E ${on ? '1' : '0'}`); return this; }
  underline(n: 0 | 1 | 2): this { this.buffer.push(...cmdUnderline(n)); this.textBuffer.push(`ESC - ${n}`); return this; }
  fontSize(w: number, h: number): this { this.buffer.push(...cmdFontSize(w, h)); this.textBuffer.push(`GS ! ${w},${h}`); return this; }
  lineSpacing(n: number): this { this.buffer.push(...cmdLineSpacing(n)); this.textBuffer.push(`ESC 3 ${n}`); return this; }
  text(s: string): this {
    this.buffer.push(...encodeText(s, this.encoding));
    this.textBuffer.push(s);
    return this;
  }
  textLine(s: string): this { this.text(s); this.buffer.push(LF); this.textBuffer.push('\n'); return this; }
  feed(n: number): this { this.buffer.push(...cmdFeed(n)); this.textBuffer.push(`ESC d ${n}`); return this; }
  cut(full: boolean = true): this { this.buffer.push(...cmdCut(full)); this.textBuffer.push(`GS V ${full ? '1' : '0'}`); return this; }
  buzzer(times: number, duration: number): this {
    this.buffer.push(...cmdBuzzer(times, duration)); this.textBuffer.push(`ESC ( B ${times},${duration}`); return this;
  }

  // ===== 分割线 =====
  divider(char: string = '-', width: number = 32): this {
    const line = char.repeat(width);
    this.buffer.push(...encodeText(line, this.encoding));
    this.buffer.push(LF);
    this.textBuffer.push(line + '\n');
    return this;
  }

  // ===== 一维条码 =====
  barcode(type: BarcodeType, content: string, opts?: {
    height?: number; width?: 2|3|4|5|6; showText?: boolean;
  }): this {
    const m = BARCODE_TYPE_MAP[type];
    const data = encodeText(content, 'utf8');
    if (opts?.height) this.buffer.push(...cmdBarcodeHeight(opts.height));
    if (opts?.width) this.buffer.push(...cmdBarcodeWidth(opts.width));
    this.buffer.push(...cmdBarcodeText(opts?.showText ? 1 : 0));
    this.buffer.push(...cmdBarcode(m, data));
    this.buffer.push(LF);
    this.textBuffer.push(`BARCODE ${type} "${content}"`);
    return this;
  }

  // ===== 二维码 (ESC/POS 原生指令) =====
  qrcode(content: string, size: number = 6, level: QrErrorLevel = 'M'): this {
    const data = encodeText(content, 'utf8');
    this.buffer.push(...cmdQrModel(2));
    this.buffer.push(...cmdQrSize(size));
    this.buffer.push(...cmdQrLevel(QR_LEVEL_MAP[level]));
    this.buffer.push(...cmdQrData(data));
    this.buffer.push(...CMD_QR_PRINT);
    this.textBuffer.push(`QRCODE "${content}" size=${size} level=${level}`);
    return this;
  }

  // ===== 位图 =====
  image(width: number, height: number, data: number[]): this {
    this.buffer.push(...cmdImage(width, height, data));
    this.textBuffer.push(`IMAGE ${width}x${height}`);
    return this;
  }

  // ===== 直接写入原始字节 =====
  raw(data: Uint8Array | number[]): this {
    this.buffer.push(...(data instanceof Uint8Array ? Array.from(data) : data));
    this.textBuffer.push('[RAW BYTES]');
    return this;
  }

  // ===== 编码打印元素数组 (编辑模式使用) =====
  encodeElements(elements: PrintElement[], paperWidth: number = 48): this {
    for (const el of elements) {
      this.encodeElement(el, paperWidth);
    }
    return this;
  }

  private encodeElement(el: PrintElement, paperWidth: number): void {
    switch (el.type) {
      case 'text': this.encodeTextElement(el, paperWidth); break;
      case 'barcode': this.encodeBarcodeElement(el); break;
      case 'qrcode': this.encodeQrElement(el); break;
      case 'divider': this.encodeDividerElement(el, paperWidth); break;
      case 'table': this.encodeTableElement(el, paperWidth); break;
      case 'image': break; // Phase 2: 需要 imageProcessor.ts 将 dataURL 转为单色位图
    }
  }

  private encodeTextElement(el: TextElement, paperWidth: number): void {
    this.align(el.alignment);
    this.bold(el.bold);
    this.underline(el.underline);
    this.fontSize(el.fontSize - 1, el.fontSize - 1);
    this.lineSpacing(el.lineSpacing);
    if (el.wrap) {
      // 按纸张宽度自动换行
      const charsPerLine = Math.floor(paperWidth / el.fontSize);
      const lines = this.wrapText(el.content, charsPerLine);
      for (const line of lines) this.textLine(line);
    } else {
      this.textLine(el.content);
    }
    // 重置样式
    this.bold(false);
    this.underline(0);
    this.fontSize(0, 0);
    this.lineSpacing(30);
  }

  private encodeBarcodeElement(el: BarcodeElement): void {
    this.align(el.alignment);
    this.barcode(el.barcodeType, el.content, {
      height: el.height, width: el.width, showText: el.showText,
    });
  }

  private encodeQrElement(el: QrCodeElement): void {
    this.align(el.alignment);
    this.qrcode(el.content, el.size, el.errorLevel);
    this.feed(1);
  }

  private encodeDividerElement(el: DividerElement, paperWidth: number): void {
    this.divider(el.char || '-', paperWidth);
  }

  private encodeTableElement(el: TableElement, paperWidth: number): void {
    const totalWidth = el.columns.reduce((s, c) => s + c.width, 0);
    const scale = paperWidth / totalWidth;
    // 表头
    let headerLine = '';
    el.columns.forEach(col => {
      const w = Math.floor(col.width * scale);
      headerLine += this.padString(col.header, w);
    });
    this.textLine(headerLine);
    this.divider('-', paperWidth);
    // 数据行
    for (const row of el.rows) {
      let line = '';
      el.columns.forEach((col, i) => {
        const w = Math.floor(col.width * scale);
        line += this.padString(row[i] || '', w);
      });
      this.textLine(line);
    }
  }

  // ===== 工具方法 =====
  private wrapText(text: string, charsPerLine: number): string[] {
    if (charsPerLine <= 0) return [text];
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      let remaining = para;
      while (remaining.length > charsPerLine) {
        lines.push(remaining.slice(0, charsPerLine));
        remaining = remaining.slice(charsPerLine);
      }
      if (remaining.length > 0 || lines.length === 0) {
        lines.push(remaining);
      }
    }
    return lines;
  }

  private padString(s: string, width: number): string {
    const len = Array.from(s).length;
    if (len >= width) return Array.from(s).slice(0, width).join('');
    return s + ' '.repeat(width - len);
  }

  // ===== 输出 =====
  flush(): Uint8Array {
    const result = new Uint8Array(this.buffer);
    this.buffer = [];
    this.textBuffer = [];
    return result;
  }

  getBytes(): number[] {
    return [...this.buffer];
  }

  getText(): string {
    return this.textBuffer.join('');
  }
}

export interface EscPosCompileResult {
  bytes: Uint8Array;
  text: string;
}

// 便捷函数：编码打印元素为字节流
export function encodePrintElements(
  elements: PrintElement[],
  paperWidth: number = 48,
  encoding: 'gbk' | 'utf8' = 'gbk',
): EscPosCompileResult {
  const encoder = new EscPosEncoder().setEncoding(encoding);
  encoder.init();
  encoder.encodeElements(elements, paperWidth);
  const text = encoder.getText();
  const bytes = encoder.flush();
  return { bytes, text };
}
