import encodeToGb2312 from 'encode-gb2312';

// GB2312 不支持时的替代字节（?）：避免把 UTF-8 字节混入 GBK 流导致整行乱码
const FALLBACK_BYTE = 0x3f;

export function encodeGbk(text: string): Uint8Array {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;

    if (code < 0x80) {
      bytes.push(code);
      continue;
    }

    let hex = '';
    try {
      hex = encodeToGb2312(char);
    } catch {
      hex = '';
    }

    if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
      bytes.push(FALLBACK_BYTE);
      continue;
    }

    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
  }

  return new Uint8Array(bytes);
}

export function encodeText(text: string, encoding: 'gbk' | 'utf8'): Uint8Array {
  if (encoding === 'gbk') {
    return encodeGbk(text);
  }
  return new TextEncoder().encode(text);
}
