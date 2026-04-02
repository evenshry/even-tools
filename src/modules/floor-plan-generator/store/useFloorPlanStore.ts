import { create } from 'zustand';

interface FloorPlanStore {
  // 状态
  houseConfig: FloorPlan.HouseConfig;
  previewMode: boolean;
  
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

const normalizeHouseConfig = (config: FloorPlan.HouseConfig): FloorPlan.HouseConfig => ({
  ...config,
  id: config.id || `house-${Date.now()}`,
  name: config.name || '我的房屋',
  totalArea: config.totalArea ?? 0,
  rooms: (config.rooms ?? []).map(normalizeRoom),
  scale: config.scale ?? 1,
  gridSize: config.gridSize ?? 50,
  showGrid: config.showGrid ?? true,
  showDimensions: config.showDimensions ?? true,
  showFurniture: config.showFurniture ?? true
});

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

export const useFloorPlanStore = create<FloorPlanStore>((set) => ({
  // 初始状态
  houseConfig: defaultHouseConfig,
  previewMode: false,

  setHouseConfig: (config) => {
    set(() => ({ houseConfig: normalizeHouseConfig(config) }));
  },

  // 更新房屋配置
  updateHouseConfig: (config) => {
    set((state) => ({
      houseConfig: normalizeHouseConfig({ ...state.houseConfig, ...config })
    }));
  },

  // 添加房间
  addRoom: (room) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: [...state.houseConfig.rooms, normalizeRoom(room)]
      }
    }));
  },

  // 更新房间
  updateRoom: (roomId, updates) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.map(room =>
          room.id === roomId ? normalizeRoom({ ...room, ...updates }) : room
        )
      }
    }));
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
      }
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
      }
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
      }
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
    set(() => ({ houseConfig: normalizeHouseConfig(withNewIds) }));
  },

  // 删除房间
  deleteRoom: (roomId) => {
    set((state) => ({
      houseConfig: {
        ...state.houseConfig,
        rooms: state.houseConfig.rooms.filter(room => room.id !== roomId)
      }
    }));
  },

  // 切换预览模式
  togglePreview: () => {
    set((state) => ({ previewMode: !state.previewMode }));
  },

  // 重置配置
  resetConfig: () => {
    set({
      houseConfig: createDefaultHouseConfig(),
      previewMode: false
    });
  }
}));
