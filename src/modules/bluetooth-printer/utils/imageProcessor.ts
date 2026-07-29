import type { MonochromeBitmap, ImageElement } from '../data/interface';

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function grayscale(r: number, g: number, b: number): number {
  return Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
}

function thresholdDither(gray: number): boolean {
  return gray < 128;
}

function floydSteinbergDither(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldGray = result[idx];
      const newGray = oldGray < 128 ? 0 : 255;
      const error = oldGray - newGray;
      // 当前像素设为黑或白（所有通道同步）
      result[idx] = newGray;
      result[idx + 1] = newGray;
      result[idx + 2] = newGray;
      // 误差扩散到相邻像素（所有通道同步）
      if (x + 1 < width) {
        const rightIdx = (y * width + x + 1) * 4;
        const v = Math.min(255, Math.max(0, result[rightIdx] + error * 7 / 16));
        result[rightIdx] = v;
        result[rightIdx + 1] = v;
        result[rightIdx + 2] = v;
      }
      if (y + 1 < height) {
        const downIdx = ((y + 1) * width + x) * 4;
        const v = Math.min(255, Math.max(0, result[downIdx] + error * 5 / 16));
        result[downIdx] = v;
        result[downIdx + 1] = v;
        result[downIdx + 2] = v;
        if (x > 0) {
          const downLeftIdx = ((y + 1) * width + x - 1) * 4;
          const v = Math.min(255, Math.max(0, result[downLeftIdx] + error * 3 / 16));
          result[downLeftIdx] = v;
          result[downLeftIdx + 1] = v;
          result[downLeftIdx + 2] = v;
        }
        if (x + 1 < width) {
          const downRightIdx = ((y + 1) * width + x + 1) * 4;
          const v = Math.min(255, Math.max(0, result[downRightIdx] + error * 1 / 16));
          result[downRightIdx] = v;
          result[downRightIdx + 1] = v;
          result[downRightIdx + 2] = v;
        }
      }
    }
  }
  return result;
}

// Bayer 有序抖动：4x4 矩阵，值范围 0-15
const BAYER_MATRIX = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function orderedDither(gray: number, x: number, y: number): boolean {
  const threshold = ((BAYER_MATRIX[y % 4][x % 4] + 0.5) / 16) * 255;
  return gray < threshold;
}

function pixelsToBitmapData(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const bytesPerLine = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerLine * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = (y * width + x) * 4;
      // 灰度值 < 128 为黑色，像素值为0（黑）或255（白）
      // ESC/POS: bit=1 打印黑点, bit=0 不打印（白）
      const isBlack = pixels[pixelIdx] < 128;
      const byteIdx = y * bytesPerLine + Math.floor(x / 8);
      const bitPos = 7 - (x % 8);
      if (isBlack) {
        data[byteIdx] |= (1 << bitPos);
      } else {
        data[byteIdx] &= ~(1 << bitPos);
      }
    }
  }
  return data;
}

export async function processImage(
  src: string,
  targetWidthPx: number = 384,
  dither: ImageElement['dither'] = 'threshold',
): Promise<MonochromeBitmap> {
  const img = await loadImage(src);
  // 缩放到目标宽度，高度按比例计算
  const rawWidth = Math.min(targetWidthPx, img.width);
  // 确保宽度是 8 的倍数（ESC/POS 位图每行字节数 = width/8，必须是整数）
  const width = Math.max(8, Math.floor(rawWidth / 8) * 8);
  const height = Math.floor(img.height * (width / img.width));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  // 先填充白色背景，防止透明像素被当作黑色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = grayscale(pixels[i], pixels[i + 1], pixels[i + 2]);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  let processedPixels: Uint8ClampedArray;
  switch (dither) {
    case 'floydSteinberg':
      processedPixels = floydSteinbergDither(pixels, width, height);
      break;
    case 'ordered':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          pixels[i] = orderedDither(pixels[i], x, y) ? 0 : 255;
          pixels[i + 1] = pixels[i];
          pixels[i + 2] = pixels[i];
        }
      }
      processedPixels = pixels;
      break;
    default:
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = thresholdDither(pixels[i]) ? 0 : 255;
        pixels[i + 1] = pixels[i];
        pixels[i + 2] = pixels[i];
      }
      processedPixels = pixels;
  }
  const data = pixelsToBitmapData(processedPixels, width, height);
  return { width, height, data };
}

export function dataUrlToBase64(src: string): string {
  return src.split(',')[1] || '';
}

// 将单色位图转换为 DataURL，用于预览处理后效果
export function bitmapToDataUrl(bitmap: MonochromeBitmap): string {
  const { width, height, data } = bitmap;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;
  const bytesPerLine = Math.ceil(width / 8);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIdx = y * bytesPerLine + Math.floor(x / 8);
      const bitPos = 7 - (x % 8);
      const isBlack = (data[byteIdx] & (1 << bitPos)) !== 0;
      const pixelIdx = (y * width + x) * 4;
      const color = isBlack ? 0 : 255;
      pixels[pixelIdx] = color;
      pixels[pixelIdx + 1] = color;
      pixels[pixelIdx + 2] = color;
      pixels[pixelIdx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function compressImage(src: string, maxWidth: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/png', 0.8);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = src;
  });
}