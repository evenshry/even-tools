import React from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import { NodeType, type EventsConfig } from "../types";
import { buildNodeStyle } from "../utils/styleUtils";

interface PreviewRendererProps {
  nodeId: string;
}

/**
 * 将可序列化的事件配置映射为真实的 React 事件处理器
 * 对应 types/index.ts 中 EventConfig 的 actionType
 */
const buildEventHandlers = (events: EventsConfig | undefined) => {
  const handlers: {
    onClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
  } = {};

  if (!events) return handlers;

  const resolve = (actionType: string, payload?: string) => {
    switch (actionType) {
      case "alert":
        return () => window.alert(payload || "");
      case "navigate":
        return () => {
          if (!payload) return;
          // 校验协议：仅允许 http/https，防止 javascript: 等 URL 注入
          try {
            const url = new URL(payload, window.location.href);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
            // 在新窗口打开，避免直接跳离编辑器导致未保存内容丢失
            window.open(url.href, '_blank', 'noopener,noreferrer');
          } catch {
            // 无效 URL，忽略
          }
        };
      case "toggleVisibility": {
        return () => {
          if (!payload) return;
          // 预览模式下仅在本地切换 DOM 显示，不写入 store，避免污染历史与 isDirty
          const target = Array.from(document.querySelectorAll<HTMLElement>('[data-preview-id]'))
            .find((el) => el.dataset.previewId === payload);
          if (!target) return;
          if (target.style.display === 'none') {
            target.style.display = target.dataset.originalDisplay ?? '';
            delete target.dataset.originalDisplay;
          } else {
            target.dataset.originalDisplay = target.style.display;
            target.style.display = 'none';
          }
        };
      }
      case "custom":
        // 自定义动作预留：暂不执行用户表达式，避免 eval
        return undefined;
      default:
        return undefined;
    }
  };

  if (events.onClick) {
    const fn = resolve(events.onClick.actionType, events.onClick.payload);
    if (fn) handlers.onClick = fn;
  }
  // onHover 在鼠标进入时触发一次动作（离开不触发）
  if (events.onHover) {
    const fn = resolve(events.onHover.actionType, events.onHover.payload);
    if (fn) handlers.onMouseEnter = fn;
  }

  return handlers;
};

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ nodeId }) => {
  // 精确订阅单个节点：避免任一节点变化导致所有 PreviewRenderer 重渲染
  const node = useCanvasStore((s) => s.nodes[nodeId]);

  if (!node) {
    return <div>节点不存在</div>;
  }

  // 通过 children ID 数组直接查表（O(k)），避免遍历整个 nodes
  const childIds = node.content.children || [];
  const eventHandlers = buildEventHandlers(node.events);

  // 画布 / 预览共用同一套样式映射
  const nodeStyle = buildNodeStyle(node);

  const renderChildren = () =>
    childIds.map((cid) => <PreviewRenderer key={cid} nodeId={cid} />);

  /** 统一的节点标识，供 toggleVisibility 在预览内定位目标 */
  const previewIdProps = { 'data-preview-id': nodeId };

  // 根据节点类型渲染不同的内容
  switch (node.type) {
    case NodeType.SECTION:
      return (
        <section className="preview-section" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {renderChildren()}
        </section>
      );

    case NodeType.CONTAINER:
      return (
        <div className="preview-container" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {renderChildren()}
        </div>
      );

    case NodeType.DIV:
      return (
        <div className="preview-div" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text ? <div>{node.content.text}</div> : null}
          {renderChildren()}
        </div>
      );

    case NodeType.FORM:
    case NodeType.STACK:
    case NodeType.PAGE:
      return (
        <div style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {renderChildren()}
        </div>
      );

    case NodeType.FLEX:
      return (
        <div
          className="preview-flex"
          style={{
            ...nodeStyle,
            display: "flex",
            flexDirection: node.layout.flexDirection || "row",
            flexWrap: node.layout.flexWrap || "nowrap",
          }}
          {...previewIdProps}
          {...eventHandlers}
        >
          {renderChildren()}
        </div>
      );

    case NodeType.GRID:
      return (
        <div
          className="preview-grid"
          style={{
            ...nodeStyle,
            display: "grid",
            gridTemplateColumns: node.layout.gridTemplateColumns || "1fr",
            gridTemplateRows: node.layout.gridTemplateRows || "auto",
          }}
          {...previewIdProps}
          {...eventHandlers}
        >
          {renderChildren()}
        </div>
      );

    case NodeType.TEXT:
      return (
        <div className="preview-text" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text || "文本内容"}
        </div>
      );

    case NodeType.HEADING:
      return (
        <h2 className="preview-heading" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text || "标题"}
        </h2>
      );

    case NodeType.SPAN:
      return (
        <span className="preview-span" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text || ""}
        </span>
      );

    case NodeType.BUTTON:
      return (
        <button className="preview-button" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text || "按钮"}
        </button>
      );

    case NodeType.IMAGE:
      return node.content.src ? (
        <img
          className="preview-image"
          src={node.content.src}
          alt={node.name}
          style={nodeStyle}
          {...previewIdProps}
          {...eventHandlers}
        />
      ) : (
        <div
          className="preview-image-empty"
          style={{
            ...nodeStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: nodeStyle.backgroundColor ?? '#f5f5f5',
            color: '#999',
          }}
          {...previewIdProps}
          {...eventHandlers}
        >
          图片
        </div>
      );

    case NodeType.INPUT:
      return (
        <input
          className="preview-input"
          type="text"
          placeholder={node.content.text || "请输入内容"}
          style={nodeStyle}
          {...previewIdProps}
          {...eventHandlers}
        />
      );

    case NodeType.SELECT:
      return (
        <select className="preview-select" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          <option>{node.content.text || "请选择"}</option>
        </select>
      );

    case NodeType.CHECKBOX:
      return (
        <label className="preview-checkbox" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          <input type="checkbox" />
          <span>{node.content.text || "复选框"}</span>
        </label>
      );

    case NodeType.VIDEO:
      return node.content.src ? (
        <video
          className="preview-video"
          src={node.content.src}
          style={nodeStyle}
          controls
          {...previewIdProps}
          {...eventHandlers}
        />
      ) : (
        <div
          style={{
            ...nodeStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: nodeStyle.backgroundColor ?? '#f5f5f5',
            color: '#999',
          }}
          {...previewIdProps}
          {...eventHandlers}
        >
          视频
        </div>
      );

    case NodeType.ICON:
      return (
        <div className="preview-icon" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {node.content.text || "⭐"}
        </div>
      );

    default:
      return (
        <div className="preview-unknown" style={nodeStyle} {...previewIdProps} {...eventHandlers}>
          {renderChildren()}
        </div>
      );
  }
};

export default PreviewRenderer;
