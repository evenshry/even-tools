// QR 码生成器 - 纯算法实现（用于预览渲染）
// 基于 ISO/IEC 18004 标准，支持 byte 模式
// 注意: 实际打印使用 ESC/POS 原生 QR 指令 (GS ( k)，打印机内部生成
//       本模块仅用于编辑模式的预览渲染

type QrLevel = 'L' | 'M' | 'Q' | 'H';

// 每版本每纠错级别的 ECC 码字数
const ECC_CODEWORDS_PER_BLOCK: Record<QrLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 18, 30, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

// 每版本每纠错级别的分块: [numBlocksG1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
const BLOCK_CONFIG: Record<QrLevel, number[][]> = {
  L: [[0],[1,19,0,0],[1,34,0,0],[1,55,0,0],[1,80,0,0],[1,108,0,0],[2,68,0,0],[2,78,0,0],[2,97,0,0],[2,116,0,0],[2,68,2,69],[4,81,0,0],[2,92,2,93],[4,107,0,0],[4,115,1,116],[4,87,4,88],[4,101,4,102],[4,116,4,117],[5,115,1,116],[5,121,4,122],[5,127,4,128],[11,121,0,0],[5,141,5,142],[5,151,5,152],[8,147,4,148],[9,148,5,149],[9,162,5,163],[10,163,6,164],[10,171,6,172],[10,173,7,174],[10,175,8,176],[11,176,8,177],[12,180,8,181],[12,182,9,183],[13,185,9,186],[14,187,9,188],[14,191,10,192],[15,193,10,194],[15,197,11,198],[16,199,12,200]],
  M: [[0],[1,16,0,0],[1,28,0,0],[1,44,0,0],[1,64,0,0],[1,86,0,0],[2,68,0,0],[4,56,0,0],[4,56,0,0],[4,72,0,0],[4,80,0,0],[4,108,0,0],[6,90,0,0],[6,108,0,0],[8,92,0,0],[8,98,0,0],[8,107,1,108],[8,115,1,116],[9,121,1,122],[10,126,2,127],[10,134,2,135],[11,140,2,141],[12,147,2,148],[12,155,2,156],[13,163,2,164],[14,170,2,171],[14,176,3,177],[15,180,3,181],[16,187,3,188],[16,197,3,198],[18,201,3,202],[18,207,3,208],[19,219,4,220],[20,225,4,226],[21,233,4,234],[22,241,4,242],[24,249,4,250],[24,257,5,258],[25,265,5,266],[26,273,5,274]],
  Q: [[0],[1,13,0,0],[1,22,0,0],[2,17,0,0],[2,24,0,0],[2,15,2,16],[4,19,0,0],[2,14,4,15],[4,12,4,13],[5,20,0,0],[4,18,4,19],[6,20,0,0],[4,13,5,14],[5,19,5,20],[6,15,5,16],[6,19,5,20],[6,17,6,18],[6,21,6,22],[7,21,6,22],[8,21,7,22],[9,22,7,23],[10,22,8,23],[11,22,9,23],[12,22,10,23],[13,22,11,24],[14,22,12,25],[15,22,13,26],[16,22,14,27],[17,21,15,28],[18,21,15,28],[19,22,15,27],[20,22,16,28],[21,22,17,28],[22,22,18,28],[24,22,19,29],[25,23,19,29],[26,23,20,30],[27,24,21,31],[28,23,22,31],[29,24,22,32]],
  H: [[0],[1,9,0,0],[1,16,0,0],[2,13,0,0],[4,9,0,0],[2,8,2,9],[4,19,0,0],[2,14,4,15],[4,14,4,15],[5,14,4,15],[5,12,5,13],[5,11,5,12],[8,12,4,13],[9,12,4,13],[8,11,5,12],[9,13,5,14],[10,13,5,14],[9,14,5,15],[10,15,5,16],[11,15,6,17],[13,15,6,17],[14,15,7,18],[15,15,7,18],[16,15,8,19],[17,15,8,19],[17,15,9,20],[18,15,10,21],[17,15,11,22],[19,15,11,22],[19,16,11,23],[20,15,12,24],[21,15,13,25],[22,16,13,26],[23,16,14,27],[24,17,15,28],[25,17,15,28],[26,17,16,29],[27,18,17,30],[28,18,17,30],[29,18,18,31]],
};

// 每版本字节容量 (byte 模式)
const CAPACITIES: Record<QrLevel, number[]> = {
  L: [-1, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
  M: [-1, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
  Q: [-1, 11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
  H: [-1, 7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
};

// 总码字数
const TOTAL_CODEWORDS = [-1, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706];

// GF(256)
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);
(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsEncode(data: number[], eccLen: number): number[] {
  const gen = new Array(eccLen).fill(0);
  for (const d of data) {
    const factor = d ^ gen.shift()!;
    gen.push(0);
    if (factor !== 0) {
      for (let i = 0; i < eccLen; i++) {
        gen[i] ^= gfMul(GF_EXP[eccLen - 1 - i], factor);
      }
    }
  }
  return gen;
}

function getMinVersion(data: string, level: QrLevel): number {
  const byteLen = new TextEncoder().encode(data).length;
  for (let v = 1; v <= 40; v++) {
    if (byteLen <= CAPACITIES[level][v]) return v;
  }
  throw new Error('QR data too long (max version 40)');
}

function getAlignmentCoords(version: number): number[] {
  if (version < 2) return [];
  const table: number[][] = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
    [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82],
    [6, 30, 58, 86], [6, 30, 62, 90], [6, 34, 60, 94], [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ];
  return table[version] || [];
}

function applyMask(matrix: boolean[][], reserved: boolean[][], mask: number) {
  const size = matrix.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (r + c) % 2 === 0; break;
        case 1: invert = r % 2 === 0; break;
        case 2: invert = c % 3 === 0; break;
        case 3: invert = (r + c) % 3 === 0; break;
        case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
        case 5: invert = ((r * c) % 2) + ((r * c) % 3) === 0; break;
        case 6: invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; break;
        case 7: invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; break;
      }
      if (invert) matrix[r][c] = !matrix[r][c];
    }
  }
}

function placeFormatInfo(matrix: boolean[][], level: QrLevel, mask: number) {
  const size = matrix.length;
  const levelBits = { L: 1, M: 0, Q: 3, H: 2 }[level];
  const data = (levelBits << 3) | mask;
  let bch = data;
  for (let i = 0; i < 10; i++) {
    if ((bch & (1 << (9 - i))) !== 0) bch ^= 0x537 << (9 - i);
  }
  const format = ((data << 10) | bch) ^ 0x5412;
  const bits: boolean[] = [];
  for (let i = 0; i < 15; i++) bits.push(((format >> i) & 1) === 1);
  for (let i = 0; i < 6; i++) matrix[8][i] = bits[i];
  matrix[8][7] = bits[6]; matrix[8][8] = bits[7]; matrix[7][8] = bits[8];
  for (let i = 0; i < 6; i++) matrix[5 - i][8] = bits[9 + i];
  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = bits[i];
  for (let i = 0; i < 7; i++) matrix[8][size - 7 + i] = bits[8 + i];
  matrix[size - 8][8] = true;
}

function buildMatrix(version: number, allCodewords: number[], level: QrLevel, mask: number): boolean[][] {
  const size = version * 4 + 17;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // 定位图案
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        matrix[rr][cc] = dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        reserved[rr][cc] = true;
      }
    }
  };
  placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);

  // 对齐图案
  for (const r of getAlignmentCoords(version)) {
    for (const c of getAlignmentCoords(version)) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          matrix[r + dr][c + dc] = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          reserved[r + dr][c + dc] = true;
        }
      }
    }
  }

  // 时序图案
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0; matrix[i][6] = i % 2 === 0;
    reserved[6][i] = true; reserved[i][6] = true;
  }

  // 格式信息占位
  for (let i = 0; i < 9; i++) { if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; } }
  for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true; }
  reserved[size - 8][8] = true;

  // 数据填充
  let bitIdx = 0; let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (reserved[r][cc]) continue;
        const byteIdx = bitIdx >> 3;
        const bitInByte = 7 - (bitIdx & 7);
        matrix[r][cc] = byteIdx < allCodewords.length && ((allCodewords[byteIdx] >> bitInByte) & 1) === 1;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  applyMask(matrix, reserved, mask);
  placeFormatInfo(matrix, level, mask);
  return matrix;
}

function encodeData(data: string, version: number, level: QrLevel): number[] {
  const bytes = Array.from(new TextEncoder().encode(data));
  const totalCodewords = TOTAL_CODEWORDS[version];
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[level][version];
  const [g1Num, g1Data, g2Num, g2Data] = BLOCK_CONFIG[level][version];

  // 位流编码 (byte 模式)
  const bits: number[] = [0, 1, 0, 0];
  const ccBits = version < 10 ? 8 : 16;
  for (let i = ccBits - 1; i >= 0; i--) bits.push((bytes.length >> i) & 1);
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  const remaining = totalCodewords * 8 - bits.length;
  for (let i = 0; i < Math.min(4, remaining); i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const padding = [0xEC, 0x11];
  let padIdx = 0;
  while (bits.length < totalCodewords * 8) {
    for (let i = 7; i >= 0; i--) bits.push((padding[padIdx % 2] >> i) & 1);
    padIdx++;
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  // 分块
  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1Num; i++) { blocks.push(codewords.slice(offset, offset + g1Data)); offset += g1Data; }
  for (let i = 0; i < g2Num; i++) { blocks.push(codewords.slice(offset, offset + g2Data)); offset += g2Data; }
  const eccBlocks = blocks.map(b => rsEncode(b, eccPerBlock));

  // 交错
  const result: number[] = [];
  const maxData = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.length) result.push(b[i]);
  for (let i = 0; i < eccPerBlock; i++) for (const b of eccBlocks) if (i < b.length) result.push(b[i]);
  return result;
}

function maskScore(matrix: boolean[][]): number {
  const size = matrix.length;
  let score = 0;
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      else run = 1;
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      else run = 1;
    }
  }
  return score;
}

/**
 * 生成 QR 码模块矩阵 (用于预览渲染)
 * @param content 文本内容
 * @param level 纠错级别
 * @returns 二维布尔矩阵 (true=黑色模块)
 */
export function generateQrMatrix(content: string, level: QrLevel = 'M'): boolean[][] {
  const version = getMinVersion(content, level);
  const codewords = encodeData(content, version, level);
  let bestMask = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const score = maskScore(buildMatrix(version, codewords, level, m));
    if (score < bestScore) { bestScore = score; bestMask = m; }
  }
  return buildMatrix(version, codewords, level, bestMask);
}
