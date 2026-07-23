// 指令片段预设库
import type { CommandSnippet } from './interface';

export const BUILTIN_SNIPPETS: CommandSnippet[] = [
  {
    id: 'snip-init',
    name: '初始化打印机',
    description: 'ESC @ 复位打印机到默认状态',
    syntax: 'hex',
    content: '1B 40',
    category: 'escpos',
  },
  {
    id: 'snip-cut',
    name: '切纸',
    description: '全切纸指令',
    syntax: 'hex',
    content: '1D 56 00',
    category: 'escpos',
  },
  {
    id: 'snip-cut-half',
    name: '半切纸',
    description: '半切纸指令 (部分打印机支持)',
    syntax: 'hex',
    content: '1D 56 01',
    category: 'escpos',
  },
  {
    id: 'snip-feed-3',
    name: '走纸 3 行',
    description: '走纸 3 行后切纸',
    syntax: 'hex',
    content: '1B 64 03 1D 56 00',
    category: 'escpos',
  },
  {
    id: 'snip-beep',
    name: '蜂鸣 1 次',
    description: '蜂鸣器响 1 次，时长 100ms',
    syntax: 'hex',
    content: '1B 42 01 01',
    category: 'escpos',
  },
  {
    id: 'snip-align-center',
    name: '居中对齐',
    description: '设置文字居中',
    syntax: 'hex',
    content: '1B 61 01',
    category: 'escpos',
  },
  {
    id: 'snip-align-left',
    name: '左对齐',
    description: '设置文字左对齐',
    syntax: 'hex',
    content: '1B 61 00',
    category: 'escpos',
  },
  {
    id: 'snip-align-right',
    name: '右对齐',
    description: '设置文字右对齐',
    syntax: 'hex',
    content: '1B 61 02',
    category: 'escpos',
  },
  {
    id: 'snip-bold-on',
    name: '加粗开',
    description: '开启加粗',
    syntax: 'hex',
    content: '1B 45 01',
    category: 'escpos',
  },
  {
    id: 'snip-bold-off',
    name: '加粗关',
    description: '关闭加粗',
    syntax: 'hex',
    content: '1B 45 00',
    category: 'escpos',
  },
  {
    id: 'snip-receipt-plaintext',
    name: '小票模板',
    description: '完整小票示例：标题+商品+二维码',
    syntax: 'plaintext',
    content: `My Shop

Item 1        $5.00
Item 2        $3.50

Total: $8.50

https://example.com`,
    category: 'escpos',
  },
  {
    id: 'snip-qr-test',
    name: '二维码测试',
    description: '打印一个二维码',
    syntax: 'plaintext',
    content: `https://example.com`,
    category: 'escpos',
  },
  {
    id: 'snip-plaintext-test',
    name: '纯文本测试',
    description: '发送纯文本 (UTF-8)',
    syntax: 'plaintext',
    content: 'Hello, Printer!\n你好，打印机！',
    category: 'common',
  },
  // ===== TSPL 片段 =====
  {
    id: 'snip-tspl-init',
    name: 'TSPL 标签初始化',
    description: 'SIZE + GAP + DIRECTION + CLS + PRINT 标准初始化序列',
    syntax: 'plaintext',
    content: 'SIZE 40 mm,30 mm\r\nGAP 2 mm,0 mm\r\nDIRECTION 0\r\nCLS\r\nPRINT 1,1\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-cls',
    name: 'TSPL 清除缓冲',
    description: 'CLS 清除图像缓冲区',
    syntax: 'plaintext',
    content: 'CLS\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-print',
    name: 'TSPL 打印标签',
    description: 'PRINT 1 张 1 份',
    syntax: 'plaintext',
    content: 'PRINT 1,1\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-text',
    name: 'TSPL 文本',
    description: '在 (10,10) 打印文本，字体 1，放大 2x2',
    syntax: 'plaintext',
    content: 'TEXT 10,10,"1",0,2,2,"Hello TSPL"\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-qr',
    name: 'TSPL 二维码',
    description: '在 (10,40) 打印 QR 码，纠错级别 M，模块大小 6',
    syntax: 'plaintext',
    content: 'QRCODE 10,40,"M",6,0,0,"https://example.com"\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-barcode',
    name: 'TSPL 一维码',
    description: '在 (10,100) 打印 CODE128，高度 80，显示文字',
    syntax: 'plaintext',
    content: 'BARCODE 10,100,"128",80,1,0,2,4,"1234567890"\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-sound',
    name: 'TSPL 蜂鸣',
    description: 'SOUND 响 1 次，级别 5，时长 100ms',
    syntax: 'plaintext',
    content: 'SOUND 5,10\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-cut',
    name: 'TSPL 切纸',
    description: 'CUT 切纸指令',
    syntax: 'plaintext',
    content: 'CUT 0\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-box',
    name: 'TSPL 矩形框',
    description: 'BOX 画矩形边框，线宽 2',
    syntax: 'plaintext',
    content: 'BOX 10,10,300,200,2\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-bar',
    name: 'TSPL 实心矩形',
    description: 'BAR 画填充矩形',
    syntax: 'plaintext',
    content: 'BAR 10,10,200,4\r\n',
    category: 'tspl',
  },
  {
    id: 'snip-tspl-label-mnemonic',
    name: '标签模板 (助记符)',
    description: 'TSPL 完整标签示例：初始化+文本+二维码+条码+打印',
    syntax: 'plaintext',
    content: `SIZE 80 mm,50 mm
GAP 0 mm,0 mm
CLS
TEXT 50,20,"TSS24.BF2",0,1,1,"Product Name"
QRCODE 50,80,L,4,A,0,"https://example.com"
BARCODE 50,180,"128",60,1,0,2,2,"1234567890"
PRINT 1`,
    category: 'tspl',
  },
  {
    id: 'snip-tspl-selftest',
    name: 'TSPL 自检页',
    description: '发送 SELFTEST，打印机自动打印固件/字库/DIP 等内置自检页',
    syntax: 'plaintext',
    content: 'SELFTEST\r\n',
    category: 'tspl',
  },
];
