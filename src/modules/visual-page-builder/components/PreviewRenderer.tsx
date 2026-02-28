import React from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import { NodeType } from "../types";

interface PreviewRendererProps {
  nodeId: string;
}

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ nodeId }) => {
  const { nodes } = useCanvasStore();
  const node = nodes[nodeId];

  if (!node) {
    return <div>节点不存在</div>;
  }

  // 获取节点的子节点
  const childNodes = Object.values(nodes).filter((childNode) => node.content.children?.includes(childNode.id));

  // 渲染节点内容
  const renderNodeContent = () => {
    const { style, layout, content } = node;

    // 合并样式
    const nodeStyle: React.CSSProperties = {
      ...style,
      ...layout,
      position: layout?.position || "relative",
      display: layout?.display || "block",
      width: style?.width || "100%",
      height: style?.height || "auto",
      minHeight: style?.minHeight || "auto",
      backgroundColor: style?.backgroundColor || "transparent",
      padding: style?.padding || "0",
      margin: style?.margin || "0",
      border: style?.border || "none",
      borderRadius: style?.borderRadius || "0",
      boxShadow: style?.boxShadow || "none",
    };

    // 根据节点类型渲染不同的内容
    switch (node.type) {
      case NodeType.SECTION:
        return (
          <section className="preview-section" style={nodeStyle}>
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
          </section>
        );

      case NodeType.CONTAINER:
        return (
          <div className="preview-container" style={nodeStyle}>
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
          </div>
        );

      case NodeType.DIV:
        return (
          <div className="preview-div" style={nodeStyle}>
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
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
          >
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
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
          >
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
          </div>
        );

      case NodeType.TEXT:
        return (
          <div className="preview-text" style={nodeStyle}>
            {content?.text || "文本内容"}
          </div>
        );

      case NodeType.BUTTON:
        return (
          <button className="preview-button" style={nodeStyle}>
            {content?.text || "按钮"}
          </button>
        );

      case NodeType.IMAGE:
        return <img className="preview-image" src={content?.src || "/placeholder-image.jpg"} alt="图片" style={nodeStyle} />;

      case NodeType.INPUT:
        return <input className="preview-input" type="text" placeholder="请输入内容" style={nodeStyle} />;

      default:
        return (
          <div className="preview-unknown" style={nodeStyle}>
            {childNodes.map((childNode) => (
              <PreviewRenderer key={childNode.id} nodeId={childNode.id} />
            ))}
          </div>
        );
    }
  };

  return renderNodeContent();
};

export default PreviewRenderer;
