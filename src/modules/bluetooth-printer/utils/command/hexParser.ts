// Hex 字符串解析器
// 支持格式: "1B 40" / "1B40" / "0x1B 0x40" / "1B\n40"

export interface HexParseResult {
  bytes: Uint8Array;
  error?: string;
}

export function parseHex(input: string): HexParseResult {
  if (!input || !input.trim()) {
    return { bytes: new Uint8Array(0) };
  }

  // 清理: 移除 0x 前缀、空格、换行、逗号、分号
  let cleaned = input
    .replace(/0x/gi, '')
    .replace(/[\s,;]+/g, '')
    .toUpperCase();

  // 验证: 只允许十六进制字符
  if (!/^[0-9A-F]*$/.test(cleaned)) {
    return { bytes: new Uint8Array(0), error: '包含非十六进制字符' };
  }

  // 奇数长度补 0
  if (cleaned.length % 2 !== 0) {
    cleaned = '0' + cleaned;
  }

  // 解析为字节数组
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substr(i, 2), 16);
  }

  return { bytes };
}
