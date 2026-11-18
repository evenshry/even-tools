// 打印文本宽度工具
// 热敏打印机按字符单元排版：ASCII 占 1 格，中文/全角/emoji 占 2 格
// 统一用显示宽度计算换行、补空格、分割线重复次数

const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f], // 韩文字母
  [0x2e80, 0x303e], // CJK 部首/标点
  [0x3041, 0x33ff], // 假名/注音/CJK 兼容
  [0x3400, 0x4dbf], // CJK 扩展 A
  [0x4e00, 0x9fff], // CJK 基本汉字
  [0xa000, 0xa4cf], // 彝文
  [0xa960, 0xa97f], // 韩文扩展 A
  [0xac00, 0xd7a3], // 韩文音节
  [0xf900, 0xfaff], // CJK 兼容汉字
  [0xfe10, 0xfe19], // 竖排标点
  [0xfe30, 0xfe6f], // CJK 兼容形式
  [0xff00, 0xff60], // 全角形式
  [0xffe0, 0xffe6], // 全角符号
  [0x1f300, 0x1f64f], // emoji
  [0x1f900, 0x1f9ff], // emoji 补充
  [0x20000, 0x3fffd], // CJK 扩展 B+
];

export function charDisplayWidth(codePoint: number): number {
  if (codePoint === 0x09) return 4; // Tab 按 4 格
  if (codePoint < 0x20 || codePoint === 0x7f) return 0; // 控制字符
  for (const [start, end] of WIDE_RANGES) {
    if (codePoint >= start && codePoint <= end) return 2;
  }
  return 1;
}

export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += charDisplayWidth(ch.codePointAt(0) ?? 0);
  return width;
}

// 按显示宽度截断，保证不会切断代理对
export function truncateByWidth(text: string, width: number): string {
  if (width <= 0) return '';
  let used = 0;
  let out = '';
  for (const ch of text) {
    const cw = charDisplayWidth(ch.codePointAt(0) ?? 0);
    if (used + cw > width) break;
    used += cw;
    out += ch;
  }
  return out;
}

// 按显示宽度补空格，超宽则截断
export function padByWidth(text: string, width: number): string {
  const used = displayWidth(text);
  if (used >= width) return truncateByWidth(text, width);
  return text + ' '.repeat(width - used);
}

// 按显示宽度自动换行（保留原有换行符）
export function wrapByWidth(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let rest = para;
    while (displayWidth(rest) > width) {
      const head = truncateByWidth(rest, width);
      if (!head) {
        // 单字符宽度超过行宽时，至少输出一个字符，避免死循环
        const chars = Array.from(rest);
        lines.push(chars[0] ?? '');
        rest = chars.slice(1).join('');
        continue;
      }
      lines.push(head);
      rest = rest.slice(head.length);
    }
    lines.push(rest);
  }
  return lines;
}
