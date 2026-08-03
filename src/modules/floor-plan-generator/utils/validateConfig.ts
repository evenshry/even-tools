// 导入 JSON 配置结构校验

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ROOM_TYPES = ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'study', 'storage', 'balcony', 'corridor'] as const;
const DOOR_TYPES = ['single', 'double', 'sliding'] as const;
const WINDOW_TYPES = ['regular', 'bay', 'sliding'] as const;
const FURNITURE_TYPES = ['bed', 'sofa', 'table', 'chair', 'cabinet', 'desk', 'wardrobe', 'tv', 'refrigerator', 'stove', 'sink'] as const;
const POSITIONS = ['left', 'right', 'top', 'bottom'] as const;

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
const isOneOf = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  isString(v) && (list as readonly string[]).includes(v);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * 校验导入的 JSON 是否符合 HouseConfig 结构。
 * 仅做关键字段与类型校验，normalizeHouseConfig 负责补齐默认值。
 */
export const validateHouseConfig = (data: unknown): ValidationResult => {
  if (!isPlainObject(data)) return { valid: false, error: '配置必须是一个对象' };

  if (!isString(data.name)) return { valid: false, error: '缺少有效的 name 字段' };
  if (!Array.isArray(data.rooms)) return { valid: false, error: 'rooms 必须为数组' };

  for (let i = 0; i < data.rooms.length; i += 1) {
    const r = data.rooms[i];
    const ctx = `rooms[${i}]`;
    if (!isPlainObject(r)) return { valid: false, error: `${ctx} 必须是对象` };
    if (!isString(r.id)) return { valid: false, error: `${ctx} 缺少 id` };
    if (!isOneOf(r.type, ROOM_TYPES)) return { valid: false, error: `${ctx} 房间类型无效` };
    if (!isString(r.name)) return { valid: false, error: `${ctx} 缺少 name` };
    if (!isNumber(r.width) || !isNumber(r.height)) return { valid: false, error: `${ctx} 缺少有效的 width/height` };
    if (!isNumber(r.x) || !isNumber(r.y)) return { valid: false, error: `${ctx} 缺少有效的 x/y` };
    if (!Array.isArray(r.doors)) return { valid: false, error: `${ctx} doors 必须为数组` };
    if (!Array.isArray(r.windows)) return { valid: false, error: `${ctx} windows 必须为数组` };
    if (!Array.isArray(r.furniture)) return { valid: false, error: `${ctx} furniture 必须为数组` };

    for (let j = 0; j < r.doors.length; j += 1) {
      const d = r.doors[j];
      const dctx = `${ctx}.doors[${j}]`;
      if (!isPlainObject(d)) return { valid: false, error: `${dctx} 必须是对象` };
      if (!isString(d.id)) return { valid: false, error: `${dctx} 缺少 id` };
      if (!isOneOf(d.type, DOOR_TYPES)) return { valid: false, error: `${dctx} 门类型无效` };
      if (!isNumber(d.width)) return { valid: false, error: `${dctx} 缺少 width` };
      if (!isOneOf(d.position, POSITIONS)) return { valid: false, error: `${dctx} position 无效` };
      if (!isNumber(d.offset)) return { valid: false, error: `${dctx} 缺少 offset` };
    }

    for (let j = 0; j < r.windows.length; j += 1) {
      const w = r.windows[j];
      const wctx = `${ctx}.windows[${j}]`;
      if (!isPlainObject(w)) return { valid: false, error: `${wctx} 必须是对象` };
      if (!isString(w.id)) return { valid: false, error: `${wctx} 缺少 id` };
      if (!isOneOf(w.type, WINDOW_TYPES)) return { valid: false, error: `${wctx} 窗户类型无效` };
      if (!isNumber(w.width)) return { valid: false, error: `${wctx} 缺少 width` };
      if (!isOneOf(w.position, POSITIONS)) return { valid: false, error: `${wctx} position 无效` };
      if (!isNumber(w.offset)) return { valid: false, error: `${wctx} 缺少 offset` };
    }

    for (let j = 0; j < r.furniture.length; j += 1) {
      const f = r.furniture[j];
      const fctx = `${ctx}.furniture[${j}]`;
      if (!isPlainObject(f)) return { valid: false, error: `${fctx} 必须是对象` };
      if (!isString(f.id)) return { valid: false, error: `${fctx} 缺少 id` };
      if (!isOneOf(f.type, FURNITURE_TYPES)) return { valid: false, error: `${fctx} 家具类型无效` };
      if (!isString(f.name)) return { valid: false, error: `${fctx} 缺少 name` };
      if (!isNumber(f.width) || !isNumber(f.height)) return { valid: false, error: `${fctx} 缺少有效的 width/height` };
      if (!isNumber(f.x) || !isNumber(f.y)) return { valid: false, error: `${fctx} 缺少有效的 x/y` };
    }
  }

  return { valid: true };
};
