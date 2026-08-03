import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import './Ruler.scss';

interface RulerProps {
  zoom: number;
}

/** 标尺厚度（px） */
const RULER_SIZE = 18;
/** 主刻度间距（画布坐标，px） */
const MAJOR_INTERVAL = 100;
/** 次刻度间距（画布坐标，px） */
const MINOR_INTERVAL = 20;
/** canvas-container 的 padding-left/top（需与 CanvasArea.scss 一致） */
const CANVAS_PADDING = 16;

/**
 * 画布标尺
 * - 顶部水平 + 左侧垂直刻度尺
 * - 跟随画布缩放（zoom）和滚动（scrollLeft/scrollTop）
 * - 由 store.alignmentGuidesVisible 控制显隐（与 📏 按钮联动）
 * - 返回 3 个 grid 子元素（corner / top / left），由父级 grid 布局定位
 * - 通过监听同级的 canvas-container 的 scroll/resize 同步刻度
 */
const Ruler: React.FC<RulerProps> = ({ zoom }) => {
  const visible = useCanvasStore((s) => s.alignmentGuidesVisible);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const topRef = useRef<HTMLDivElement>(null);

  // 监听同级 canvas-container 的 scroll 和 resize
  useEffect(() => {
    if (!visible) return;

    const findScrollContainer = (): HTMLElement | null => {
      const wrapper = topRef.current?.parentElement;
      if (!wrapper) return null;
      return wrapper.querySelector('.canvas-container');
    };

    const container = findScrollContainer();
    if (!container) return;

    const update = () => {
      setScroll({ left: container.scrollLeft, top: container.scrollTop });
      setViewport({ width: container.clientWidth, height: container.clientHeight });
    };

    // 延迟一帧确保 DOM 完成布局
    const raf = requestAnimationFrame(update);
    container.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [visible]);

  // 生成水平刻度 SVG
  const topSvg = useCallback(() => {
    const z = zoom;
    const screenMinor = MINOR_INTERVAL * z;
    const startCanvas = Math.floor((scroll.left - CANVAS_PADDING) / screenMinor) * MINOR_INTERVAL;
    const endCanvas = startCanvas + (viewport.width + screenMinor) / z;
    const ticks: React.ReactElement[] = [];
    for (let v = startCanvas; v <= endCanvas; v += MINOR_INTERVAL) {
      const screenX = v * z + CANVAS_PADDING - scroll.left;
      const isMajor = v % MAJOR_INTERVAL === 0;
      ticks.push(
        <g key={`h-${v}`}>
          <line
            x1={screenX}
            y1={RULER_SIZE - (isMajor ? 10 : 5)}
            x2={screenX}
            y2={RULER_SIZE}
            stroke={isMajor ? '#666' : '#aaa'}
            strokeWidth="1"
          />
          {isMajor && v >= 0 && (
            <text x={screenX + 2} y={10} fill="#888" fontSize="9" fontFamily="monospace">
              {v}
            </text>
          )}
        </g>
      );
    }
    return (
      <svg className="ruler-svg-top" width={viewport.width} height={RULER_SIZE}>
        {ticks}
      </svg>
    );
  }, [zoom, scroll.left, viewport.width]);

  // 生成垂直刻度 SVG
  const leftSvg = useCallback(() => {
    const z = zoom;
    const screenMinor = MINOR_INTERVAL * z;
    const startCanvas = Math.floor((scroll.top - CANVAS_PADDING) / screenMinor) * MINOR_INTERVAL;
    const endCanvas = startCanvas + (viewport.height + screenMinor) / z;
    const ticks: React.ReactElement[] = [];
    for (let v = startCanvas; v <= endCanvas; v += MINOR_INTERVAL) {
      const screenY = v * z + CANVAS_PADDING - scroll.top;
      const isMajor = v % MAJOR_INTERVAL === 0;
      ticks.push(
        <g key={`v-${v}`}>
          <line
            x1={RULER_SIZE - (isMajor ? 10 : 5)}
            y1={screenY}
            x2={RULER_SIZE}
            y2={screenY}
            stroke={isMajor ? '#666' : '#aaa'}
            strokeWidth="1"
          />
          {isMajor && v >= 0 && (
            <text
              x={5}
              y={screenY + 4}
              fill="#888"
              fontSize="9"
              fontFamily="monospace"
              transform={`rotate(-90, 5, ${screenY})`}
            >
              {v}
            </text>
          )}
        </g>
      );
    }
    return (
      <svg className="ruler-svg-left" width={RULER_SIZE} height={viewport.height}>
        {ticks}
      </svg>
    );
  }, [zoom, scroll.top, viewport.height]);

  if (!visible) return null;

  return (
    <>
      {/* 左上角方块（grid 1,1） */}
      <div className="ruler-corner" />
      {/* 顶部水平标尺（grid 1,2） */}
      <div ref={topRef} className="ruler-top-wrapper">
        {topSvg()}
      </div>
      {/* 左侧垂直标尺（grid 2,1） */}
      <div className="ruler-left-wrapper">
        {leftSvg()}
      </div>
    </>
  );
};

export default Ruler;
