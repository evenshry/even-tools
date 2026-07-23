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
//   @size 40x30 mm
//   @gap 2
//   @direction 1
//   @cls
//   @text 10,10 "Hello"
//   @qr 10,40 https://example.com size=6 level=M
//   @barcode 10,100 CODE128 "1234567890"
//   @print 1

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

export function parseMnemonic(script: string): MnemonicInstruction[] {
  const lines = script.split('\n');
  const instructions: MnemonicInstruction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // 以 @ 开头的是指令
    if (line.startsWith('@')) {
      const parts = line.slice(1).split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (cmd) {
        case 'init':
          instructions.push({ kind: 'init' });
          break;
        case 'align': {
          const v = ALIGN_MAP[args[0]?.toLowerCase()];
          if (!v) throw new Error(`第 ${i + 1} 行: 未知对齐方式 "${args[0]}"`);
          instructions.push({ kind: 'align', value: v });
          break;
        }
        case 'bold':
          instructions.push({ kind: 'bold', value: args[0]?.toLowerCase() === 'on' });
          break;
        case 'underline':
        case 'ul':
          instructions.push({ kind: 'underline', value: (parseInt(args[0]) || 0) as 0 | 1 | 2 });
          break;
        case 'size': {
          // @size 2x2  (ESC/POS 字号)
          // @size 40x30 mm  (TSPL 标签尺寸)
          const m = args[0]?.match(/^(\d+)x(\d+)$/i);
          if (!m) throw new Error(`第 ${i + 1} 行: 字号格式应为 WxH，如 "2x2"`);
          instructions.push({ kind: 'size', w: parseInt(m[1]), h: parseInt(m[2]) });
          break;
        }
        case 'linespace':
        case 'ls':
          instructions.push({ kind: 'lineSpacing', value: parseInt(args[0]) || 30 });
          break;
        case 'feed':
          instructions.push({ kind: 'feed', lines: parseInt(args[0]) || 1 });
          break;
        case 'cut': {
          const half = args[0]?.toLowerCase() === 'half';
          instructions.push({ kind: 'cut', full: !half });
          break;
        }
        case 'beep':
        case 'buzzer':
          instructions.push({ kind: 'buzzer', times: parseInt(args[0]) || 1, duration: parseInt(args[1]) || 1 });
          break;
        case 'qr':
        case 'qrcode': {
          // @qr <content> size=6 level=M
          // @qr <x>,<y> <content> size=6 level=M  (TSPL 坐标前缀)
          const content = args[0] || '';
          const opts = args.slice(1);
          const sizeOpt = opts.find(o => o.startsWith('size='));
          const levelOpt = opts.find(o => o.startsWith('level='));
          const size = sizeOpt ? parseInt(sizeOpt.split('=')[1]) : 6;
          const level = levelOpt ? QR_LEVEL_MAP[levelOpt.split('=')[1]] : undefined;
          instructions.push({ kind: 'qr', content, size, level });
          break;
        }
        case 'barcode':
        case 'bc': {
          // @barcode <type> <content> height=80
          const type = BARCODE_TYPE_MAP[args[0]?.toUpperCase()] || 'CODE128';
          const content = args[1] || '';
          const opts = args.slice(2);
          const heightOpt = opts.find(o => o.startsWith('height='));
          const height = heightOpt ? parseInt(heightOpt.split('=')[1]) : 80;
          instructions.push({ kind: 'barcode', type, content, height });
          break;
        }
        case 'raw': {
          // @raw 1B 40 1B 61 01  (ESC/POS hex)
          // @raw SIZE 40 mm,30 mm  (TSPL 文本指令)
          const hex = args.join(' ');
          instructions.push({ kind: 'raw', hex });
          break;
        }
        case 'print':
          // TSPL 打印指令 @print [copies]
          // 在 ESC/POS 模式下忽略，TSPL 模式下生成 PRINT 指令
          instructions.push({ kind: 'raw', hex: `__PRINT__${args[0] || '1'}` });
          break;
        case 'cls':
          // TSPL 清除缓冲
          instructions.push({ kind: 'init' });
          break;
        default:
          throw new Error(`第 ${i + 1} 行: 未知指令 "@${cmd}"`);
      }
    } else {
      // 普通文本行
      instructions.push({ kind: 'text', content: rawLine });
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
      case 'raw': {
        // TSPL @print 标记在 ESC/POS 模式下忽略
        if (inst.hex.startsWith('__PRINT__')) break;
        const { bytes, error } = parseHex(inst.hex);
        if (error) {
          lineErrors.push({ line: 0, message: `@raw 解析错误: ${error}` });
        } else {
          encoder.raw(bytes);
        }
        break;
      }
    }
  }

  return encoder.flush();
}

// ===== TSPL 编译 =====
// TSPL 模式下，文本行被当作 TEXT 指令处理（流式布局）
function compileTspl(
  instructions: MnemonicInstruction[],
  encoding: 'gbk' | 'utf8',
  labelConfig: TsplLabelConfig,
  lineErrors: { line: number; message: string }[],
): Uint8Array {
  void lineErrors; // 错误通过 push 写入，但 TSPL 模式下目前无生成错误的路径
  const encoder = new TsplEncoder()
    .setEncoding(encoding)
    .setLabelConfig(labelConfig);

  // 标签初始化序列
  encoder.size(labelConfig.widthMm, labelConfig.heightMm);
  encoder.gap(labelConfig.gapMm);
  encoder.direction(labelConfig.direction);
  encoder.codepage(encoding === 'utf8' ? 'UTF-8' : 'GB18030');
  encoder.cls();

  for (const inst of instructions) {
    switch (inst.kind) {
      case 'init':
        // TSPL 的"初始化"等价于 CLS
        encoder.cls();
        break;
      case 'text':
        // 文本行作为流式 TEXT 添加
        encoder.raw(`TEXT 10,${encoder.getCursorY()},"1",0,1,1,"${inst.content.replace(/"/g, '\\"')}"`);
        break;
      case 'align':
        // TSPL 中对齐通过坐标实现，流式布局中暂忽略
        break;
      case 'bold':
        // TSPL 通过字体放大模拟加粗，暂忽略
        break;
      case 'size':
        // TSPL 模式下 size 用于标签尺寸（已在初始化处理），此处忽略
        break;
      case 'feed':
        // TSPL 无 feed 概念，仅推进游标
        encoder.raw(`REM feed ${inst.lines}`);
        break;
      case 'cut':
        encoder.cut(0);
        break;
      case 'buzzer':
        encoder.sound(Math.min(9, inst.times), Math.min(4095, inst.duration * 10));
        break;
      case 'qr':
        encoder.qrcode(0, encoder.getCursorY(), inst.content, {
          level: inst.level || 'M',
          cellWidth: Math.max(1, Math.min(10, inst.size || 6)),
        });
        break;
      case 'barcode':
        encoder.barcode(0, encoder.getCursorY(), inst.type, inst.content, {
          height: inst.height,
        });
        break;
      case 'raw': {
        // @print 特殊标记 -> PRINT 指令
        if (inst.hex.startsWith('__PRINT__')) {
          const copies = parseInt(inst.hex.slice('__PRINT__'.length)) || 1;
          encoder.print(copies, 1);
          break;
        }
        // @raw 在 TSPL 模式下：尝试解析为 hex，失败则当作文本指令原样写入
        const { bytes, error } = parseHex(inst.hex);
        if (error) {
          // 不是 hex，当作 TSPL 文本指令原样写入
          encoder.raw(inst.hex);
        } else {
          const rawText = new TextDecoder().decode(bytes);
          encoder.raw(rawText);
        }
        break;
      }
      case 'underline':
      case 'lineSpacing':
        // TSPL 不直接支持，忽略
        break;
    }
  }

  // 若用户未显式 @print，则默认打印 1 张
  const text = encoder.getText();
  if (!text.includes('PRINT')) {
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
  let instructions: MnemonicInstruction[] = [];

  try {
    instructions = parseMnemonic(script);
  } catch (e) {
    const msg = (e as Error).message;
    const lineMatch = msg.match(/第 (\d+) 行/);
    const line = lineMatch ? parseInt(lineMatch[1]) : 0;
    lineErrors.push({ line, message: msg });
    return { bytes: new Uint8Array(0), lineErrors };
  }

  let bytes: Uint8Array;
  if (protocol === 'tspl') {
    bytes = compileTspl(instructions, encoding, labelConfig, lineErrors);
  } else {
    bytes = compileEscPos(instructions, encoding, lineErrors);
  }

  return { bytes, lineErrors };
}
