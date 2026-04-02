import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, message, Space, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useFloorPlanStore } from '../store/useFloorPlanStore';

interface CanvasAreaProps {
  previewMode?: boolean;
  onElementSelect?: (element: any) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ previewMode = false, onElementSelect }) => {
  const {
    houseConfig,
    addRoom,
    updateRoom,
    addFurniture,
    updateFurniture,
    addDoor,
    updateDoor,
    addWindow,
    updateWindow
  } = useFloorPlanStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'pan' | 'drag' | 'resize';
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
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startViewportX: 0,
    startViewportY: 0
  });

  const [selected, setSelected] = useState<any>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const canvasSize = useMemo(() => ({ width: 1200, height: 800 }), []);

  const getFurnitureColor = (type: string): string => {
    const colors: Record<string, string> = {
      bed: '#d9d9d9',
      sofa: '#d9d9d9',
      table: '#d9d9d9',
      chair: '#d9d9d9',
      cabinet: '#d9d9d9',
      desk: '#d9d9d9',
      wardrobe: '#d9d9d9',
      refrigerator: '#d9d9d9',
      stove: '#d9d9d9',
      sink: '#d9d9d9'
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

  const buildSelected = (payload: any) => {
    setSelected(payload);
    onElementSelect?.(payload);
  };

  const handleAddRoom = () => {
    const ts = Date.now();
    const newRoom: FloorPlan.Room = {
      id: `room-${ts}`,
      type: 'living',
      name: '新房间',
      width: 300,
      height: 300,
      x: snap(100),
      y: snap(100),
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
      if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) return r;
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
    buildSelected({
      id: `room-${room.id}`,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      fill: room.color,
      metadata: { originalType: 'room', roomId: room.id, type: room.type }
    });
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
    buildSelected({
      id: `furniture-${furniture.id}`,
      x: room.x + furniture.x,
      y: room.y + furniture.y,
      width: furniture.width,
      height: furniture.height,
      rotation: furniture.rotation,
      fill: getFurnitureColor(furniture.type),
      metadata: { originalType: 'furniture', roomId: room.id, furnitureId: furniture.id, type: furniture.type }
    });
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
      id: `${originalType}-${item.id}`,
      x: room.x + (item.x ?? 0),
      y: room.y + (item.y ?? 0),
      width: originalType === 'door' ? (item.position === 'left' || item.position === 'right' ? 20 : item.width) : (item.position === 'left' || item.position === 'right' ? 15 : item.width),
      height: item.height ?? (originalType === 'door' ? 20 : 15),
      fill: originalType === 'door' ? '#8c8c8c' : '#91d5ff',
      metadata: {
        originalType,
        roomId: room.id,
        doorId: originalType === 'door' ? item.id : undefined,
        windowId: originalType === 'window' ? item.id : undefined,
        type: item.type
      }
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

  const onPointerMove = (evt: React.PointerEvent) => {
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

  const onPointerUp = () => {
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
  };

  const handleWheel = (evt: React.WheelEvent) => {
    evt.preventDefault();
    const delta = evt.deltaY;
    const factor = 1 - Math.max(-0.2, Math.min(0.2, delta * 0.0015));
    const nextZoom = clamp(viewport.zoom * factor, 0.2, 4);
    if (nextZoom === viewport.zoom) return;

    const p = getSvgPoint(evt);
    const oldW = canvasSize.width / viewport.zoom;
    const oldH = canvasSize.height / viewport.zoom;
    const newW = canvasSize.width / nextZoom;
    const newH = canvasSize.height / nextZoom;

    const fx = (p.x - viewport.x) / oldW;
    const fy = (p.y - viewport.y) / oldH;

    const nx = p.x - fx * newW;
    const ny = p.y - fy * newH;

    setViewport({ x: nx, y: ny, zoom: nextZoom });
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
    const ts = Date.now();

    if (component.type === 'room') {
      const inferredType: FloorPlan.RoomType =
        component.id?.includes('bedroom') || component.name?.includes('卧室')
          ? 'bedroom'
          : component.id?.includes('kitchen') || component.name?.includes('厨房')
            ? 'kitchen'
            : component.id?.includes('bathroom') || component.name?.includes('卫生间')
              ? 'bathroom'
              : component.id?.includes('dining') || component.name?.includes('餐厅')
                ? 'dining'
                : 'living';

      addRoom({
        id: `room-${ts}`,
        type: inferredType,
        name: component.name || '房间',
        width: component.width || 300,
        height: component.height || 300,
        x: snap(p.x - (component.width || 300) / 2),
        y: snap(p.y - (component.height || 300) / 2),
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

      addFurniture(room.id, {
        id: `furniture-${ts}`,
        type: component.id?.includes('sofa')
          ? 'sofa'
          : component.id?.includes('table')
            ? 'table'
            : component.id?.includes('chair')
              ? 'chair'
              : component.id?.includes('cabinet')
                ? 'cabinet'
                : component.id?.includes('bed')
                  ? 'bed'
                  : 'table',
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

      addDoor(room.id, {
        id: `door-${ts}`,
        type: component.id?.includes('double') ? 'double' : 'single',
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

      addWindow(room.id, {
        id: `window-${ts}`,
        type: component.id?.includes('bay') ? 'bay' : 'regular',
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
    if (!selected?.metadata || selected.metadata.originalType !== 'room' || selected.metadata.roomId !== room.id) return null;

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
    if (!selected?.metadata || selected.metadata.originalType !== 'furniture') return null;
    if (selected.metadata.roomId !== room.id || selected.metadata.furnitureId !== furniture.id) return null;

    const ax = room.x + furniture.x;
    const ay = room.y + furniture.y;
    const points = {
      nw: { x: ax, y: ay },
      ne: { x: ax + furniture.width, y: ay },
      sw: { x: ax, y: ay + furniture.height },
      se: { x: ax + furniture.width, y: ay + furniture.height }
    };

    return (
      <>
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

  const renderRoom = (room: FloorPlan.Room) => {
    const isSelected = selected?.metadata?.originalType === 'room' && selected.metadata.roomId === room.id;
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
    const isSelected =
      selected?.metadata?.originalType === 'furniture' &&
      selected.metadata.roomId === room.id &&
      selected.metadata.furnitureId === furniture.id;
    const stroke = isSelected ? '#52c41a' : '#A0522D';

    const x = room.x + furniture.x;
    const y = room.y + furniture.y;

    return (
      <g key={furniture.id}>
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

    const isSelected = selected?.metadata?.originalType === 'door' && selected.metadata.roomId === room.id && selected.metadata.doorId === door.id;
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

    const isSelected =
      selected?.metadata?.originalType === 'window' && selected.metadata.roomId === room.id && selected.metadata.windowId === window.id;
    const stroke = isSelected ? '#1890ff' : '#1890ff';

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
      onDrop={handleDrop}
      onDragOver={onDragOver}
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
            const isHandle = target.tagName === 'rect' && (target as any).style?.cursor?.includes('resize');
            if (isHandle) return;
            const isElement = target.tagName === 'rect';
            if (isElement) return;
            buildSelected(null);
            startPan(e);
          }}
          style={{ background: '#f5f5f5', touchAction: 'none' }}
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
