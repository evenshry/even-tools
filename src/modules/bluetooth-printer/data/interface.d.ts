// 蓝牙打印机模块 - 类型定义

// ===== 应用模式 =====
export type AppMode = 'command' | 'designer';

// ===== 指令模式 =====
export type CommandSyntax = 'hex' | 'mnemonic' | 'plaintext';

export interface CommandInput {
  syntax: CommandSyntax;
  raw: string;
  encoding: 'gbk' | 'utf8';
  appendNewline: boolean;
  repeat: number;
}

export type MnemonicInstruction =
  | { kind: 'init' }
  | { kind: 'align'; value: Alignment }
  | { kind: 'bold'; value: boolean }
  | { kind: 'underline'; value: 0 | 1 | 2 }
  | { kind: 'size'; w: number; h: number }
  | { kind: 'lineSpacing'; value: number }
  | { kind: 'text'; content: string }
  | { kind: 'feed'; lines: number }
  | { kind: 'cut'; full: boolean }
  | { kind: 'buzzer'; times: number; duration: number }
  | { kind: 'qr'; content: string; size?: number; level?: QrErrorLevel }
  | { kind: 'barcode'; type: BarcodeType; content: string; height?: number }
  | { kind: 'raw'; hex: string };

// ===== 编辑模式 - 打印元素 =====
export type ElementType = 'text' | 'barcode' | 'qrcode' | 'image' | 'table' | 'divider';
export type Alignment = 'left' | 'center' | 'right';
export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';
export type BarcodeType = 'UPC_A' | 'EAN13' | 'CODE128' | 'CODE39' | 'ITF';

export interface BaseElement {
  id: string;
  type: ElementType;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: 1 | 2 | 3 | 4;
  alignment: Alignment;
  bold: boolean;
  underline: 0 | 1 | 2;
  lineSpacing: number;
  wrap: boolean;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  barcodeType: BarcodeType;
  content: string;
  height: number;
  width: 2 | 3 | 4 | 5 | 6;
  showText: boolean;
  alignment: Alignment;
}

export interface QrCodeElement extends BaseElement {
  type: 'qrcode';
  content: string;
  size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
  errorLevel: QrErrorLevel;
  alignment: Alignment;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  alignment: Alignment;
  dither: 'threshold' | 'floydSteinberg' | 'ordered';
}

export interface TableElement extends BaseElement {
  type: 'table';
  columns: { width: number; header: string }[];
  rows: string[][];
  alignment: Alignment;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  char: string;
}

export type PrintElement =
  | TextElement
  | BarcodeElement
  | QrCodeElement
  | ImageElement
  | TableElement
  | DividerElement;

// ===== 打印任务与历史 =====
export interface PrintJob {
  id: string;
  mode: AppMode;
  elements?: PrintElement[];
  commandInput?: CommandInput;
  compiledBytes?: Uint8Array;
  status: 'pending' | 'sending' | 'success' | 'failed' | 'canceled';
  progress: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  bytesSent?: number;
  totalBytes?: number;
  error?: string;
  deviceId?: string;
  deviceName?: string;
}

export interface PrintHistoryEntry {
  id: string;
  job: PrintJob;
  preview?: string;
}

// ===== 模板与片段 =====
export interface Template {
  id: string;
  name: string;
  description: string;
  elements: PrintElement[];
  variables: string[];
  category: 'receipt' | 'label' | 'ticket' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface CommandSnippet {
  id: string;
  name: string;
  description: string;
  syntax: CommandSyntax;
  content: string;
  category: 'escpos' | 'tspl' | 'common';
}

// ===== 打印机配置 =====
export interface PrinterProfile {
  id: string;
  name: string;
  serviceUuid: string;
  writeCharacteristicUuid: string;
  notifyCharacteristicUuid?: string;
  protocol: 'escpos' | 'tspl';
  paperWidth: 32 | 48 | 72;
  dpi: 203 | 300;
  writeMode: 'withResponse' | 'withoutResponse';
}

// ===== 连接状态 =====
export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

export interface ConnectedDevice {
  id: string;
  name: string;
  rssi?: number;
  batteryLevel?: number;
  profile: PrinterProfile;
  actualServiceUuid?: string;
  actualWriteCharacteristicUuid?: string;
  actualNotifyCharacteristicUuid?: string;
}

export interface SavedDevice {
  id: string;
  name: string;
  profileId: string;
  lastConnectedAt: number;
}

// ===== 打印机状态 =====
export interface PrinterStatus {
  online: boolean;
  paperOut?: boolean;
  coverOpen?: boolean;
  overheated?: boolean;
  error?: string;
}

// ===== 单色位图（图片处理）=====
export interface MonochromeBitmap {
  width: number;
  height: number;
  data: Uint8Array;
}
