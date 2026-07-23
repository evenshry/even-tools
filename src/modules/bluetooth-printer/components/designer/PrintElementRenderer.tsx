// 打印元素渲染器 - 单个元素的预览渲染
// 用于编辑画布和打印预览

import React, { useMemo } from 'react';
import type {
  PrintElement, TextElement, BarcodeElement, QrCodeElement,
  DividerElement, TableElement, ImageElement, Alignment,
} from '../../data/interface';
import { generateQrMatrix } from '../../utils/escPos/qrEncoder';

interface RendererProps {
  element: PrintElement;
  paperWidth?: number; // 纸张字符宽度 (用于分割线)
}

const ALIGN_STYLE: Record<Alignment, React.CSSProperties> = {
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
};

// ===== 文本元素 =====
const TextRenderer: React.FC<{ el: TextElement }> = ({ el }) => {
  const fontSizePx = 14 + (el.fontSize - 1) * 6;
  return (
    <div
      style={{
        ...ALIGN_STYLE[el.alignment],
        fontSize: fontSizePx,
        fontWeight: el.bold ? 700 : 400,
        textDecoration: el.underline === 2 ? 'underline double' : el.underline === 1 ? 'underline' : 'none',
        lineHeight: 1.4,
        whiteSpace: el.wrap ? 'pre-wrap' : 'pre',
        wordBreak: el.wrap ? 'break-all' : 'normal',
        overflow: el.wrap ? 'hidden' : 'visible',
      }}
    >
      {el.content || '(空文本)'}
    </div>
  );
};

// ===== 分割线元素 =====
const DividerRenderer: React.FC<{ el: DividerElement; paperWidth: number }> = ({ el, paperWidth }) => {
  const ch = el.char && el.char.length > 0 ? el.char[0] : '-';
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1, overflow: 'hidden' }}>
      {ch.repeat(paperWidth)}
    </div>
  );
};

// ===== 二维码元素 =====
const QrCodeRenderer: React.FC<{ el: QrCodeElement }> = ({ el }) => {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(el.content || ' ', el.errorLevel);
    } catch {
      return null;
    }
  }, [el.content, el.errorLevel]);

  if (!matrix || matrix.length === 0) {
    return <div style={{ ...ALIGN_STYLE[el.alignment], color: '#999', fontSize: 12 }}>(二维码生成失败)</div>;
  }

  const size = matrix.length;
  const cellSize = Math.max(2, Math.min(8, el.size));
  const px = size * cellSize;

  return (
    <div style={{ ...ALIGN_STYLE[el.alignment] }}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${size} ${size}`}
        style={{ imageRendering: 'pixelated' }}
      >
        <rect width={size} height={size} fill="#fff" />
        {matrix.map((row, y) =>
          row.map((on, x) =>
            on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null
          )
        )}
      </svg>
    </div>
  );
};

// ===== 条码元素 (简化渲染) =====
const BarcodeRenderer: React.FC<{ el: BarcodeElement }> = ({ el }) => {
  // 简化渲染：用等宽竖线模拟条码
  const bars = useMemo(() => {
    const seed = el.content || '0';
    const arr: number[] = [];
    let h = 0;
    for (let i = 0; i < seed.length * 8; i++) {
      h = (h * 31 + seed.charCodeAt(i % seed.length)) & 0xffff;
      arr.push((h & 0xff) % 3 === 0 ? 1 : 2); // 1=窄 2=宽
    }
    return arr;
  }, [el.content]);

  const barWidth = el.width;
  const height = Math.min(el.height, 60);

  return (
    <div style={{ ...ALIGN_STYLE[el.alignment] }}>
      <div style={{ display: 'inline-block' }}>
        <div style={{ display: 'flex', height, alignItems: 'stretch' }}>
          {bars.map((w, i) => (
            <div
              key={i}
              style={{
                width: w * barWidth,
                background: i % 2 === 0 ? '#000' : '#fff',
              }}
            />
          ))}
        </div>
        {el.showText && (
          <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, marginTop: 2 }}>
            {el.content}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== 表格元素 =====
const TableRenderer: React.FC<{ el: TableElement; paperWidth: number }> = ({ el, paperWidth }) => {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        {el.columns.map((col, i) => (
          <div
            key={i}
            style={{
              flex: col.width,
              padding: '2px 4px',
              fontWeight: 700,
              ...ALIGN_STYLE[el.alignment],
            }}
          >
            {col.header}
          </div>
        ))}
      </div>
      {el.rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', borderTop: '1px dashed #ccc' }}>
          {el.columns.map((_, ci) => (
            <div
              key={ci}
              style={{
                flex: el.columns[ci].width,
                padding: '2px 4px',
                ...ALIGN_STYLE[el.alignment],
              }}
            >
              {row[ci] || ''}
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        (表格 {el.columns.length} 列 × {el.rows.length} 行，纸宽 {paperWidth} 字符)
      </div>
    </div>
  );
};

// ===== 图片元素 =====
const ImageRenderer: React.FC<{ el: ImageElement }> = ({ el }) => {
  if (!el.src) {
    return <div style={{ ...ALIGN_STYLE[el.alignment], color: '#999', fontSize: 12 }}>(无图片)</div>;
  }
  return (
    <div style={{ ...ALIGN_STYLE[el.alignment] }}>
      <img
        src={el.src}
        alt="print"
        style={{ maxWidth: '100%', filter: 'grayscale(100%) contrast(1.2)' }}
      />
    </div>
  );
};

// ===== 主渲染器 =====
const PrintElementRenderer: React.FC<RendererProps> = ({ element, paperWidth = 32 }) => {
  switch (element.type) {
    case 'text': return <TextRenderer el={element} />;
    case 'divider': return <DividerRenderer el={element} paperWidth={paperWidth} />;
    case 'qrcode': return <QrCodeRenderer el={element} />;
    case 'barcode': return <BarcodeRenderer el={element} />;
    case 'table': return <TableRenderer el={element} paperWidth={paperWidth} />;
    case 'image': return <ImageRenderer el={element} />;
    default: return <div style={{ color: '#999' }}>(未知元素)</div>;
  }
};

export default PrintElementRenderer;
