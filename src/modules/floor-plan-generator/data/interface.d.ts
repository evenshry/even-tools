// 房屋平面设计图相关类型定义
declare namespace FloorPlan {
  // 房间类型
  interface Room {
    id: string;
    type: RoomType;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    color: string;
    doors: Door[];
    windows: Window[];
    furniture: Furniture[];
  }

  // 房间类型枚举
  type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'dining' | 'study' | 'storage' | 'balcony' | 'corridor';

  // 门
  interface Door {
    id: string;
    type: 'single' | 'double' | 'sliding';
    width: number;
    position: 'left' | 'right' | 'top' | 'bottom';
    offset: number;
    x?: number;
    y?: number;
    height?: number;
    rotation?: number;
  }

  // 窗户
  interface Window {
    id: string;
    type: 'regular' | 'bay' | 'sliding';
    width: number;
    position: 'left' | 'right' | 'top' | 'bottom';
    offset: number;
    x?: number;
    y?: number;
    height?: number;
    rotation?: number;
  }

  // 家具
  interface Furniture {
    id: string;
    type: FurnitureType;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
  }

  // 家具类型
  type FurnitureType = 'bed' | 'sofa' | 'table' | 'chair' | 'cabinet' | 'desk' | 'wardrobe' | 'refrigerator' | 'stove' | 'sink';

  // 房屋配置
  interface HouseConfig {
    id: string;
    name: string;
    totalArea: number;
    rooms: Room[];
    scale: number;
    gridSize: number;
    showGrid: boolean;
    showDimensions: boolean;
    showFurniture: boolean;
  }

  // 预设模板
  interface Template {
    id: string;
    name: string;
    description: string;
    config: HouseConfig;
  }
}
