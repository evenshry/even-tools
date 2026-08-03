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
 * 先尝试期望位置，命中后沿对角线阶梯式偏移继续尝试。
 */
export const findNonOverlappingPosition = (
  desired: Rect,
  existing: Rect[],
  options?: { step?: number; maxAttempts?: number }
): { x: number; y: number } => {
  const step = options?.step ?? 40;
  const maxAttempts = options?.maxAttempts ?? 100;

  const tryPos = (x: number, y: number): boolean =>
    !existing.some((r) => intersects({ ...desired, x, y }, r));

  if (tryPos(desired.x, desired.y)) {
    return { x: desired.x, y: desired.y };
  }

  for (let k = 1; k <= maxAttempts; k += 1) {
    const nx = desired.x + k * step;
    const ny = desired.y + k * step;
    if (tryPos(nx, ny)) {
      return { x: nx, y: ny };
    }
  }

  // 全部尝试均重叠时回退到期望位置
  return { x: desired.x, y: desired.y };
};
