// 房间放置辅助：检测重叠并寻找不重叠位置

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/**
 * 在期望位置附近寻找一个不与现有房间重叠的位置。
 * 先尝试期望位置，再按由近到远的方形环搜索四个方向，避免只在右下方向找位置。
 * 找不到可用位置时返回 null，由调用方决定是否放弃添加。
 */
export const findNonOverlappingPosition = (
  desired: Rect,
  existing: Rect[],
  options?: { step?: number; maxAttempts?: number }
): { x: number; y: number } | null => {
  const step = options?.step ?? 40;
  const maxAttempts = options?.maxAttempts ?? 100;

  // 画布坐标不允许为负
  const startX = Math.max(0, desired.x);
  const startY = Math.max(0, desired.y);

  const tryPos = (x: number, y: number): boolean =>
    !existing.some((r) => intersects({ ...desired, x, y }, r));

  if (tryPos(startX, startY)) {
    return { x: startX, y: startY };
  }

  for (let radius = 1; radius <= maxAttempts; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        // 只检查当前环上的点
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;

        const nx = startX + dx * step;
        const ny = startY + dy * step;
        if (nx < 0 || ny < 0) continue;
        if (tryPos(nx, ny)) {
          return { x: nx, y: ny };
        }
      }
    }
  }

  return null;
};
