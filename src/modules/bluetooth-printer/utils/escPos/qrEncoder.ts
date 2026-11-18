// QR 码矩阵生成（用于编辑模式预览渲染）
// 使用 `qrcode` 库生成标准 QR 矩阵，避免自研实现的纠错/掩码偏差。
// 实际打印仍走 ESC/POS 原生 QR 指令，由打印机内部生成。

import QRCode from 'qrcode';

export type QrLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * 获取 QR 码的模块边长（用于计算打印占位尺寸）
 */
export function getQrModuleSize(content: string, level: QrLevel = 'M'): number {
  return QRCode.create(content || ' ', { errorCorrectionLevel: level }).modules.size;
}

/**
 * 生成 QR 码模块矩阵
 * @param content 文本内容
 * @param level 纠错级别
 * @returns 二维布尔矩阵 (true=黑色模块)
 */
export function generateQrMatrix(content: string, level: QrLevel = 'M'): boolean[][] {
  const symbol = QRCode.create(content || ' ', { errorCorrectionLevel: level });
  const { size, data } = symbol.modules;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  for (let y = 0; y < size; y++) {
    const rowOffset = y * size;
    for (let x = 0; x < size; x++) {
      matrix[y][x] = data[rowOffset + x] === 1;
    }
  }
  return matrix;
}
