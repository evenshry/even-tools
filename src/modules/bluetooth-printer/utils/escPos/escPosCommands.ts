// ESC/POS 指令常量表
// 参考: https://escpos.readthedocs.io/

export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

// 初始化打印机
export const CMD_INIT = [ESC, 0x40];

// 对齐 n=0左/1中/2右
export const cmdAlign = (n: 0 | 1 | 2): number[] => [ESC, 0x61, n];

// 加粗 n=0关/1开
export const cmdBold = (n: 0 | 1): number[] => [ESC, 0x45, n];

// 下划线 n=0关/1单线/2双线
export const cmdUnderline = (n: 0 | 1 | 2): number[] => [ESC, 0x2d, n];

// 字号 w/h 0-7，高4位宽低4位高
export const cmdFontSize = (w: number, h: number): number[] => [GS, 0x21, ((w & 0x0f) << 4) | (h & 0x0f)];

// 行间距 n 点数 (0-255)
export const cmdLineSpacing = (n: number): number[] => [ESC, 0x33, n & 0xff];

// 默认行间距
export const CMD_DEFAULT_LINE_SPACING = [ESC, 0x32];

// 走纸 n 行
export const cmdFeed = (n: number): number[] => [ESC, 0x64, n & 0xff];

// 走纸 n 点
export const cmdFeedDots = (n: number): number[] => [GS, 0x4a, n & 0xff];

// 切纸 0=全切 1=半切
export const cmdCut = (full: boolean = true): number[] => [GS, 0x56, full ? 0x00 : 0x01];

// 蜂鸣 n 次数 t 时长(×100ms)
export const cmdBuzzer = (times: number, duration: number): number[] =>
  [ESC, 0x42, times & 0xff, duration & 0xff];

// 一维条码
// m: 0=UPC-A 2=EAN13 73=CODE128 4=CODE39 5=ITF
export const BARCODE_TYPE_MAP = {
  UPC_A: 0,
  EAN13: 2,
  CODE39: 4,
  ITF: 5,
  CODE128: 73,
} as const;

// 条码高度 (点)
export const cmdBarcodeHeight = (n: number): number[] => [GS, 0x68, n & 0xff];

// 条码宽度 2-6
export const cmdBarcodeWidth = (n: number): number[] => [GS, 0x77, n & 0xff];

// 是否打印条码下方文字 n=0不打印 1打印
export const cmdBarcodeText = (n: 0 | 1): number[] => [GS, 0x48, n];

// 打印条码
export const cmdBarcode = (m: number, data: number[]): number[] => [GS, 0x6b, m, data.length, ...data];

// 二维码相关 (GS ( k)
// 设置 QR 模型: 1=Model1 2=Model2
export const cmdQrModel = (n: 1 | 2): number[] => [GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, n];

// 设置 QR 纠错级别 n=48(L) 49(M) 50(Q) 51(H)
export const QR_LEVEL_MAP = { L: 48, M: 49, Q: 50, H: 51 } as const;
export const cmdQrLevel = (n: number): number[] => [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, n];

// 设置 QR 模块大小 n=1-16
export const cmdQrSize = (n: number): number[] => [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, n & 0xff];

// 存储 QR 数据 (pL pH ...数据)
export const cmdQrData = (data: number[]): number[] => {
  const len = data.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  return [GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data];
};

// 打印存储的 QR
export const CMD_QR_PRINT = [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30];

// 位图 1D v 1 m xL xH yL yH d1...dk
export const cmdImage = (width: number, height: number, data: number[]): number[] => {
  const xL = width & 0xff;
  const xH = (width >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  return [GS, 0x76, 0x31, 0x00, xL, xH, yL, yH, ...data];
};
