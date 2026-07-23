import encodeToGb2312 from 'encode-gb2312';

export function encodeGbk(text: string): Uint8Array {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code < 0x80) {
      bytes.push(code);
    } else {
      try {
        const hex = encodeToGb2312(char);
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16));
        }
      } catch {
        const fallback = new TextEncoder().encode(char);
        bytes.push(...Array.from(fallback));
      }
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

export function textByteLength(text: string, encoding: 'gbk' | 'utf8'): number {
  return encodeText(text, encoding).length;
}
