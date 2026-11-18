// 助记符 DSL 编译器
// 将助记符脚本编译为 ESC/POS 或 TSPL 字节流
//
// 语法示例 (ESC/POS):
//   @init
//   @align center
//   @bold on
//   @size 2x2
//   Hello World
//   @bold off
//   @align left
//   @qr https://example.com size=6 level=M
//   @feed 3
//   @cut
//
// 语法示例 (TSPL):
//   @cls
//   @align center
//   @text 10,10 "Hello"        (给定坐标时按绝对坐标绘制)
//   @qr 10,40 https://example.com size=6 level=M
//   @barcode CODE128 10,100 "1234567890"
//   @print 1
//
// 注意：
// - TSPL 为文本协议，@raw 直接原样写入指令文本，不做 hex 解码。
// - TSPL 不支持逐行样式，@size/@bold/@underline/@linespace 会被忽略；
//   标签尺寸/间隙/方向请在打印机设置中配置。

import type { MnemonicInstruction, Alignment, QrErrorLevel, BarcodeType } from '../../data/interface';
import { EscPosEncoder } from '../escPos/escPosEncoder';
import { TsplEncoder, type TsplLabelConfig, DEFAULT_LABEL_CONFIG } from '../tspl/tsplEncoder';
import { parseHex } from './hexParser';

export type PrinterProtocol = 'escpos' | 'tspl';

export interface MnemonicCompileResult {
  bytes: Uint8Array;
  error?: string;
  lineErrors: { line: number; message: string }[];
}

const ALIGN_MAP: Record<string, Alignment> = {
  left: 'left', center: 'center', right: 'right', l: 'left', c: 'center', r: 'right',
};

const QR_LEVEL_MAP: Record<string, QrErrorLevel> = {
  L: 'L', M: 'M', Q: 'Q', H: 'H', l: 'L', m: 'M', q: 'Q', h: 'H',
};

const BARCODE_TYPE_MAP: Record<string, BarcodeType> = {
  UPC_A: 'UPC_A', EAN13: 'EAN13', CODE128: 'CODE128', CODE39: 'CODE39', ITF: 'ITF',
};

const COORD_RE = /^(\d+)\s*,\s*(\d+)$/;

// 按空白拆分参数，保留双引号内的空格
function splitArgs(input: string): string[] {
  const result: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        result.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) result.push(current);
  return result;
}

function parseCoord(token: string | undefined): { x: number; y: number } | null {
  const m = token?.match(COORD_RE);
  return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
}

export function parseMnemonic(
  script: string,
  lineErrors: { line: number; message: string }[] = [],
): MnemonicInstruction[] {
  const lines = script.split('\n');
  const instructions: MnemonicInstruction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = i + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 普通文本行
    if (!trimmed.startsWith('@')) {
      instructions.push({ kind: 'text', line: lineNo, content: rawLine });
      continue;
    }

    const fail = (message: string) => lineErrors.push({ line: lineNo, message });
    const parts = splitArgs(trimmed.slice(1));
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'init':
      case 'cls':
        // TSPL 下等价于 CLS，ESC/POS 下等价于 INIT
        instructions.push({ kind: 'init', line: lineNo });
        break;
      case 'align': {
        const value = ALIGN_MAP[args[0]?.toLowerCase()];
        if (!value) {
          fail(`未知对齐方式 "${args[0] ?? ''}"，可选 left/center/right`);
          break;
        }
        instructions.push({ kind: 'align', line: lineNo, value });
        break;
      }
      case 'bold':
        instructions.push({
          kind: 'bold',
          line: lineNo,
          value: ['on', 'true', '1'].includes(args[0]?.toLowerCase() ?? ''),
        });
        break;
      case 'underline':
      case 'ul': {
        const raw = parseInt(args[0], 10) || 0;
        instructions.push({ kind: 'underline', line: lineNo, value: Math.max(0, Math.min(2, raw)) as 0 | 1 | 2 });
        break;
      }
      case 'size': {
        // @size 2x2 (ESC/POS 字号) / @size 40x30 mm (TSPL 标签尺寸)
        const m = args[0]?.match(/^(\d+)x(\d+)$/i);
        if (!m) {
          fail('字号格式应为 WxH，如 "2x2"');
          break;
        }
        instructions.push({ kind: 'size', line: lineNo, w: parseInt(m[1], 10), h: parseInt(m[2], 10) });
        break;
      }
      case 'linespace':
      case 'ls':
        instructions.push({ kind: 'lineSpacing', line: lineNo, value: parseInt(args[0], 10) || 30 });
        break;
      case 'feed':
        instructions.push({ kind: 'feed', line: lineNo, lines: parseInt(args[0], 10) || 1 });
        break;
      case 'cut':
        instructions.push({ kind: 'cut', line: lineNo, full: args[0]?.toLowerCase() !== 'half' });
        break;
      case 'beep':
      case 'buzzer':
        instructions.push({
          kind: 'buzzer',
          line: lineNo,
          times: parseInt(args[0], 10) || 1,
          duration: parseInt(args[1], 10) || 1,
        });
        break;
      case 'qr':
      case 'qrcode': {
        const coord = parseCoord(args[0]);
        const content = coord ? (args[1] ?? '') : (args[0] ?? '');
        const opts = coord ? args.slice(2) : args.slice(1);
        const sizeOpt = opts.find(o => o.startsWith('size='));
        const levelOpt = opts.find(o => o.startsWith('level='));
        instructions.push({
          kind: 'qr',
          line: lineNo,
          content,
          size: sizeOpt ? parseInt(sizeOpt.split('=')[1], 10) : 6,
          level: levelOpt ? QR_LEVEL_MAP[levelOpt.split('=')[1]?.toUpperCase()] : undefined,
          x: coord?.x,
          y: coord?.y,
        });
        break;
      }
      case 'barcode':
      case 'bc': {
        const type = BARCODE_TYPE_MAP[args[0]?.toUpperCase()] || 'CODE128';
        const coord = parseCoord(args[1]);
        const content = coord ? (args[2] ?? '') : (args[1] ?? '');
        const opts = coord ? args.slice(3) : args.slice(2);
        const heightOpt = opts.find(o => o.startsWith('height='));
        instructions.push({
          kind: 'barcode',
          line: lineNo,
          type,
          content,
          height: heightOpt ? parseInt(heightOpt.split('=')[1], 10) : 80,
          x: coord?.x,
          y: coord?.y,
        });
        break;
      }
      case 'text': {
        const coord = parseCoord(args[0]);
        const content = coord ? args.slice(1).join(' ') : args.join(' ');
        instructions.push({ kind: 'text', line: lineNo, content, x: coord?.x, y: coord?.y });
        break;
      }
      case 'raw':
        // ESC/POS: hex 字节；TSPL: 原样指令文本
        instructions.push({ kind: 'raw', line: lineNo, hex: args.join(' ') });
        break;
      case 'print':
        // TSPL: PRINT copies,1；ESC/POS 下忽略
        instructions.push({ kind: 'print', line: lineNo, copies: parseInt(args[0], 10) || 1 });
        break;
      default:
        fail(`未知指令 "@${cmd ?? ''}"`);
    }
  }

  return instructions;
}

// ===== ESC/POS 编译 =====
function compileEscPos(
  instructions: MnemonicInstruction[],
  encoding: 'gbk' | 'utf8',
  lineErrors: { line: number; message: string }[],
): Uint8Array {
  const encoder = new EscPosEncoder().setEncoding(encoding);

  for (const inst of instructions) {
    switch (inst.kind) {
      case 'init': encoder.init(); break;
      case 'align': encoder.align(inst.value); break;
      case 'bold': encoder.bold(inst.value); break;
      case 'underline': encoder.underline(inst.value); break;
      case 'size': encoder.fontSize(inst.w - 1, inst.h - 1); break;
      case 'lineSpacing': encoder.lineSpacing(inst.value); break;
      case 'text': encoder.textLine(inst.content); break;
      case 'feed': encoder.feed(inst.lines); break;
      case 'cut': encoder.cut(inst.full); break;
      case 'buzzer': encoder.buzzer(inst.times, inst.duration); break;
      case 'qr': encoder.qrcode(inst.content, inst.size || 6, inst.level || 'M'); break;
      case 'barcode': encoder.barcode(inst.type, inst.content, { height: inst.height }); break;
      case 'print':
        // ESC/POS 没有单独的打印指令，忽略
        break;
      case 'raw': {
        const { bytes, error } = parseHex(inst.hex);
        if (error) {
          lineErrors.push({ line: inst.line, message: `@raw 解析错误: ${error}` });
        } else if (bytes.length > 0) {
          encoder.raw(bytes);
        }
        break;
      }
    }
  }

  return encoder.flush();
}

// ===== TSPL 编译 =====
// 文本行按流式 TEXT 绘制并推进游标，避免所有元素叠在 y=0
function compileTspl(
  instructions: MnemonicInstruction[],
  encoding: 'gbk' | 'utf8',
  labelConfig: TsplLabelConfig,
): Uint8Array {
  const encoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(labelConfig);

  // 标签初始化序列
  encoder.size(labelConfig.widthMm, labelConfig.heightMm);
  encoder.gap(labelConfig.gapMm);
  encoder.direction(labelConfig.direction);
  encoder.codepage(encoding === 'utf8' ? 'UTF-8' : 'GB18030');
  encoder.cls();

  let alignment: Alignment = 'left';
  let hasPrint = false;

  for (const inst of instructions) {
    switch (inst.kind) {
      case 'init':
        encoder.cls();
        break;
      case 'align':
        alignment = inst.value;
        break;
      case 'text':
        if (inst.x !== undefined && inst.y !== undefined) {
          encoder.text(inst.x, inst.y, '1', inst.content);
        } else {
          encoder.streamText(inst.content, alignment);
        }
        break;
      case 'feed':
        encoder.advance(inst.lines);
        break;
      case 'cut':
        encoder.cut(0);
        break;
      case 'buzzer':
        encoder.sound(Math.min(9, inst.times), Math.min(4095, inst.duration * 10));
        break;
      case 'qr':
        if (inst.x !== undefined && inst.y !== undefined) {
          encoder.qrcode(inst.x, inst.y, inst.content, {
            level: inst.level || 'M',
            cellWidth: Math.max(1, Math.min(10, inst.size || 6)),
          });
        } else {
          encoder.streamQrCode(inst.content, {
            level: inst.level || 'M',
            cellWidth: Math.max(1, Math.min(10, inst.size || 6)),
            alignment,
          });
        }
        break;
      case 'barcode':
        if (inst.x !== undefined && inst.y !== undefined) {
          encoder.barcode(inst.x, inst.y, inst.type, inst.content, { height: inst.height });
        } else {
          encoder.streamBarcode(inst.type, inst.content, {
            height: inst.height,
            alignment,
          });
        }
        break;
      case 'print':
        encoder.print(inst.copies, 1);
        hasPrint = true;
        break;
      case 'raw':
        // TSPL 是文本协议，@raw 原样写入指令文本
        encoder.raw(inst.hex);
        break;
      case 'bold':
      case 'underline':
      case 'lineSpacing':
      case 'size':
        // TSPL 不支持逐行样式，忽略
        break;
    }
  }

  // 用户未显式 @print 时默认打印 1 张
  if (!hasPrint) {
    encoder.print(1, 1);
  }
  return encoder.flush();
}

export function compileMnemonic(
  script: string,
  encoding: 'gbk' | 'utf8' = 'gbk',
  protocol: PrinterProtocol = 'escpos',
  labelConfig: TsplLabelConfig = DEFAULT_LABEL_CONFIG,
): MnemonicCompileResult {
  const lineErrors: { line: number; message: string }[] = [];
  const instructions = parseMnemonic(script, lineErrors);

  // 解析错误存在时不再生成字节流，避免发出半截指令
  if (lineErrors.length > 0) {
    return { bytes: new Uint8Array(0), lineErrors };
  }

  const bytes = protocol === 'tspl'
    ? compileTspl(instructions, encoding, labelConfig)
    : compileEscPos(instructions, encoding, lineErrors);

  return { bytes, lineErrors };
}
