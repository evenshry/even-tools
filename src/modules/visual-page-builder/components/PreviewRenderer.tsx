import React from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import { NodeType, type EventsConfig } from "../types";

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
            window.location.href = url.href;
          } catch {
            // 无效 URL，忽略
          }
        };
      case "toggleVisibility": {
        return () => {
          if (!payload) return;
          const store = useCanvasStore.getState();
          const target = store.nodes[payload];
          if (!target) return;
          const hidden = target.layout.display === "none";
          store.updateNode(payload, {
            layout: { ...target.layout, display: hidden ? "block" : "none" },
          });
        };
      }
      case "custom":
        // 自定义动作预留：运行用户在 payload 中编写的表达式（暂不执行，避免 eval）
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
  const nodes = useCanvasStore((s) => s.nodes);
  const node = nodes[nodeId];

  if (!node) {
    return <div>节点不存在</div>;
  }

  // 通过 children ID 数组直接查表（O(k)），避免遍历整个 nodes
  const childIds = node.content.children || [];
  const eventHandlers = buildEventHandlers(node.events);

  // 渲染节点内容
  const renderNodeContent = () => {
    const { style, layout, content } = node;

    // 合并样式（显式挑选 layout 的 CSS 属性，避免展开非 CSS 字段如 type）
    const nodeStyle: React.CSSProperties = {
      ...style,
      display: layout?.display,
      position: layout?.position || "relative",
      flexDirection: layout?.flexDirection,
      flexWrap: layout?.flexWrap,
      gridTemplateColumns: layout?.gridTemplateColumns,
      gridTemplateRows: layout?.gridTemplateRows,
      width: style?.width ?? "100%",
      height: style?.height ?? "auto",
      minHeight: style?.minHeight ?? "auto",
      backgroundColor: style?.backgroundColor ?? "transparent",
      padding: style?.padding ?? "0",
      margin: style?.margin ?? "0",
      border: style?.border ?? "none",
      borderRadius: style?.borderRadius ?? "0",
      boxShadow: style?.boxShadow ?? "none",
    };

    const renderChildren = () =>
      childIds
        .map((cid) => (nodes[cid] ? cid : null))
        .filter((cid): cid is string => cid !== null)
        .map((cid) => <PreviewRenderer key={cid} nodeId={cid} />);

    // 根据节点类型渲染不同的内容
    switch (node.type) {
      case NodeType.SECTION:
        return (
          <section className="preview-section" style={nodeStyle} {...eventHandlers}>
            {renderChildren()}
          </section>
        );

      case NodeType.CONTAINER:
        return (
          <div className="preview-container" style={nodeStyle} {...eventHandlers}>
            {renderChildren()}
          </div>
        );

      case NodeType.DIV:
        return (
          <div className="preview-div" style={nodeStyle} {...eventHandlers}>
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
              flexDirection: layout?.flexDirection || "row",
              justifyContent: "flex-start",
              alignItems: "stretch",
              flexWrap: layout?.flexWrap || "nowrap",
              gap: "0",
            }}
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
              gridTemplateColumns: layout?.gridTemplateColumns || "1fr",
              gridTemplateRows: layout?.gridTemplateRows || "auto",
              gap: "0",
            }}
            {...eventHandlers}
          >
            {renderChildren()}
          </div>
        );

      case NodeType.TEXT:
        return (
          <div className="preview-text" style={nodeStyle} {...eventHandlers}>
            {content?.text || "文本内容"}
          </div>
        );

      case NodeType.BUTTON:
        return (
          <button className="preview-button" style={nodeStyle} {...eventHandlers}>
            {content?.text || "按钮"}
          </button>
        );

      case NodeType.IMAGE:
        return <img className="preview-image" src={content?.src || "/placeholder-image.jpg"} alt="图片" style={nodeStyle} {...eventHandlers} />;

      case NodeType.INPUT:
        return <input className="preview-input" type="text" placeholder="请输入内容" style={nodeStyle} {...eventHandlers} />;

      default:
        return (
          <div className="preview-unknown" style={nodeStyle} {...eventHandlers}>
            {renderChildren()}
          </div>
        );
    }
  };

  return renderNodeContent();
};

export default PreviewRenderer;
