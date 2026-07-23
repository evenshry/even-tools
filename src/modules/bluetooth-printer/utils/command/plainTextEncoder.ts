import { encodeText } from '../gbkEncoder';

export function encodePlainText(text: string, encoding: 'gbk' | 'utf8' = 'utf8'): Uint8Array {
  if (!text) return new Uint8Array(0);
  return encodeText(text, encoding);
}
