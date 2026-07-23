# 蓝牙打印机工具 - 设计文档

> 模块路径：`src/modules/bluetooth-printer/`
> 路由：`/bluetooth-printer`
> 分类：硬件工具

## 1. 概述

一个基于 Web Bluetooth API 的浏览器内蓝牙打印机工具，提供**两种工作模式**：

- **指令模式（Command Mode）**：直接输入原始指令或助记符脚本，"发送即打印"。适合调试打印机、快速测试指令、复现问题。
- **编辑模式（Designer Mode）**：可视化编辑打印内容（文本、条码、二维码、图片、表格），实时预览，再编码下发。适合设计小票/标签模板。

两种模式共享同一套设备连接、协议适配器、打印队列与历史记录基础设施，仅"内容来源"不同：

```
                     ┌───────────────────────┐
                     │   设备连接 / 队列 / 历史  │  (共享)
                     └───────────┬───────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │                                         │
   ┌────────▼─────────┐                    ┌──────────▼──────────┐
   │   指令模式         │                    │   编辑模式            │
   │  - Hex 输入        │                    │  - 元素拖拽编辑       │
   │  - 助记符脚本      │                    │  - 实时预览           │
   │  - 纯文本          │                    │  - 模板系统           │
   │  → Uint8Array     │                    │  → PrintElement[]    │
   └────────┬─────────┘                    └──────────┬──────────┘
            │                                         │
            └────────────────────┬────────────────────┘
                                 │
                        ProtocolAdapter / 直接发送
                                 │
                                 ▼
                            蓝牙打印机
```

核心能力：

- 扫描并连接 BLE 热敏/标签打印机
- 指令模式：Hex / 助记符 / 纯文本 三种输入语法
- 编辑模式：可视化元素编辑 + 实时预览
- 通过 ESC/POS、TSPL 等协议向打印机发送指令
- 模板保存与复用、打印历史记录

## 2. 技术背景

### 2.1 Web Bluetooth API

浏览器原生 BLE 通信能力，关键约束：

- 仅 Chrome / Edge / Opera 等基于 Chromium 的浏览器支持（Safari / Firefox 不支持）
- 必须 HTTPS 或 `localhost` 环境
- 必须由用户手势触发（点击按钮）才能发起设备选择
- 通信基于 GATT 协议，通过 Service + Characteristic 收发数据

核心 API：

```ts
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: [PRINTER_SERVICE_UUID] }],
  optionalServices: [PRINTER_SERVICE_UUID],
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
const characteristic = await service.getCharacteristic(WRITE_CHAR_UUID);
await characteristic.writeValueWithResponse(data); // 或 writeValueWithoutResponse
```

### 2.2 常见打印机 BLE Service UUID

| UUID | 厂商/类型 | 备注 |
|------|----------|------|
| `000018f0-0000-1000-8000-00805f9b34fb` | 通用 BLE 热敏打印机 | 写特征 `00002af1`，通知特征 `00002af0` |
| `00001101-0000-1000-8000-00805f9b34fb` | SPP over BLE | 部分老式打印机 |
| `49535343-fe7d-4ae5-8fa9-9fafd205e455` | 微型便携打印机 | 写特征 `49535343-8841-43f4-a8d4-ecbe34729bb3` |
| `e7810a71-73ae-499d-8c15-faa9aef0c3f2` | 部分标签打印机 | TSPL 协议 |

工具默认使用通用 UUID，并提供"高级模式"允许用户手动输入 UUID。

### 2.3 打印协议

工具采用协议适配器模式，初期实现：

- **ESC/POS**：热敏小票打印机事实标准（EPSON），覆盖 80%+ 的 BLE 热敏打印机
- **TSPL/TSPL2**：标签打印机（立象、汉印、佳博等）

后续可扩展：CPCL、ZPL。

### 2.4 ESC/POS 常用指令

| 功能 | 指令 (Hex) | 说明 |
|------|-----------|------|
| 初始化 | `1B 40` | 复位打印机 |
| 对齐 | `1B 61 n` | n=0左 / 1中 / 2右 |
| 加粗 | `1B 45 n` | n=0关 / 1开 |
| 下划线 | `1C 2D n` | n=0关 / 1单线 / 2双线 |
| 字号 | `1D 21 n` | 高 4 位宽，低 4 位高 |
| 走纸 | `1B 64 n` | 走 n 行 |
| 切纸 | `1D 56 00` | 全切 |
| 蜂鸣 | `1B 42 n t` | n 次数，t 时长 |
| 一维条码 | `1D 6B m n d...` | CODE128/EAN13 等 |
| 二维码 | `1D 28 6B ...` | 多段组合 |
| 位图 | `1D 76 31 m xL xH yL yH d...` | 单色位图 |

## 3. 功能特性

### 3.0 双模式总览

| 维度 | 指令模式 Command Mode | 编辑模式 Designer Mode |
|------|----------------------|----------------------|
| 目标用户 | 开发者 / 调试场景 | 普通用户 / 模板设计场景 |
| 输入形式 | 文本（Hex / 助记符 / 纯文本） | 可视化元素拖拽 |
| 输出形式 | `Uint8Array`（原样下发） | `PrintElement[]` → 协议编码 |
| 实时预览 | 不预览（直接发） | 模拟纸张渲染 |
| 协议处理 | 不经过 Adapter，用户全权控制 | 走 ProtocolAdapter |
| 适用场景 | 调试指令、复现 bug、测试新打印机 | 设计小票、生成模板、日常打印 |

### 3.1 共享核心功能（MVP）

- [F1] BLE 设备扫描与连接（含断线重连、设备记忆）
- [F2] 打印队列（异步、断点续传）
- [F3] 打印历史记录（IndexedDB 持久化）
- [F4] ESC/POS 协议编码与发送（编辑模式使用）
- [F5] 模式切换（顶部 Segmented 控件，状态持久化到 localStorage）

### 3.2 指令模式功能

- [C1] **Hex 输入**：`1B 40 1B 61 01 48 65 6C 6C 6F 1D 56 00`（支持空格/换行/`0x`前缀/无分隔符）
- [C2] **助记符脚本**：自定义 DSL，自动编译为字节流
  ```
  @init
  @align center
  @bold on
  @size 2x2
  Hello World
  @bold off
  @align left
  @qr https://example.com size=6
  @feed 3
  @cut
  ```
- [C3] **纯文本模式**：直接发送文本字节（按选定编码 GBK/UTF-8），可选末尾自动加 `\n`
- [C4] **指令片段库**：常用指令一键插入（初始化、切纸、走纸、对齐、二维码模板等）
- [C5] **历史指令回放**：从历史记录中复用之前发送过的指令
- [C6] **字节预览**：发送前显示解析后的字节预览（hex dump 视图），可手动编辑
- [C7] **批量发送**：同一脚本可设置"重复 N 次"，用于压力测试

### 3.3 编辑模式功能

- [D1] 打印内容编辑器：文本（多字体/对齐/加粗）、二维码、条码
- [D2] 实时预览（模拟打印纸渲染）
- [D3] 图片打印（图片转单色位图，dithering 算法）
- [D4] 表格打印（多列对齐、自动换行）
- [D5] 模板系统（保存/加载/参数化模板）
- [D6] TSPL 协议适配器（标签打印机）
- [D7] 打印机状态监控（缺纸、过热、盖开等，通过 notify 特征）
- [D8] 批量打印（CSV 数据源 + 模板循环渲染）

## 4. 目录结构

```
src/modules/bluetooth-printer/
├── components/
│   ├── DeviceConnectionPanel.tsx    # 设备连接面板（扫描/连接/状态）- 共享
│   ├── ModeSwitcher.tsx             # 顶部模式切换控件 - 共享
│   ├── PrintHistory.tsx             # 打印历史 - 共享
│   ├── PrinterSettings.tsx          # 打印机参数设置 - 共享
│   │
│   ├── command/                     # ===== 指令模式专用 =====
│   │   ├── CommandEditor.tsx        # 指令输入主编辑器（含语法切换）
│   │   ├── HexPreview.tsx           # 字节 hex dump 预览（可编辑）
│   │   ├── SnippetLibrary.tsx       # 指令片段库面板
│   │   └── CommandToolbar.tsx       # 发送/重复/编码选择工具栏
│   │
│   └── designer/                    # ===== 编辑模式专用 =====
│       ├── PrintEditor.tsx          # 打印内容编辑器（拖拽排序）
│       ├── PrintElementRenderer.tsx # 单个元素编辑卡片
│       ├── PrintPreview.tsx         # 打印预览（模拟纸张）
│       ├── TemplateLibrary.tsx      # 模板库面板
│       └── ElementToolbar.tsx       # 元素操作工具栏
│
├── data/
│   ├── interface.d.ts               # 类型定义（含 AppMode）
│   ├── templates.ts                 # 内置模板（小票、标签等）- 编辑模式
│   ├── snippets.ts                  # 指令片段预设 - 指令模式
│   ├── printerProfiles.ts           # 打印机预设配置
│   └── paperSizes.ts                # 纸张规格（58mm/80mm 等）
├── hooks/
│   ├── useBluetoothPrinter.ts       # 蓝牙连接生命周期 hook - 共享
│   ├── usePrintQueue.ts             # 打印队列 hook - 共享
│   ├── usePrintPreview.ts           # 预览渲染 hook - 编辑模式
│   └── useCommandCompiler.ts        # 指令脚本编译 hook - 指令模式
├── store/
│   └── usePrinterStore.ts           # Zustand 全局状态（含 mode 字段）
├── utils/
│   ├── bluetoothAdapter.ts          # Web Bluetooth 适配层 - 共享
│   ├── escPos/
│   │   ├── escPosEncoder.ts         # ESC/POS 编码器（编辑模式 + 助记符复用）
│   │   ├── escPosCommands.ts        # 指令常量表
│   │   └── qrEncoder.ts             # QR 码专用编码
│   ├── tspl/
│   │   └── tsplEncoder.ts           # TSPL 编码器
│   ├── command/
│   │   ├── hexParser.ts             # Hex 字符串 → Uint8Array
│   │   ├── mnemonicCompiler.ts      # 助记符 DSL → Uint8Array（复用 escPosEncoder）
│   │   ├── plainTextEncoder.ts      # 纯文本 → Uint8Array（GBK/UTF-8）
│   │   └── hexDump.ts               # Uint8Array → hex dump 字符串
│   ├── imageProcessor.ts            # 图片转单色位图（dithering）
│   ├── templateEngine.ts            # 模板变量替换
│   └── dataChunker.ts               # 大数据分片发送
├── BluetoothPrinter.scss
├── BluetoothPrinter.tsx
├── index.ts
└── design.md
```

## 5. 数据模型

### 5.0 应用模式与指令输入

```ts
// 应用工作模式
export type AppMode = 'command' | 'designer';

// 指令模式支持的输入语法
export type CommandSyntax = 'hex' | 'mnemonic' | 'plaintext';

// 指令模式的输入状态
export interface CommandInput {
  syntax: CommandSyntax;
  raw: string;                       // 用户输入的原始文本
  encoding: 'gbk' | 'utf8';          // plaintext 模式编码
  appendNewline: boolean;            // plaintext 模式末尾加 \n
  repeat: number;                    // 重复发送次数（默认 1）
}

// 助记符 DSL 支持的指令集（mnemonicCompiler 解析）
export type MnemonicInstruction =
  | { kind: 'init' }                                  // @init
  | { kind: 'align'; value: Alignment }               // @align left|center|right
  | { kind: 'bold'; value: boolean }                  // @bold on|off
  | { kind: 'underline'; value: 0 | 1 | 2 }           // @underline 0|1|2
  | { kind: 'size'; w: number; h: number }            // @size 2x2
  | { kind: 'lineSpacing'; value: number }            // @linespace n
  | { kind: 'text'; content: string }                 // 普通行
  | { kind: 'feed'; lines: number }                   // @feed n
  | { kind: 'cut'; full: boolean }                    // @cut | @cut half
  | { kind: 'buzzer'; times: number; duration: number }// @beep n t
  | { kind: 'qr'; content: string; size?: number; level?: 'L'|'M'|'Q'|'H' } // @qr ...
  | { kind: 'barcode'; type: string; content: string; height?: number }     // @barcode ...
  | { kind: 'raw'; hex: string };                     // @raw 1B 40 （直接嵌入 hex）
```

### 5.1 打印元素（PrintElement）

```ts
// src/modules/bluetooth-printer/data/interface.d.ts

export type ElementType = 'text' | 'barcode' | 'qrcode' | 'image' | 'table' | 'divider';

export type Alignment = 'left' | 'center' | 'right';

export interface BaseElement {
  id: string;
  type: ElementType;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: 1 | 2 | 3 | 4;        // ESC/POS 字号倍数
  alignment: Alignment;
  bold: boolean;
  underline: 0 | 1 | 2;
  lineSpacing: number;             // 行间距 (0-255)
  wrap: boolean;                   // 自动换行
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  barcodeType: 'UPC_A' | 'EAN13' | 'CODE128' | 'CODE39' | 'ITF';
  content: string;
  height: number;                  // 点数
  width: 2 | 3 | 4 | 5 | 6;
  showText: boolean;
  alignment: Alignment;
}

export interface QrCodeElement extends BaseElement {
  type: 'qrcode';
  content: string;
  size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
  errorLevel: 'L' | 'M' | 'Q' | 'H';
  alignment: Alignment;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;                     // dataURL
  width: number;                   // 像素
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
  char: string;                    // 默认 '-'
}

export type PrintElement =
  | TextElement | BarcodeElement | QrCodeElement
  | ImageElement | TableElement | DividerElement;
```

### 5.2 打印任务与历史

```ts
// 任务来源：指令模式 或 编辑模式
export interface PrintJob {
  id: string;
  mode: AppMode;                   // 区分来源
  // 仅 designer 模式填充：
  elements?: PrintElement[];
  // 仅 command 模式填充：
  commandInput?: CommandInput;
  compiledBytes?: Uint8Array;      // 指令模式编译后的字节（用于历史回放）

  status: 'pending' | 'sending' | 'success' | 'failed' | 'canceled';
  progress: number;                // 0-100
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
  preview?: string;                // 编辑模式有预览图；指令模式可为空
}

export interface Template {
  id: string;
  name: string;
  description: string;
  elements: PrintElement[];          // 编辑模式模板
  variables: string[];             // 可替换变量 {{var}}
  category: 'receipt' | 'label' | 'ticket' | 'custom';
  createdAt: number;
  updatedAt: number;
}

// 指令模式的"片段库"条目
export interface CommandSnippet {
  id: string;
  name: string;                    // 显示名（如"初始化打印机"）
  description: string;
  syntax: CommandSyntax;           // hex / mnemonic / plaintext
  content: string;                 // 模板内容
  category: 'escpos' | 'tspl' | 'common';
}

export interface PrinterProfile {
  id: string;
  name: string;                    // 友好名（如"佳博 GP-C801"）
  serviceUuid: string;
  writeCharacteristicUuid: string;
  notifyCharacteristicUuid?: string;
  protocol: 'escpos' | 'tspl';
  paperWidth: 32 | 48 | 72;        // 58mm=32 / 80mm=48 / 标签=72（8dot/mm）
  dpi: 203 | 300;
  writeMode: 'withResponse' | 'withoutResponse';
}
```

### 5.3 连接状态

```ts
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
  server: BluetoothRemoteGATTServer;  // 不入 store，仅运行时引用
}
```

## 6. 状态管理（Zustand Store）

```ts
interface PrinterStore {
  // ===== 模式 =====
  mode: AppMode;                      // 'command' | 'designer'
  setMode: (mode: AppMode) => void;

  // ===== 设备（共享） =====
  connectionState: ConnectionState;
  connectedDevice: ConnectedDevice | null;
  savedDevices: SavedDevice[];
  profile: PrinterProfile;

  // ===== 指令模式状态 =====
  commandInput: CommandInput;
  setCommandInput: (patch: Partial<CommandInput>) => void;
  compiledBytes: Uint8Array | null;   // 编译预览
  setCompiledBytes: (bytes: Uint8Array | null) => void;

  // ===== 编辑模式状态 =====
  elements: PrintElement[];
  selectedElementId: string | null;
  addElement: (element: PrintElement) => void;
  updateElement: (id: string, patch: Partial<PrintElement>) => void;
  removeElement: (id: string) => void;
  reorderElements: (from: number, to: number) => void;

  // ===== 队列（共享） =====
  queue: PrintJob[];
  currentJob: PrintJob | null;
  enqueueCommand: () => Promise<void>;   // 指令模式入队
  enqueueDesign: () => Promise<void>;    // 编辑模式入队
  cancelJob: (jobId: string) => void;

  // ===== 历史 / 模板 / 片段（共享） =====
  history: PrintHistoryEntry[];
  templates: Template[];
  snippets: CommandSnippet[];
  loadHistory: () => Promise<void>;
  saveAsTemplate: (name: string) => Promise<void>;
  loadTemplate: (id: string) => void;
  saveAsSnippet: (name: string) => Promise<void>;
  loadSnippet: (id: string) => void;

  // ===== 设备 Actions（共享） =====
  connect: (profile?: PrinterProfile) => Promise<void>;
  disconnect: () => Promise<void>;
}
```

**注意**：`BluetoothRemoteGATTServer` 等运行时对象不存入 Zustand（不可序列化），改用 `useRef` 在 `useBluetoothPrinter` hook 内持有。

## 7. 核心模块设计

### 7.1 BluetoothAdapter（适配层）

封装 Web Bluetooth API，向上提供稳定的 Promise 化接口。

```ts
// utils/bluetoothAdapter.ts
export class BluetoothAdapter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async requestDevice(profile: PrinterProfile): Promise<BluetoothDevice> { /* ... */ }
  async connect(device: BluetoothDevice): Promise<void> { /* ... */ }
  async write(data: Uint8Array, mode: 'withResponse' | 'withoutResponse'): Promise<void> {
    // 大数据分片：单包 MTU 内，默认 200 字节/包，间隔 20ms
  }
  async subscribeStatus(callback: (status: PrinterStatus) => void): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  onDisconnected: ((device: BluetoothDevice) => void) | null = null;
}
```

**关键设计**：

- 大数据自动分片：BLE 单包最大约 185~244 字节，模块默认每包 200 字节 + 20ms 间隔，避免打印机缓冲区溢出
- 断线监听：`device.addEventListener('gattserverdisconnected', ...)`
- 写模式可配置：`writeValueWithResponse`（可靠）或 `writeValueWithoutResponse`（快速）

### 7.2 ESC/POS Encoder

```ts
// utils/escPos/escPosEncoder.ts
export class EscPosEncoder {
  private buffer: number[] = [];

  init(): this                              // 1B 40
  setAlign(align: Alignment): this         // 1B 61 n
  setBold(on: boolean): this                // 1B 45 n
  setUnderline(n: 0|1|2): this              // 1C 2D n
  setFontSize(w: number, h: number): this   // 1D 21 n
  setLineSpacing(n: number): this           // 1B 33 n
  text(s: string, encoding?: 'gbk'|'utf8'): this
  feed(n: number): this                     // 1B 64 n
  cut(full: boolean = true): this           // 1D 56 00|01
  buzzer(times: number, duration: number): this
  barcode(type, content, opts): this
  qrcode(content, size, errorLevel): this   // 1D 28 6B 多段
  image(bitmap: MonochromeBitmap, align: Alignment): this  // 1D 76 31
  divider(char: string): this
  flush(): Uint8Array
}
```

**关键设计**：

- 中文编码：默认 GBK（多数热敏打印机内置 GBK 字库），可通过参数切换 UTF-8
- 二维码编码：调用 `qr-code-generator` 算法生成矩阵后转 ESC/POS 多段命令
- 位图编码：接收单色位图对象（来自 `imageProcessor`），按行打包为 `1D 76 31` 格式

### 7.3 协议适配器接口

```ts
export interface PrinterProtocolAdapter {
  encode(elements: PrintElement[], profile: PrinterProfile): Uint8Array;
  queryStatus?(): Uint8Array;
  cancelJob?(): Uint8Array;
}

export class EscPosAdapter implements PrinterProtocolAdapter { /* ... */ }
export class TsplAdapter implements PrinterProtocolAdapter { /* ... */ }

export function getAdapter(protocol: 'escpos' | 'tspl'): PrinterProtocolAdapter {
  switch (protocol) {
    case 'escpos': return new EscPosAdapter();
    case 'tspl': return new TsplAdapter();
  }
}
```

### 7.4 打印队列

```ts
// hooks/usePrintQueue.ts
export function usePrintQueue() {
  const runJob = useCallback(async (job: PrintJob) => {
    const adapter = getAdapter(job.protocol);
    const data = adapter.encode(job.elements, profile);
    // 分片发送，更新 job.progress
    // 失败重试 3 次，间隔 1s
    // 成功后写入历史，从队列移除
  }, []);

  useEffect(() => {
    // 队列消费循环：当 queue 非空且无 currentJob 时取出执行
  }, [queue, currentJob]);

  return { enqueue, cancel, retry };
}
```

### 7.5 图片处理

```ts
// utils/imageProcessor.ts
export interface MonochromeBitmap {
  width: number;
  height: number;
  data: Uint8Array;        // 每行 width/8 字节，按行存储
}

export async function imageToMonochrome(
  src: string,              // dataURL
  targetWidth: number,      // 通常等于 paperWidth * 8
  dither: 'threshold' | 'floydSteinberg' | 'ordered',
): Promise<MonochromeBitmap> {
  // 1. canvas 加载图片
  // 2. 等比缩放到 targetWidth
  // 3. 灰度化（加权平均）
  // 4. 二值化（阈值/抖动）
  // 5. 打包为单色位图
}
```

## 8. UI 设计

### 8.1 整体布局

顶部全局区域 + 模式动态主体：

```
┌─────────────────────────────────────────────────────────────┐
│  ModuleHeader: 蓝牙打印机                                    │
├─────────────────────────────────────────────────────────────┤
│  [设备: 佳博 GP-C801 ●已连接]  [⚙ 打印机设置]                │
│  [指令模式] [编辑模式]  ← Segmented 模式切换                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ===== 指令模式 Command Mode =====                          │
│  ┌──────────────────────────────────────┬─────────────────┐ │
│  │ 指令编辑器                            │  Hex 字节预览    │ │
│  │ [Hex|Mnemonic|PlainText] 语法切换     │  0000  1B 40 ... │ │
│  │ ┌──────────────────────────────────┐ │  0010  1B 61 01  │ │
│  │ │ @init                            │ │  0020  48 65 6C  │ │
│  │ │ @align center                    │ │  ...             │ │
│  │ │ @size 2x2                        │ │                  │ │
│  │ │ Hello World                      │ │  共 48 字节      │ │
│  │ │ @qr https://example.com          │ │                  │ │
│  │ │ @cut                             │ │  [指令片段库 ▼]  │ │
│  │ └──────────────────────────────────┘ │                  │ │
│  │ 编码: [GBK▼] 重复: [1] [✓末尾换行]   │                  │ │
│  │            [清空] [发送打印]          │                  │ │
│  └──────────────────────────────────────┴─────────────────┘ │
│                                                             │
│  ===== 编辑模式 Designer Mode =====                         │
│  ┌──────────────┬──────────────────────────┬───────────────┐ │
│  │ 设备连接     │  打印内容编辑器           │  打印预览      │ │
│  │ DeviceConn  │  PrintEditor             │  PrintPreview │ │
│  │ - 状态       │  ┌────────────────────┐  │ ┌─────────┐  │ │
│  │ - 设备信息   │  │ [文本] 商店名称      │  │ │ 商店名称 │  │ │
│  │ - 断开       │  │ [表格] 商品列表      │  │ ├─────────┤  │ │
│  │              │  │ [二维码] 关注我们    │  │ │ ▓▓▓▓▓▓▓ │  │ │
│  │ 打印机设置   │  └────────────────────┘  │ └─────────┘  │ │
│  │ - 纸张宽度   │  [+ 添加元素]            │   [打印]      │ │
│  └──────────────┴──────────────────────────┴───────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Tabs: 打印历史 | 打印队列 | (编辑模式: 模板库)              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 关键交互

**模式切换**：
- 顶部 Antd `Segmented` 控件切换 `指令模式 / 编辑模式`
- 切换不影响设备连接状态、队列、历史
- 当前模式持久化到 `localStorage`，下次进入保持

**指令模式**：
- 语法切换 Tab，编辑器内容保留（每种语法独立缓存）
- 输入时实时编译为字节流，右侧 hex 预览同步刷新（debounce 200ms）
- 片段库点击插入到光标位置
- 发送按钮禁用条件 = 未连接 / 编译失败 / 内容为空

**编辑模式**：
- 设备连接：点击"扫描"按钮 → 弹出浏览器原生选择器 → 选择后自动连接
- 元素编辑：左侧拖拽排序、点击选中、双击编辑文本、右侧属性面板
- 预览：随元素变化实时重渲染（debounce 200ms），按纸张宽度缩放显示
- 打印按钮禁用条件 = 未连接 / 队列非空 / 元素为空

**打印反馈**（共享）：进度条 + 状态文字（"发送中 65%" / "成功" / "失败：缺纸"）

### 8.3 组件复用

复用项目现有组件：

- `ModuleHeader`：模块标题
- `BackButton`：返回首页
- Antd：`Card`、`Button`、`Tabs`、`Form`、`Table`、`Modal`、`message`

## 9. 使用流程

### 9.1 首次使用（公共）

1. 用户从首页进入 `/bluetooth-printer`
2. 浏览器检测：若不支持 Web Bluetooth，显示引导提示（推荐 Chrome / Edge）
3. 用户点击"扫描设备"→ 选择打印机 → 自动连接（默认 ESC/POS + 80mm）
4. 默认进入指令模式（开发者优先），可切换到编辑模式

### 9.2 指令模式使用

**场景 A：测试切纸指令**
1. 切到 Hex 语法
2. 输入 `1D 56 00`
3. 右侧 hex 预览显示 3 字节
4. 点击"发送打印"→ 打印机切纸

**场景 B：用助记符打印小票**
1. 切到 Mnemonic 语法
2. 输入：
   ```
   @init
   @align center
   @size 2x2
   My Shop
   @size 1x1
   @align left
   @feed 1
   Total: $9.99
   @feed 3
   @cut
   ```
3. hex 预览确认字节正确
4. 点击"发送打印"→ 打印机出票

**场景 C：纯文本快速打印**
1. 切到 PlainText 语法，选择 UTF-8 编码
2. 输入 `Hello, 打印机！`
3. 点击"发送打印"

### 9.3 编辑模式使用

1. 切到编辑模式
2. 从模板库加载"通用小票"模板
3. 编辑文本内容（店名、商品、价格等）
4. 预览确认 → 点击"打印"→ 实际出票

### 9.4 高级使用

1. 自定义模板 → 保存为模板（编辑模式）
2. 自定义指令片段 → 保存为片段（指令模式）
3. 上传 Logo 图片 → 自动转单色位图 → 插入到小票头（编辑模式）
4. 批量打印 → 导入 CSV → 选择模板 → 循环渲染并发送（编辑模式）
5. 指令压力测试 → 设置"重复 N 次" → 测试打印机缓冲表现（指令模式）

## 10. 兼容性与限制

| 项目 | 支持情况 |
|------|---------|
| Chrome 桌面版 (Win/Mac/Linux) | ✅ 完整支持 |
| Edge 桌面版 | ✅ 完整支持 |
| Chrome Android | ✅ 支持（移动场景常用） |
| Safari (Mac/iOS) | ❌ 不支持 |
| Firefox | ❌ 不支持 |
| HTTP 部署 | ❌ 必须 HTTPS 或 localhost |

**已知限制**：

- 同一时间只能连接一台打印机（BLE 协议限制）
- 单次发送数据建议 < 20KB（大图需分批）
- 不同打印机对 ESC/POS 兼容度不同，部分指令可能无效（如切纸、蜂鸣）
- iOS 用户无法使用（受限于 Safari 不支持 Web Bluetooth）

## 11. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 浏览器不支持 | 用户无法使用 | 进入页面立即检测 `navigator.bluetooth`，明确提示 |
| 打印机 UUID 不标准 | 连接失败 | 提供"自定义 UUID"高级模式，预设多套常见 UUID |
| 中文乱码 | 显示方块 | 默认 GBK 编码，提供 UTF-8 切换，测试主流打印机字库 |
| 大数据丢包 | 打印不完整 | 分片 + 间隔 + 校验，失败自动重试 |
| 协议差异 | 指令无效 | 协议适配器模式，按 profile 切换；维护兼容性测试矩阵 |

## 12. 开发计划

### Phase 1 - MVP（核心闭环，双模式）

**共享基础**：
- 目录骨架 + 路由 + 配置注册
- `bluetoothAdapter.ts` 设备扫描/连接/写（含分片）
- `usePrinterStore.ts` Zustand store（含 mode 字段）
- `DeviceConnectionPanel` + `ModeSwitcher`
- 打印队列 `usePrintQueue`
- 打印历史（IndexedDB）

**指令模式（优先做完，开发量小）**：
- `hexParser.ts` / `plainTextEncoder.ts` / `hexDump.ts`
- `mnemonicCompiler.ts`（复用 `escPosEncoder`）
- `escPosEncoder.ts` + `escPosCommands.ts` + `qrEncoder.ts`
- `CommandEditor` + `HexPreview` + `CommandToolbar`
- 内置 `snippets.ts` 片段库
- `useCommandCompiler.ts` 实时编译 hook

**编辑模式**：
- `PrintEditor`（仅文本/QR/条码/分割线）+ `PrintPreview`
- `PrintElementRenderer`
- `templates.ts` 内置模板

### Phase 2 - 增强

- 图片元素 + `imageProcessor.ts`（dithering）
- 表格元素
- 模板系统（保存/加载/变量替换）
- 指令片段库自定义保存
- 打印机状态监控（notify）
- 内置模板库扩充（小票、餐券、入场券）

### Phase 3 - 高级

- TSPL 协议适配器（标签打印机）
- 批量打印（CSV 数据源 + 模板循环）
- 设备记忆 + 自动重连
- 打印机 profile 编辑器
- 兼容性测试矩阵文档

## 13. 注册到项目

完成开发后需修改 3 处：

1. **`src/config/tools.ts`** - 新增工具配置项：

```ts
{
  id: "bluetooth-printer",
  name: "蓝牙打印机",
  description: "通过 Web Bluetooth 连接蓝牙热敏/标签打印机，编辑内容并发送 ESC/POS 指令打印小票、二维码、条码等",
  icon: "🖨️",
  category: "硬件工具",
  path: "/bluetooth-printer",
},
```

2. **`src/router/index.tsx`** - 新增路由：

```tsx
import BluetoothPrinter from "@/modules/bluetooth-printer";
// ...
{
  path: "/bluetooth-printer",
  element: <BluetoothPrinter />,
},
```

3. **`README.md`** - 工具列表追加一行。

## 14. 依赖

不引入额外运行时依赖，全部基于浏览器原生能力 + 项目已有库实现：

- Web Bluetooth API（原生）
- Canvas API（原生，用于图片处理）
- IndexedDB（已有 `BaseIndexedDB.ts` 工具类可复用）
- Zustand（已有）
- Antd（已有）

二进制数据操作使用原生 `Uint8Array` / `DataView`，不引入 buffer 类库。

---

**版本**：v1.0
**作者**：even-tools
**最后更新**：2026-07-22
