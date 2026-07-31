import React from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import './AlignmentGuides.scss';

interface AlignmentGuidesProps {}

/**
 * 对齐参考线 overlay
 * - 订阅 store 中的 alignmentGuides（画布坐标，未缩放）
 * - 通过 SVG 绘制水平/垂直红色参考线
 * - 父容器 .node-tree 已应用 transform: scale(zoom)，本组件坐标用画布坐标即可
 */
const AlignmentGuides: React.FC<AlignmentGuidesProps> = () => {
  const guides = useCanvasStore((s) => s.alignmentGuides);
  const visible = useCanvasStore((s) => s.alignmentGuidesVisible);

  if (!visible || !guides) return null;

  const { horizontal, vertical } = guides;
  if (horizontal.length === 0 && vertical.length === 0) return null;

  // 用一个足够大的画布范围绘制（参考线两端延伸到视口边界）
  // 由于父容器 .node-tree 宽度 100/zoom%，这里用百分比定位避免硬编码尺寸
  return (
    <div className="alignment-guides-overlay" aria-hidden>
      {horizontal.map((y, i) => (
        <div
          key={`h-${i}`}
          className="alignment-guide alignment-guide--horizontal"
          style={{ top: `${y}px` }}
        />
      ))}
      {vertical.map((x, i) => (
        <div
          key={`v-${i}`}
          className="alignment-guide alignment-guide--vertical"
          style={{ left: `${x}px` }}
        />
      ))}
    </div>
  );
};

export default AlignmentGuides;
