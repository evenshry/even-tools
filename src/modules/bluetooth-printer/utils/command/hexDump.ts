// Hex Dump 工具
// 将字节数组格式化为 hex dump 字符串 (类似 xxd 输出)

export interface HexDumpLine {
  offset: string;   // "00000000"
  hex: string;      // "1B 40 1B 61 01 ..."
  ascii: string;    // "..@.a..."
}

export function formatHexDump(bytes: Uint8Array, bytesPerLine: number = 16): HexDumpLine[] {
  const lines: HexDumpLine[] = [];
  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    const slice = bytes.slice(i, i + bytesPerLine);
    const hexParts: string[] = [];
    const asciiParts: string[] = [];
    for (let j = 0; j < bytesPerLine; j++) {
      if (j < slice.length) {
        const b = slice[j];
        hexParts.push(b.toString(16).padStart(2, '0').toUpperCase());
        asciiParts.push(b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.');
      } else {
        hexParts.push('  ');
        asciiParts.push(' ');
      }
    }
    lines.push({
      offset: i.toString(16).padStart(8, '0').toUpperCase(),
      hex: hexParts.join(' '),
      ascii: asciiParts.join(''),
    });
  }
  return lines;
}

// 简单格式: "1B 40 1B 61 01"
export function formatHexSimple(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}
