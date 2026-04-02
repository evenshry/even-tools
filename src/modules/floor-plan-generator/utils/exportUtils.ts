// 导出工具函数
export class ExportUtils {
  static createSVGStringFromConfig(config: FloorPlan.HouseConfig) {
    const thicknessDoor = 20;
    const thicknessWindow = 15;

    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    const expand = (x: number, y: number, w: number, h: number) => {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x + w);
      bounds.maxY = Math.max(bounds.maxY, y + h);
    };

    config.rooms.forEach((room) => {
      expand(room.x, room.y, room.width, room.height);

      room.furniture.forEach((f) => expand(room.x + f.x, room.y + f.y, f.width, f.height));

      room.doors.forEach((d) => {
        const isVertical = d.position === 'left' || d.position === 'right';
        const w = isVertical ? thicknessDoor : d.width;
        const h = d.height ?? (isVertical ? d.width : thicknessDoor);
        expand(room.x + (d.x ?? 0), room.y + (d.y ?? 0), w, h);
      });

      room.windows.forEach((w0) => {
        const isVertical = w0.position === 'left' || w0.position === 'right';
        const w = isVertical ? thicknessWindow : w0.width;
        const h = w0.height ?? (isVertical ? w0.width : thicknessWindow);
        expand(room.x + (w0.x ?? 0), room.y + (w0.y ?? 0), w, h);
      });
    });

    if (!isFinite(bounds.minX) || !isFinite(bounds.minY)) {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = 1000;
      bounds.maxY = 800;
    }

    const padding = 40;
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);

    const rect = (x: number, y: number, w: number, h: number, fill: string, stroke: string, strokeWidth: number) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

    const text = (x: number, y: number, content: string, fontSize: number, fill: string) =>
      `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${this.escapeXml(
        content
      )}</text>`;

    let body = '';

    config.rooms.forEach((room) => {
      body += rect(room.x, room.y, room.width, room.height, room.color, '#333', 2);
      body += text(room.x + 8, room.y + 18, room.name, 14, '#333');
      if (config.showDimensions) body += text(room.x + 8, room.y + 36, `${room.width} × ${room.height}`, 12, '#666');

      room.doors.forEach((d) => {
        const isVertical = d.position === 'left' || d.position === 'right';
        const w = isVertical ? thicknessDoor : d.width;
        const h = d.height ?? (isVertical ? d.width : thicknessDoor);
        body += rect(room.x + (d.x ?? 0), room.y + (d.y ?? 0), w, h, '#8c8c8c', '#333', 1);
      });

      room.windows.forEach((w0) => {
        const isVertical = w0.position === 'left' || w0.position === 'right';
        const w = isVertical ? thicknessWindow : w0.width;
        const h = w0.height ?? (isVertical ? w0.width : thicknessWindow);
        body += rect(room.x + (w0.x ?? 0), room.y + (w0.y ?? 0), w, h, '#91d5ff', '#1890ff', 1);
      });

      if (config.showFurniture) {
        room.furniture.forEach((f) => {
          body += rect(room.x + f.x, room.y + f.y, f.width, f.height, '#d9d9d9', '#A0522D', 1);
          body += text(room.x + f.x + 4, room.y + f.y + 14, f.name, 11, '#333');
        });
      }
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">${body}</svg>`;
  }

  static exportConfigAsSVG(config: FloorPlan.HouseConfig, filename: string = 'floor-plan.svg') {
    const svgString = this.createSVGStringFromConfig(config);
    const svgBlob = new Blob(
      [
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
          svgString
      ],
      { type: 'image/svg+xml;charset=utf-8' }
    );
    this.downloadFile(svgBlob, filename);
  }

  static exportConfigAsPNG(config: FloorPlan.HouseConfig, filename: string = 'floor-plan.png') {
    const svgString = this.createSVGStringFromConfig(config);
    const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.documentElement as unknown as SVGSVGElement;
    return this.exportAsPNG(svgEl, filename);
  }

  static copyConfigSVGToClipboard(config: FloorPlan.HouseConfig) {
    const svgString = this.createSVGStringFromConfig(config);
    return navigator.clipboard.writeText(svgString);
  }

  // 导出为SVG文件
  static exportAsSVG(svgElement: SVGSVGElement, filename: string = 'floor-plan.svg') {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    
    // 添加XML声明
    const svgBlob = new Blob([
      '<?xml version="1.0" encoding="UTF-8"?>\n' + 
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + 
      source
    ], { type: 'image/svg+xml;charset=utf-8' });
    
    this.downloadFile(svgBlob, filename);
  }

  // 导出为PNG文件
  static exportAsPNG(svgElement: SVGSVGElement, filename: string = 'floor-plan.png') {
    return new Promise<void>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'));
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            this.downloadFile(blob, filename);
            URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error('无法创建PNG文件'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      
      img.src = url;
    });
  }

  // 导出配置为JSON文件
  static exportAsJSON(config: FloorPlan.HouseConfig, filename: string = 'floor-plan-config.json') {
    const jsonBlob = new Blob([JSON.stringify(config, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    this.downloadFile(jsonBlob, filename);
  }

  // 下载文件
  private static downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 复制SVG到剪贴板
  static copySVGToClipboard(svgElement: SVGSVGElement): Promise<void> {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    
    return navigator.clipboard.writeText(source);
  }

  private static escapeXml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
