// TSPL 指令常量与构建函数
// TSPL（TSC Printer Programming Language）是标签打印机通用指令集
// 参考: TSPL/TSPL2 Programming Manual
//
// 与 ESC/POS 不同：TSPL 是文本协议，每条指令以 \n 结尾
// 大小、位置均以点（dot）为单位，受打印机 DPI 影响
//   203 DPI: 1mm = 8 dots
//   300 DPI: 1mm = 12 dots

import type { BarcodeType, QrErrorLevel } from '../../data/interface';

// 换行符 - TSPL 指令分隔符
export const TSPL_NEWLINE = '\r\n';

// ===== 基础指令 =====

// 标签尺寸设置 SIZE width,height
// 设定标签纸的宽度和高度（单位 mm）
// 注：DPI 由打印机自身配置决定，SIZE 指令不带 DPI 参数
export function cmdSize(widthMm: number, heightMm: number): string {
  return `SIZE ${widthMm} mm,${heightMm} mm${TSPL_NEWLINE}`;
}

// 间隙设置 GAP gapMm,offsetMm
export function cmdGap(gapMm: number, offsetMm: number = 0): string {
  return `GAP ${gapMm} mm,${offsetMm} mm${TSPL_NEWLINE}`;
}

// 黑标设置 BLINE offsetMm
export function cmdBline(blineMm: number): string {
  return `BLINE ${blineMm} mm,0 mm${TSPL_NEWLINE}`;
}

// 打印方向 DIRECTION n (0/1)
export function cmdDirection(n: 0 | 1): string {
  return `DIRECTION ${n}${TSPL_NEWLINE}`;
}

// 参考坐标原点 SHIFT n
export function cmdShift(n: number): string {
  return `SHIFT ${n}${TSPL_NEWLINE}`;
}

// 偏移设置 OFFSET n
export function cmdOffset(n: number): string {
  return `OFFSET ${n} mm${TSPL_NEWLINE}`;
}

// 清除缓冲区 CLS
export const CMD_CLS = `CLS${TSPL_NEWLINE}`;

// 打印标签 PRINT m[,n]
// m=打印张数, n=每张份数
export function cmdPrint(copies: number = 1, quantity: number = 1): string {
  return `PRINT ${copies},${quantity}${TSPL_NEWLINE}`;
}

// 蜂鸣 SOUND level,duration
// level=0-9, duration=1-4095 (×10ms)
export function cmdSound(level: number, duration: number): string {
  return `SOUND ${level & 0xff},${duration & 0xffff}${TSPL_NEWLINE}`;
}

// 切纸 CUT n
export function cmdCut(n: number = 0): string {
  return `CUT ${n}${TSPL_NEWLINE}`;
}

// 回退 BACKFEED n
export function cmdBackfeed(n: number): string {
  return `BACKFEED ${n}${TSPL_NEWLINE}`;
}

// ===== 文本 =====

// TEXT x,y,"font",rotation,x-mul,y-mul,"content"
// font: "1"-"5" 内置点阵字体, "SIMPLIFIED CHINESE" 等
// rotation: 0/90/180/270
// x-mul/y-mul: 1-10 放大倍数
export function cmdText(
  x: number, y: number,
  font: string,
  content: string,
  opts?: {
    rotation?: 0 | 90 | 180 | 270;
    xMul?: number;
    yMul?: number;
  },
): string {
  const rot = opts?.rotation ?? 0;
  const xm = opts?.xMul ?? 1;
  const ym = opts?.yMul ?? 1;
  // 转义内容中的引号和反斜杠
  const escaped = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `TEXT ${x},${y},"${font}",${rot},${xm},${ym},"${escaped}"${TSPL_NEWLINE}`;
}

// 文本块 TEXTBLOCK
// TBLOCK x,y,width,height,spacing,"content"
export function cmdTextBlock(
  x: number, y: number, width: number, height: number,
  content: string, spacing: number = 0,
): string {
  const escaped = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `TBLOCK ${x},${y},${width},${height},${spacing},"${escaped}"${TSPL_NEWLINE}`;
}

// ===== 一维条码 =====

// 条码类型映射
export const BARCODE_TYPE_MAP: Record<BarcodeType, string> = {
  UPC_A: 'UPCA',
  EAN13: 'EAN13',
  CODE128: '128',
  CODE39: '39',
  ITF: 'ITF25',
};

// BAR x,y,"type",height,human-readable,rotation,narrow,wide,"content"
export function cmdBarcode(
  x: number, y: number,
  type: BarcodeType,
  content: string,
  opts?: {
    height?: number;
    readable?: 0 | 1; // 0=不显示文字 1=显示
    rotation?: 0 | 90 | 180 | 270;
    narrow?: number; // 窄元素宽度 (1-10)
    wide?: number; // 宽元素宽度 (1-10)
  },
): string {
  const h = opts?.height ?? 80;
  const r = opts?.readable ?? 1;
  const rot = opts?.rotation ?? 0;
  const n = opts?.narrow ?? 2;
  const w = opts?.wide ?? 4;
  const t = BARCODE_TYPE_MAP[type];
  const escaped = content.replace(/"/g, '\\"');
  return `BARCODE ${x},${y},"${t}",${h},${r},${rot},${n},${w},"${escaped}"${TSPL_NEWLINE}`;
}

// ===== 二维码 =====

// QR 纠错级别映射
export const QR_LEVEL_MAP: Record<QrErrorLevel, string> = {
  L: 'L',
  M: 'M',
  Q: 'Q',
  H: 'H',
};

// QRCODE x,y,ECC-level,cell-width,mode,rotation,"content"
// ECC-level: L/M/Q/H
// cell-width: 1-10
// mode: 0=自动 1=数字 2=字母数字 3=8位字节
export function cmdQrcode(
  x: number, y: number,
  content: string,
  opts?: {
    level?: QrErrorLevel;
    cellWidth?: number;
    mode?: 0 | 1 | 2 | 3;
    rotation?: 0 | 90 | 180 | 270;
  },
): string {
  const lvl = opts?.level ?? 'M';
  const cw = opts?.cellWidth ?? 6;
  const mode = opts?.mode ?? 0;
  const rot = opts?.rotation ?? 0;
  const escaped = content.replace(/"/g, '\\"');
  return `QRCODE ${x},${y},"${lvl}",${cw},${mode},${rot},"${escaped}"${TSPL_NEWLINE}`;
}

// ===== 图形 =====

// 画线 BAR x,y,width,height
export function cmdBar(x: number, y: number, width: number, height: number): string {
  return `BAR ${x},${y},${width},${height}${TSPL_NEWLINE}`;
}

// 画矩形框 BOX x_start,y_start,x_end,y_end,thickness
export function cmdBox(
  xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number = 2,
): string {
  return `BOX ${xStart},${yStart},${xEnd},${yEnd},${thickness}${TSPL_NEWLINE}`;
}

// 画斜线 DMATRIX ...
// 圆/椭圆 CIRCLE ...

// ===== 查询类 (调试时发送，打印机会返回状态) =====

// 查询打印机状态
export const CMD_QUERY_STATUS = `STATUS${TSPL_NEWLINE}`;

// 查询打印机配置
export const CMD_QUERY_CONFIG = `CONFIG${TSPL_NEWLINE}`;

// ===== 字符编码 =====

// CODEPAGE n - 设置字符集
// 常用: 437(US) 850(Latin1) 852(Latin2) 860(葡萄牙) 863(法语) 865(北欧) 1252(Windows Latin1)
//       BIG5(繁中) GB18030(简中) UTF-8
export function cmdCodepage(n: number | string): string {
  return `CODEPAGE ${n}${TSPL_NEWLINE}`;
}

// COUNTRY name - 设置国家代码 (用于字符集选择)
export function cmdCountry(name: string): string {
  return `COUNTRY ${name}${TSPL_NEWLINE}`;
}

// ===== 工具函数 =====

import { textByteLength } from '../gbkEncoder';

// 计算字符串字节长度（用于 TSPL 字符串参数）
export function byteLength(s: string, encoding: 'utf8' | 'gbk'): number {
  return textByteLength(s, encoding);
}
