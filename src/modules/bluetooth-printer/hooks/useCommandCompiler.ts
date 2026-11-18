// 指令编译 Hook - 实时编译指令输入为字节流

import { useMemo } from 'react';
import type { CommandInput } from '../data/interface';
import { parseHex } from '../utils/command/hexParser';
import { encodePlainText } from '../utils/command/plainTextEncoder';
import { formatHexSimple } from '../utils/command/hexDump';
import { compileMnemonic } from '../utils/command/mnemonicCompiler';
import { DEFAULT_LABEL_CONFIG } from '../utils/tspl/tsplEncoder';
import { usePrinterStore } from '../store/usePrinterStore';

export interface CompileResult {
  bytes: Uint8Array | null;
  hexPreview: string;
  error: string | null;
  byteCount: number;
}

export function useCommandCompiler(input: CommandInput): CompileResult {
  const profile = usePrinterStore((s) => s.profile);

  return useMemo(() => {
    if (!input.raw.trim()) {
      return { bytes: null, hexPreview: '', error: null, byteCount: 0 };
    }

    try {
      let bytes: Uint8Array;

      switch (input.syntax) {
        case 'hex': {
          const result = parseHex(input.raw);
          if (result.error) {
            return { bytes: null, hexPreview: '', error: result.error, byteCount: 0 };
          }
          bytes = result.bytes;
          break;
        }
        case 'plaintext': {
          bytes = encodePlainText(input.raw, input.encoding);
          if (input.appendNewline) {
            const newline = new TextEncoder().encode('\n');
            const combined = new Uint8Array(bytes.length + newline.length);
            combined.set(bytes);
            combined.set(newline, bytes.length);
            bytes = combined;
          }
          break;
        }
        case 'mnemonic': {
          const result = compileMnemonic(input.raw, input.encoding, profile.protocol, {
            ...DEFAULT_LABEL_CONFIG,
            widthMm: profile.widthMm,
            dpi: profile.dpi,
          });
          if (result.lineErrors.length > 0) {
            return {
              bytes: null,
              hexPreview: '',
              error: result.lineErrors.map((e) => `第 ${e.line} 行: ${e.message}`).join('\n'),
              byteCount: 0,
            };
          }
          bytes = result.bytes;
          break;
        }
        default:
          return { bytes: null, hexPreview: '', error: '未知语法', byteCount: 0 };
      }

      if (input.repeat > 1) {
        const repeated = new Uint8Array(bytes.length * input.repeat);
        for (let i = 0; i < input.repeat; i++) {
          repeated.set(bytes, i * bytes.length);
        }
        bytes = repeated;
      }

      return {
        bytes,
        hexPreview: formatHexSimple(bytes),
        error: null,
        byteCount: bytes.length,
      };
    } catch (e) {
      return { bytes: null, hexPreview: '', error: (e as Error).message, byteCount: 0 };
    }
  }, [input.raw, input.syntax, input.encoding, input.appendNewline, input.repeat, profile.protocol, profile.widthMm, profile.dpi]);
}
