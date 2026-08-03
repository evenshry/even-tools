import { create } from 'zustand';

// ID 生成器：放在非组件文件中，避免 react-hooks/purity 规则误报
export const genId = (prefix: string): string => `${prefix}-${Date.now()}`;

// 当前选中元素，仅记录身份信息，具体数据从 houseConfig 实时查找
export interface Selection {
  originalType: 'room' | 'furniture' | 'door' | 'window';
  roomId: string;
  furnitureId?: string;
  doorId?: string;
  windowId?: string;
}

interface FloorPlanStore {
  // 状态
  houseConfig: FloorPlan.HouseConfig;
  previewMode: boolean;
  selectedElement: Selection | null;

  // 操作
  setHouseConfig: (config: FloorPlan.HouseConfig) => void;
  updateHouseConfig: (config: Partial<FloorPlan.HouseConfig>) => void;
  addRoom: (room: FloorPlan.Room) => void;
  updateRoom: (roomId: string, updates: Partial<FloorPlan.Room>) => void;
  addFurniture: (roomId: string, furniture: FloorPlan.Furniture) => void;
  updateFurniture: (roomId: string, furnitureId: string, updates: Partial<FloorPlan.Furniture>) => void;
  deleteFurniture: (roomId: string, furnitureId: string) => void;
  addDoor: (roomId: string, door: FloorPlan.Door) => void;
  updateDoor: (roomId: string, doorId: string, updates: Partial<FloorPlan.Door>) => void;
  deleteDoor: (roomId: string, doorId: string) => void;
  addWindow: (roomId: string, window: FloorPlan.Window) => void;
  updateWindow: (roomId: string, windowId: string, updates: Partial<FloorPlan.Window>) => void;
  deleteWindow: (roomId: string, windowId: string) => void;
  applyTemplate: (template: FloorPlan.HouseConfig) => void;
  deleteRoom: (roomId: string) => void;
  togglePreview: () => void;
  resetConfig: () => void;
  setSelectedElement: (sel: Selection | null) => void;
}

const normalizeDoorOrWindow = (
  room: FloorPlan.Room,
  item: FloorPlan.Door | FloorPlan.Window,
  thickness: number
) => {
  const isVertical = item.position === 'left' || item.position === 'right';
  const w = isVertical ? thickness : item.width;
  const h = isVertical ? item.width : thickness;

  let x = 0;
  let y = 0;

  if (item.position === 'top') {
    x = Math.max(0, Math.min(room.width - w, item.offset));
    y = -h / 2;
  } else if (item.position === 'bottom') {
    x = Math.max(0, Math.min(room.width - w, item.offset));
    y = room.height - h / 2;
  } else if (item.position === 'left') {
    x = -w / 2;
    y = Math.max(0, Math.min(room.height - h, item.offset));
  } else {
    x = room.width - w / 2;
    y = Math.max(0, Math.min(room.height - h, item.offset));
  }

  return {
    ...item,
    x,
    y,
    height: h,
    rotation: item.rotation ?? 0
  };
};

const normalizeRoom = (room: FloorPlan.Room): FloorPlan.Room => {
  const doorThickness = 20;
  const windowThickness = 15;

  return {
    ...room,
    x: room.x ?? 0,
    y: room.y ?? 0,
    color: room.color ?? '#f0f0f0',
    doors: (room.doors ?? []).map((d) => normalizeDoorOrWindow(room, d, doorThickness) as FloorPlan.Door),
    windows: (room.windows ?? []).map((w) => normalizeDoorOrWindow(room, w, windowThickness) as FloorPlan.Window),
    furniture: (room.furniture ?? []).map((f) => ({
      ...f,
      x: f.x ?? 0,
      y: f.y ?? 0,
      rotation: f.rotation ?? 0
    }))
  };
};

// 按 1px = 1cm 约定，将房间总像素面积换算为 ㎡
const computeTotalArea = (rooms: FloorPlan.Room[]): number =>
  Math.round((rooms.reduce((sum, r) => sum + r.width * r.height, 0) / 10000) * 100) / 100;

const normalizeHouseConfig = (config: FloorPlan.HouseConfig): FloorPlan.HouseConfig => {
  const rooms = (config.rooms ?? []).map(normalizeRoom);
  return {
    ...config,
    id: config.id || `house-${Date.now()}`,
    name: config.name || '我的房屋',
    totalArea: computeTotalArea(rooms),
    rooms,
    scale: config.scale ?? 1,
    gridSize: config.gridSize ?? 50,
    showGrid: config.showGrid ?? true,
    showDimensions: config.showDimensions ?? true,
    showFurniture: config.showFurniture ?? true
  };
};

const createDefaultHouseConfig = (): FloorPlan.HouseConfig =>
  normalizeHouseConfig({
    id: `house-${Date.now()}`,
    name: '我的房屋',
    totalArea: 0,
    rooms: [],
    scale: 1,
    gridSize: 50,
    showGrid: true,
    showDimensions: true,
    showFurniture: true
  });

const defaultHouseConfig = createDefaultHouseConfig();

const cloneConfig = (config: FloorPlan.HouseConfig): FloorPlan.HouseConfig => {
  try {
    return structuredClone(config);
  } catch {
    return JSON.parse(JSON.stringify(config)) as FloorPlan.HouseConfig;
  }
};

// 删除元素时，若当前选中元素与之匹配则清空选中状态
const clearSelectionIfMatch = (
  current: Selection | null,
  target: { originalType: Selection['originalType']; roomId: string; furnitureId?: string; doorId?: string; windowId?: string }
): Selection | null => {
  if (!current) return null;
  if (current.originalType !== target.originalType) {
    // 删除房间时，房间内的家具/门/窗选中也要清空
    if (target.originalType === 'room' && current.roomId === target.roomId) return null;
    return current;
  }
  if (current.roomId !== target.roomId) return current;
  if (target.originalType === 'furniture' && current.furnitureId === target.furnitureId) return null;
  if (target.originalType === 'door' && current.doorId === target.doorId) return null;
  if (target.originalType === 'window' && current.windowId === target.windowId) return null;
  if (target.originalType === 'room') return null;
  return current;
};

export const useFloorPlanStore = create<FloorPlanStore>((set) => ({
  // 初始状态
  houseConfig: defaultHouseConfig,
  previewMode: false,
  selectedElement: null,

  setHouseConfig: (config) => {
    set(() => ({ houseConfig: normalizeHouseConfig(config), selectedElement: null }));
  },

  // 更新房屋配置
  updateHouseConfig: (config) => {
    set((state) => ({
      houseConfig: normalizeHouseConfig({ ...state.houseConfig, ...config })
    }));
  },

  // 添加房间
  addRoom: (room) => {
    set((state) => {
      const rooms = [...state.houseConfig.rooms, normalizeRoom(room)];
      return {
        houseConfig: {
          ...state.houseConfig,
          rooms,
          totalArea: computeTotalArea(rooms)
        }
      };
    });
  },

  // 更新房间
  updateRoom: (roomId, updates) => {
    set((state) => {
      const rooms = state.houseConfig.rooms.map(room =>
        room.id === roomId ? normalizeRoom({ ...room, ...updates }) : room
      );
      return {
        houseConfig: {
          ...state.houseConfig,
          rooms,
          totalArea: computeTotalArea(rooms)
        }
      };
    });
  },

  addFurniture: (roomId, furniture) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            furniture: [...room.furniture, { ...furniture, rotation: furniture.rotation ?? 0 }]
          };
        })
      }
    }));
  },

  // 更新家具
  updateFurniture: (roomId, furnitureId, updates) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              furniture: room.furniture.map(furniture =>
                furniture.id === furnitureId ? { ...furniture, ...updates } : furniture
              )
            };
          }
          return room;
        })
      }
    }));
  },

  deleteFurniture: (roomId, furnitureId) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            furniture: room.furniture.filter((f) => f.id !== furnitureId)
          };
        })
      },
      selectedElement: clearSelectionIfMatch(state.selectedElement, { originalType: 'furniture', roomId, furnitureId })
    }));
  },

  addDoor: (roomId, door) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return normalizeRoom({
            ...room,
            doors: [...room.doors, door]
          });
        })
      }
    }));
  },

  updateDoor: (roomId, doorId, updates) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return normalizeRoom({
            ...room,
            doors: room.doors.map((d) => (d.id === doorId ? { ...d, ...updates } : d))
          });
        })
      }
    }));
  },

  deleteDoor: (roomId, doorId) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            doors: room.doors.filter((d) => d.id !== doorId)
          };
        })
      },
      selectedElement: clearSelectionIfMatch(state.selectedElement, { originalType: 'door', roomId, doorId })
    }));
  },

  addWindow: (roomId, window) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return normalizeRoom({
            ...room,
            windows: [...room.windows, window]
          });
        })
      }
    }));
  },

  updateWindow: (roomId, windowId, updates) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return normalizeRoom({
            ...room,
            windows: room.windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w))
          });
        })
      }
    }));
  },

  deleteWindow: (roomId, windowId) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map((room) => {
          if (room.id !== roomId) return room;
          return {
            ...room,
            windows: room.windows.filter((w) => w.id !== windowId)
          };
        })
      },
      selectedElement: clearSelectionIfMatch(state.selectedElement, { originalType: 'window', roomId, windowId })
    }));
  },

  applyTemplate: (templateConfig) => {
    const cloned = cloneConfig(templateConfig);
    const timestamp = Date.now();
    const withNewIds: FloorPlan.HouseConfig = {
      ...cloned,
      id: `house-${timestamp}`,
      rooms: cloned.rooms.map((r, idx) => ({
        ...r,
        id: `room-${timestamp}-${idx}`,
        doors: r.doors.map((d, jdx) => ({ ...d, id: `door-${timestamp}-${idx}-${jdx}` })),
        windows: r.windows.map((w, jdx) => ({ ...w, id: `window-${timestamp}-${idx}-${jdx}` })),
        furniture: r.furniture.map((f, jdx) => ({ ...f, id: `furniture-${timestamp}-${idx}-${jdx}` }))
      }))
    };
    set(() => ({ houseConfig: normalizeHouseConfig(withNewIds), selectedElement: null }));
  },

  // 删除房间
  deleteRoom: (roomId) => {
    set((state) => {
      const rooms = state.houseConfig.rooms.filter(room => room.id !== roomId);
      return {
        houseConfig: {
          ...state.houseConfig,
          rooms,
          totalArea: computeTotalArea(rooms)
        },
        selectedElement: clearSelectionIfMatch(state.selectedElement, { originalType: 'room', roomId })
      };
    });
  },

  // 切换预览模式
  togglePreview: () => {
    set((state) => ({ previewMode: !state.previewMode }));
  },

  // 重置配置
  resetConfig: () => {
    set({
      houseConfig: createDefaultHouseConfig(),
      previewMode: false,
      selectedElement: null
    });
  },

  setSelectedElement: (sel) => {
    set(() => ({ selectedElement: sel }));
  }
}));
