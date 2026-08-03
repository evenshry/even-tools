import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, message, Space, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useFloorPlanStore, type Selection, genId } from '../store/useFloorPlanStore';
import { findNonOverlappingPosition } from '../utils/roomPlacement';
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

interface CanvasAreaProps {
  previewMode?: boolean;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ previewMode = false }) => {
  const mode = useThemeStore((s) => s.mode);
  const {
    houseConfig,
    addRoom,
    updateRoom,
    addFurniture,
    updateFurniture,
    addDoor,
    updateDoor,
    addWindow,
    updateWindow,
    selectedElement,
    setSelectedElement
  } = useFloorPlanStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'pan' | 'drag' | 'resize' | 'rotate';
    originalType?: 'room' | 'furniture' | 'door' | 'window';
    handle?: 'nw' | 'ne' | 'sw' | 'se';
    roomId?: string;
    furnitureId?: string;
    doorId?: string;
    windowId?: string;
    startX: number;
    startY: number;
    startViewportX: number;
    startViewportY: number;
    startRoom?: FloorPlan.Room;
    startFurniture?: FloorPlan.Furniture;
    startDoor?: FloorPlan.Door;
    startWindow?: FloorPlan.Window;
    // 旋转手柄专用：起始指针相对家具中心的角度（度）与起始 rotation
    startPointerAngle?: number;
    startRotation?: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startViewportX: 0,
    startViewportY: 0
  });

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const canvasSize = useMemo(() => ({ width: 1200, height: 800 }), []);

  const getFurnitureColor = (type: string): string => {
    const colors: Record<string, string> = {
      bed: '#e6f7ff',
      sofa: '#f6ffed',
      table: '#fff7e6',
      chair: '#f9f0ff',
      cabinet: '#f0f0f0',
      desk: '#e8f5ff',
      wardrobe: '#f0f0f0',
      tv: '#d9d9d9',
      refrigerator: '#e6f7ff',
      stove: '#f6ffed',
      sink: '#91d5ff'
    };
    return colors[type] || '#d9d9d9';
  };

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const snap = (n: number) => {
    if (!houseConfig.showGrid) return n;
    const g = Math.max(1, houseConfig.gridSize || 1);
    return Math.round(n / g) * g;
  };

  const getSvgPoint = (evt: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(evt.clientX, evt.clientY);
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const buildSelected = (sel: Selection | null) => {
    setSelectedElement(sel);
  };

  const handleAddRoom = () => {
    const width = 300;
    const height = 300;
    const pos = findNonOverlappingPosition(
      { x: snap(100), y: snap(100), width, height },
      houseConfig.rooms
    );
    const newRoom: FloorPlan.Room = {
      id: genId('room'),
      type: 'living',
      name: '新房间',
      width,
      height,
      x: pos.x,
      y: pos.y,
      color: '#f0f0f0',
      doors: [],
      windows: [],
      furniture: []
    };
    addRoom(newRoom);
    message.success('新房间已添加');
  };

  const findRoomAtPoint = (p: { x: number; y: number }) => {
    const rooms = [...houseConfig.rooms];
    for (let i = rooms.length - 1; i >= 0; i--) {
      const r = rooms[i];
      if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) {
        return r;
      }
    }
    return null;
  };

  const getNearestEdge = (room: FloorPlan.Room, p: { x: number; y: number }) => {
    const top = Math.abs(p.y - room.y);
    const bottom = Math.abs(p.y - (room.y + room.height));
    const left = Math.abs(p.x - room.x);
    const right = Math.abs(p.x - (room.x + room.width));
    const min = Math.min(top, bottom, left, right);
    if (min === top) return 'top';
    if (min === bottom) return 'bottom';
    if (min === left) return 'left';
    return 'right';
  };

  const startPan = (evt: React.PointerEvent) => {
    const p = getSvgPoint(evt);
    dragRef.current = {
      ...dragRef.current,
      mode: 'pan',
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y
    };
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  const startDragRoom = (evt: React.PointerEvent, room: FloorPlan.Room) => {
    const p = getSvgPoint(evt);
    dragRef.current = {
      ...dragRef.current,
      mode: 'drag',
      originalType: 'room',
      roomId: room.id,
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startRoom: { ...room }
    };
    buildSelected({ originalType: 'room', roomId: room.id });
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  const startDragFurniture = (evt: React.PointerEvent, room: FloorPlan.Room, furniture: FloorPlan.Furniture) => {
    const p = getSvgPoint(evt);
    dragRef.current = {
      ...dragRef.current,
      mode: 'drag',
      originalType: 'furniture',
      roomId: room.id,
      furnitureId: furniture.id,
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startRoom: { ...room },
      startFurniture: { ...furniture }
    };
    buildSelected({ originalType: 'furniture', roomId: room.id, furnitureId: furniture.id });
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  const startDragDoorOrWindow = (
    evt: React.PointerEvent,
    originalType: 'door' | 'window',
    room: FloorPlan.Room,
    item: FloorPlan.Door | FloorPlan.Window
  ) => {
    const p = getSvgPoint(evt);
    dragRef.current = {
      ...dragRef.current,
      mode: 'drag',
      originalType,
      roomId: room.id,
      doorId: originalType === 'door' ? item.id : undefined,
      windowId: originalType === 'window' ? item.id : undefined,
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startRoom: { ...room },
      startDoor: originalType === 'door' ? ({ ...item } as FloorPlan.Door) : undefined,
      startWindow: originalType === 'window' ? ({ ...item } as FloorPlan.Window) : undefined
    };
    buildSelected({
      originalType,
      roomId: room.id,
      doorId: originalType === 'door' ? item.id : undefined,
      windowId: originalType === 'window' ? item.id : undefined
    });
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  const startResize = (
    evt: React.PointerEvent,
    originalType: 'room' | 'furniture',
    handle: 'nw' | 'ne' | 'sw' | 'se',
    room: FloorPlan.Room,
    furniture?: FloorPlan.Furniture
  ) => {
    const p = getSvgPoint(evt);
    dragRef.current = {
      ...dragRef.current,
      mode: 'resize',
      originalType,
      handle,
      roomId: room.id,
      furnitureId: furniture?.id,
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startRoom: { ...room },
      startFurniture: furniture ? { ...furniture } : undefined
    };
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  // 家具旋转：以家具中心为原点，计算指针极角，与起始角度差值即为旋转增量
  const startRotateFurniture = (evt: React.PointerEvent, room: FloorPlan.Room, furniture: FloorPlan.Furniture) => {
    const p = getSvgPoint(evt);
    // 家具中心在 SVG 世界坐标下的位置
    const cx = room.x + furniture.x + furniture.width / 2;
    const cy = room.y + furniture.y + furniture.height / 2;
    // atan2 返回弧度，转为度；以正下方为 0°（与 SVG 旋转方向一致更直观）
    const angle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
    dragRef.current = {
      ...dragRef.current,
      mode: 'rotate',
      originalType: 'furniture',
      roomId: room.id,
      furnitureId: furniture.id,
      startX: p.x,
      startY: p.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startRoom: { ...room },
      startFurniture: { ...furniture },
      startPointerAngle: angle,
      startRotation: furniture.rotation ?? 0
    };
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
  };

  // 拖拽节流：用 rAF 合并多个 pointermove 事件为一帧一次 store 更新
  const rafIdRef = useRef<number | null>(null);
  const lastMoveEvtRef = useRef<React.PointerEvent | null>(null);

  const processPointerMove = (evt: React.PointerEvent) => {
    const s = dragRef.current;
    if (s.mode === 'none') return;
    const p = getSvgPoint(evt);
    const dx = p.x - s.startX;
    const dy = p.y - s.startY;

    if (s.mode === 'pan') {
      setViewport((v) => ({
        ...v,
        x: s.startViewportX - dx,
        y: s.startViewportY - dy
      }));
      return;
    }

    if (previewMode) return;

    if (s.mode === 'drag' && s.originalType === 'room' && s.startRoom && s.roomId) {
      const nx = snap(s.startRoom.x + dx);
      const ny = snap(s.startRoom.y + dy);
      updateRoom(s.roomId, { x: nx, y: ny });
      return;
    }

    if (s.mode === 'drag' && s.originalType === 'furniture' && s.startRoom && s.startFurniture && s.roomId && s.furnitureId) {
      const room = s.startRoom;
      const f = s.startFurniture;
      const nx = clamp(snap(f.x + dx), 0, Math.max(0, room.width - f.width));
      const ny = clamp(snap(f.y + dy), 0, Math.max(0, room.height - f.height));
      updateFurniture(s.roomId, s.furnitureId, { x: nx, y: ny });
      return;
    }

    if (s.mode === 'drag' && (s.originalType === 'door' || s.originalType === 'window') && s.startRoom && s.roomId) {
      const room = s.startRoom;
      const edge = getNearestEdge(room, p);
      const widthAlongWall = s.originalType === 'door' ? (s.startDoor?.width ?? 80) : (s.startWindow?.width ?? 100);
      const offset =
        edge === 'top' || edge === 'bottom'
          ? snap(clamp(p.x - room.x - widthAlongWall / 2, 0, Math.max(0, room.width - widthAlongWall)))
          : snap(clamp(p.y - room.y - widthAlongWall / 2, 0, Math.max(0, room.height - widthAlongWall)));

      if (s.originalType === 'door' && s.doorId) {
        updateDoor(s.roomId, s.doorId, { position: edge as any, offset });
      }
      if (s.originalType === 'window' && s.windowId) {
        updateWindow(s.roomId, s.windowId, { position: edge as any, offset });
      }
      return;
    }

    if (s.mode === 'rotate' && s.originalType === 'furniture' && s.startRoom && s.startFurniture && s.roomId && s.furnitureId) {
      const room = s.startRoom;
      const f = s.startFurniture;
      const cx = room.x + f.x + f.width / 2;
      const cy = room.y + f.y + f.height / 2;
      const currentAngle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      let next = (s.startRotation ?? 0) + (currentAngle - (s.startPointerAngle ?? 0));
      // 规范到 [0, 360)
      next = ((next % 360) + 360) % 360;
      // 按住 Shift 时按 15° 步进吸附（便于快速对齐到 0/90/180/270）
      if (evt.shiftKey) {
        next = Math.round(next / 15) * 15;
        if (next === 360) next = 0;
      }
      updateFurniture(s.roomId, s.furnitureId, { rotation: next });
      return;
    }

    if (s.mode === 'resize' && s.startRoom && s.roomId) {
      const minSize = 50;

      if (s.originalType === 'room') {
        const r = s.startRoom;
        let x = r.x;
        let y = r.y;
        let w = r.width;
        let h = r.height;

        if (s.handle === 'se') {
          w = Math.max(minSize, snap(r.width + dx));
          h = Math.max(minSize, snap(r.height + dy));
        } else if (s.handle === 'sw') {
          w = Math.max(minSize, snap(r.width - dx));
          h = Math.max(minSize, snap(r.height + dy));
          x = snap(r.x + (r.width - w));
        } else if (s.handle === 'ne') {
          w = Math.max(minSize, snap(r.width + dx));
          h = Math.max(minSize, snap(r.height - dy));
          y = snap(r.y + (r.height - h));
        } else {
          w = Math.max(minSize, snap(r.width - dx));
          h = Math.max(minSize, snap(r.height - dy));
          x = snap(r.x + (r.width - w));
          y = snap(r.y + (r.height - h));
        }

        updateRoom(s.roomId, { x, y, width: w, height: h });
        return;
      }

      if (s.originalType === 'furniture' && s.startFurniture && s.furnitureId) {
        const room = s.startRoom;
        const f = s.startFurniture;

        let x = f.x;
        let y = f.y;
        let w = f.width;
        let h = f.height;

        if (s.handle === 'se') {
          w = Math.max(10, snap(f.width + dx));
          h = Math.max(10, snap(f.height + dy));
        } else if (s.handle === 'sw') {
          w = Math.max(10, snap(f.width - dx));
          h = Math.max(10, snap(f.height + dy));
          x = snap(f.x + (f.width - w));
        } else if (s.handle === 'ne') {
          w = Math.max(10, snap(f.width + dx));
          h = Math.max(10, snap(f.height - dy));
          y = snap(f.y + (f.height - h));
        } else {
          w = Math.max(10, snap(f.width - dx));
          h = Math.max(10, snap(f.height - dy));
          x = snap(f.x + (f.width - w));
          y = snap(f.y + (f.height - h));
        }

        x = clamp(x, 0, Math.max(0, room.width - w));
        y = clamp(y, 0, Math.max(0, room.height - h));

        updateFurniture(s.roomId, s.furnitureId, { x, y, width: w, height: h });
      }
    }
  };

  const onPointerMove = (evt: React.PointerEvent) => {
    if (dragRef.current.mode === 'none') return;
    lastMoveEvtRef.current = evt;
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const evt2 = lastMoveEvtRef.current;
      if (evt2) processPointerMove(evt2);
    });
  };

  const onPointerUp = () => {
    // 取消可能挂起的帧，确保最后一次 move 被处理
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      const evt2 = lastMoveEvtRef.current;
      if (evt2) processPointerMove(evt2);
    }
    lastMoveEvtRef.current = null;
    dragRef.current.mode = 'none';
    dragRef.current.originalType = undefined;
    dragRef.current.handle = undefined;
    dragRef.current.roomId = undefined;
    dragRef.current.furnitureId = undefined;
    dragRef.current.doorId = undefined;
    dragRef.current.windowId = undefined;
    dragRef.current.startRoom = undefined;
    dragRef.current.startFurniture = undefined;
    dragRef.current.startDoor = undefined;
    dragRef.current.startWindow = undefined;
    dragRef.current.startPointerAngle = undefined;
    dragRef.current.startRotation = undefined;
  };

  const handleWheel = (evt: React.WheelEvent) => {
    evt.preventDefault();
    const delta = evt.deltaY;
    const factor = 1 - Math.max(-0.2, Math.min(0.2, delta * 0.0015));
    const p = getSvgPoint(evt);

    setViewport((v) => {
      const nextZoom = clamp(v.zoom * factor, 0.2, 4);
      if (nextZoom === v.zoom) return v;

      const oldW = canvasSize.width / v.zoom;
      const oldH = canvasSize.height / v.zoom;
      const newW = canvasSize.width / nextZoom;
      const newH = canvasSize.height / nextZoom;

      const fx = (p.x - v.x) / oldW;
      const fy = (p.y - v.y) / oldH;

      const nx = p.x - fx * newW;
      const ny = p.y - fy * newH;

      return { x: nx, y: ny, zoom: nextZoom };
    });
  };

  const zoomIn = () => setViewport((v) => ({ ...v, zoom: clamp(v.zoom * 1.2, 0.2, 4) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: clamp(v.zoom / 1.2, 0.2, 4) }));

  const handleDrop = (evt: React.DragEvent) => {
    evt.preventDefault();
    if (previewMode) return;
    const raw = evt.dataTransfer.getData('text/plain');
    if (!raw) return;
    let component: any;
    try {
      component = JSON.parse(raw);
    } catch {
      return;
    }

    const p = getSvgPoint(evt);

    if (component.type === 'room') {
      const w = component.width || 300;
      const h = component.height || 300;
      const pos = findNonOverlappingPosition(
        { x: snap(p.x - w / 2), y: snap(p.y - h / 2), width: w, height: h },
        houseConfig.rooms
      );
      addRoom({
        id: genId('room'),
        type: component.roomType ?? 'living',
        name: component.name || '房间',
        width: w,
        height: h,
        x: pos.x,
        y: pos.y,
        color: component.color || '#f0f0f0',
        doors: [],
        windows: [],
        furniture: []
      });
      return;
    }

    const room = findRoomAtPoint(p);
    if (!room) {
      message.warning('请将组件拖拽到房间内部');
      return;
    }

    if (component.type === 'furniture') {
      const w = component.width || 80;
      const h = component.height || 60;
      const fx = clamp(snap(p.x - room.x - w / 2), 0, Math.max(0, room.width - w));
      const fy = clamp(snap(p.y - room.y - h / 2), 0, Math.max(0, room.height - h));

      const furnitureType = component.furnitureType ?? 'table';

      addFurniture(room.id, {
        id: genId('furniture'),
        type: furnitureType,
        name: component.name || '家具',
        width: w,
        height: h,
        x: fx,
        y: fy,
        rotation: 0
      });
      return;
    }

    if (component.type === 'door') {
      const edge = getNearestEdge(room, p);
      const widthAlongWall = component.width || 80;
      const offset =
        edge === 'top' || edge === 'bottom'
          ? snap(clamp(p.x - room.x - widthAlongWall / 2, 0, Math.max(0, room.width - widthAlongWall)))
          : snap(clamp(p.y - room.y - widthAlongWall / 2, 0, Math.max(0, room.height - widthAlongWall)));

      const doorType = component.doorType ?? 'single';

      addDoor(room.id, {
        id: genId('door'),
        type: doorType,
        width: widthAlongWall,
        position: edge as any,
        offset
      });
      return;
    }

    if (component.type === 'window') {
      const edge = getNearestEdge(room, p);
      const widthAlongWall = component.width || 100;
      const offset =
        edge === 'top' || edge === 'bottom'
          ? snap(clamp(p.x - room.x - widthAlongWall / 2, 0, Math.max(0, room.width - widthAlongWall)))
          : snap(clamp(p.y - room.y - widthAlongWall / 2, 0, Math.max(0, room.height - widthAlongWall)));

      const windowType = component.windowType ?? 'regular';

      addWindow(room.id, {
        id: genId('window'),
        type: windowType,
        width: widthAlongWall,
        position: edge as any,
        offset
      });
    }
  };

  const onDragOver = (evt: React.DragEvent) => {
    if (previewMode) return;
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
  };

  const viewBox = useMemo(() => {
    const w = canvasSize.width / viewport.zoom;
    const h = canvasSize.height / viewport.zoom;
    return `${viewport.x} ${viewport.y} ${w} ${h}`;
  }, [canvasSize.height, canvasSize.width, viewport.x, viewport.y, viewport.zoom]);

  const resizeHandles = useMemo(() => ['nw', 'ne', 'sw', 'se'] as const, []);

  const renderResizeHandlesForRoom = (room: FloorPlan.Room) => {
    if (previewMode) return null;
    if (!selectedElement || selectedElement.originalType !== 'room' || selectedElement.roomId !== room.id) return null;

    const points = {
      nw: { x: room.x, y: room.y },
      ne: { x: room.x + room.width, y: room.y },
      sw: { x: room.x, y: room.y + room.height },
      se: { x: room.x + room.width, y: room.y + room.height }
    };

    return (
      <>
        {resizeHandles.map((h) => (
          <rect
            key={h}
            x={points[h].x - 5}
            y={points[h].y - 5}
            width={10}
            height={10}
            fill="#fff"
            stroke="#1890ff"
            strokeWidth={1}
            style={{ cursor: `${h}-resize` as any }}
            onPointerDown={(e) => startResize(e, 'room', h, room)}
          />
        ))}
      </>
    );
  };

  const renderResizeHandlesForFurniture = (room: FloorPlan.Room, furniture: FloorPlan.Furniture) => {
    if (previewMode) return null;
    if (!selectedElement || selectedElement.originalType !== 'furniture') return null;
    if (selectedElement.roomId !== room.id || selectedElement.furnitureId !== furniture.id) return null;

    const ax = room.x + furniture.x;
    const ay = room.y + furniture.y;
    const points = {
      nw: { x: ax, y: ay },
      ne: { x: ax + furniture.width, y: ay },
      sw: { x: ax, y: ay + furniture.height },
      se: { x: ax + furniture.width, y: ay + furniture.height }
    };

    // 旋转手柄：放在家具顶部边中点上方 20px，加一条连接线指示
    const topMidX = ax + furniture.width / 2;
    const topMidY = ay;
    const handleY = topMidY - 20;
    const handleR = 6;

    return (
      <>
        {/* 旋转手柄连接线 */}
        <line
          x1={topMidX}
          y1={topMidY}
          x2={topMidX}
          y2={handleY + handleR}
          stroke="#52c41a"
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />
        {/* 旋转手柄本体 */}
        <circle
          cx={topMidX}
          cy={handleY}
          r={handleR}
          fill="#fff"
          stroke="#52c41a"
          strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => startRotateFurniture(e, room, furniture)}
        />
        {resizeHandles.map((h) => (
          <rect
            key={h}
            x={points[h].x - 4}
            y={points[h].y - 4}
            width={8}
            height={8}
            fill="#fff"
            stroke="#52c41a"
            strokeWidth={1}
            style={{ cursor: `${h}-resize` as any }}
            onPointerDown={(e) => startResize(e, 'furniture', h, room, furniture)}
          />
        ))}
      </>
    );
  };

  // 渲染优化：使用 useMemo 缓存渲染结果
  const renderRoom = (room: FloorPlan.Room) => {
    const isSelected = selectedElement?.originalType === 'room' && selectedElement.roomId === room.id;
    const stroke = isSelected ? '#1890ff' : '#333';
    const strokeWidth = isSelected ? 3 : 2;

    return (
      <g key={room.id}>
        <rect
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          fill={room.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onPointerDown={previewMode ? undefined : (e) => startDragRoom(e, room)}
        />
        <text x={room.x + 8} y={room.y + 18} fontSize={14} fill="#333" style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {room.name}
        </text>
        {houseConfig.showDimensions && (
          <text
            x={room.x + 8}
            y={room.y + 36}
            fontSize={12}
            fill="#666"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {room.width} × {room.height}
          </text>
        )}
        {renderResizeHandlesForRoom(room)}
      </g>
    );
  };

  const renderFurniture = (room: FloorPlan.Room, furniture: FloorPlan.Furniture) => {
    if (!houseConfig.showFurniture) return null;
    const isSelected = selectedElement?.originalType === 'furniture' && selectedElement.roomId === room.id && selectedElement.furnitureId === furniture.id;
    const stroke = isSelected ? '#52c41a' : '#A0522D';

    const x = room.x + furniture.x;
    const y = room.y + furniture.y;
    const rot = furniture.rotation ?? 0;
    const cx = x + furniture.width / 2;
    const cy = y + furniture.height / 2;
    const transform = rot ? `rotate(${rot} ${cx} ${cy})` : undefined;

    return (
      <g key={furniture.id}>
        <g transform={transform}>
          <rect
            x={x}
            y={y}
            width={furniture.width}
            height={furniture.height}
            fill={getFurnitureColor(furniture.type)}
            stroke={stroke}
            strokeWidth={isSelected ? 2 : 1}
            onPointerDown={previewMode ? undefined : (e) => startDragFurniture(e, room, furniture)}
          />
          <text
            x={x + 4}
            y={y + 14}
            fontSize={11}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {furniture.name}
          </text>
        </g>
        {renderResizeHandlesForFurniture(room, furniture)}
      </g>
    );
  };

  const renderDoor = (room: FloorPlan.Room, door: FloorPlan.Door) => {
    const thickness = 20;
    const isVertical = door.position === 'left' || door.position === 'right';
    const w = isVertical ? thickness : door.width;
    const h = door.height ?? (isVertical ? door.width : thickness);
    const x = room.x + (door.x ?? 0);
    const y = room.y + (door.y ?? 0);

    const isSelected = selectedElement?.originalType === 'door' && selectedElement.roomId === room.id && selectedElement.doorId === door.id;
    const stroke = isSelected ? '#faad14' : '#333';

    return (
      <g key={door.id}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="#8c8c8c"
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          onPointerDown={previewMode ? undefined : (e) => startDragDoorOrWindow(e, 'door', room, door)}
        />
      </g>
    );
  };

  const renderWindow = (room: FloorPlan.Room, window: FloorPlan.Window) => {
    const thickness = 15;
    const isVertical = window.position === 'left' || window.position === 'right';
    const w = isVertical ? thickness : window.width;
    const h = window.height ?? (isVertical ? window.width : thickness);
    const x = room.x + (window.x ?? 0);
    const y = room.y + (window.y ?? 0);

    const isSelected = selectedElement?.originalType === 'window' && selectedElement.roomId === room.id && selectedElement.windowId === window.id;
    const stroke = isSelected ? '#faad14' : '#1890ff';

    return (
      <g key={window.id}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="#91d5ff"
          stroke={stroke}
          strokeWidth={isSelected ? 2 : 1}
          onPointerDown={previewMode ? undefined : (e) => startDragDoorOrWindow(e, 'window', room, window)}
        />
      </g>
    );
  };

  return (
    <Card
      className="canvas-area"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>设计画布 {previewMode && '(预览模式)'}</span>
          <Space>
            {!previewMode && (
              <>
                <Tooltip title="添加房间">
                  <Button 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={handleAddRoom}
                  >
                    添加房间
                  </Button>
                </Tooltip>
              </>
            )}
            <Tooltip title="缩小">
              <Button icon={<MinusOutlined />} size="small" onClick={zoomOut} />
            </Tooltip>
            <Tooltip title="放大">
              <Button icon={<PlusOutlined />} size="small" onClick={zoomIn} />
            </Tooltip>
          </Space>
        </div>
      }
      style={{ width: '100%', height: '100%' }}
      bodyStyle={{ 
        padding: 0, 
        height: 'calc(100% - 57px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox}
          onWheel={handleWheel}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const target = e.target as Element;
            const cursor = (target as any).style?.cursor ?? '';
            // resize 手柄（rect + cursor 包含 resize）或旋转手柄（circle + cursor 为 grab）
            const isHandle = (target.tagName === 'rect' && cursor.includes('resize')) ||
                             (target.tagName === 'circle' && cursor === 'grab');
            if (isHandle) return;
            const isElement = target.tagName === 'rect';
            if (isElement) return;
            buildSelected(null);
            startPan(e);
          }}
          onDrop={handleDrop}
          onDragOver={onDragOver}
          style={{ background: semanticColors.grayf5[mode], touchAction: 'none', pointerEvents: 'all' }}
        >
          <defs>
            {houseConfig.showGrid && (
              <pattern
                id="gridPattern"
                width={houseConfig.gridSize}
                height={houseConfig.gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path d={`M ${houseConfig.gridSize} 0 L 0 0 0 ${houseConfig.gridSize}`} fill="none" stroke="#e8e8e8" strokeWidth="1" />
              </pattern>
            )}
          </defs>

          {houseConfig.showGrid && (
            <rect
              x={viewport.x - 2000}
              y={viewport.y - 2000}
              width={canvasSize.width / viewport.zoom + 4000}
              height={canvasSize.height / viewport.zoom + 4000}
              fill="url(#gridPattern)"
              pointerEvents="none"
            />
          )}

          {houseConfig.rooms.map((room) => (
            <g key={`layer-${room.id}`}>
              {renderRoom(room)}
              {room.doors.map((d) => renderDoor(room, d))}
              {room.windows.map((w) => renderWindow(room, w))}
              {room.furniture.map((f) => renderFurniture(room, f))}
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
};

export default CanvasArea;
