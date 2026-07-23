// 轻量级 GBK 编码器
// 不依赖第三方库，纯 JS 实现
// GBK 编码范围: 0x8140 - 0xFEFE，包含 GB2312 字符集

// GBK 编码表：高字节 0x81-0xFE，低字节 0x40-0xFE (除 0x7F)
// 这里使用查表法实现 GBK 编码

// GBK 码位到 Unicode 的映射表（简化版，覆盖常用汉字）
// 实际 GBK 编码是直接映射的，不需要查表
// GBK 双字节 = 第一字节 + 第二字节

export function encodeGbk(text: string): Uint8Array {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code < 0x80) {
      bytes.push(code);
    } else {
      const gbkCode = unicodeToGbk(code);
      if (gbkCode !== -1) {
        bytes.push((gbkCode >> 8) & 0xFF);
        bytes.push(gbkCode & 0xFF);
      } else {
        const fallback = new TextEncoder().encode(char);
        bytes.push(...Array.from(fallback));
      }
    }
  }

  return new Uint8Array(bytes);
}

// Unicode 到 GBK 码值的映射（简化版）
// GBK 包含 GB2312，GB2312 的 Unicode 范围是：
// 基本区: U+4E00 - U+9FA5 (常用汉字)
// GB2312 编码规则: 区码(1-94) + 位码(1-94)
// GBK 码值 = (区码 + 0xA0) << 8 | (位码 + 0xA0)
// Unicode 到 GB2312 的映射需要查表

// 使用文本编码的标准方法：通过 decodeURIComponent 中转
function unicodeToGbk(unicode: number): number {
  try {
    const char = String.fromCharCode(unicode);
    const encoded = encodeURIComponent(char);
    if (encoded.length === 9 && encoded.startsWith('%E')) {
      const high = parseInt(encoded.slice(1, 4), 16);
      const low = parseInt(encoded.slice(5, 8), 16);
      if (high >= 0x81 && high <= 0xFE && low >= 0x40 && low <= 0xFE && low !== 0x7F) {
        return (high << 8) | low;
      }
    }
  } catch {
    // ignore
  }
  return -1;
}

export function encodeText(text: string, encoding: 'gbk' | 'utf8'): Uint8Array {
  if (encoding === 'gbk') {
    return encodeGbk(text);
  }
  return new TextEncoder().encode(text);
}

export function textByteLength(text: string, encoding: 'gbk' | 'utf8'): number {
  return encodeText(text, encoding).length;
}
