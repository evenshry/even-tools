import type { ComponentLibraryItem } from "../types";
import { NodeType } from "../types";

export const componentLibrary: ComponentLibraryItem[] = [
  // 布局组件
  {
    id: "section",
    name: "区块",
    type: NodeType.SECTION,
    icon: "📦",
    category: "布局",
    description: "内容区块容器",
    defaultProps: {
      layout: {
        type: "block",
        display: "block",
      },
      style: {
        width: "100%",
        minHeight: "200px",
        height: "auto",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        marginBottom: "20px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [NodeType.CONTAINER, NodeType.FLEX, NodeType.GRID, NodeType.DIV, NodeType.TEXT, NodeType.HEADING],
      },
    },
  },
  {
    id: "container",
    name: "容器",
    type: NodeType.CONTAINER,
    icon: "📁",
    category: "布局",
    description: "通用容器",
    defaultProps: {
      layout: {
        type: "block",
        display: "block"
      },
      style: {
        width: "100%",
        minHeight: "200px",
        height: "auto",
        padding: "16px",
        backgroundColor: "#ffffff",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        marginBottom: "16px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [NodeType.FLEX, NodeType.GRID, NodeType.DIV, NodeType.TEXT, NodeType.BUTTON, NodeType.IMAGE],
      },
    },
  },
  {
    id: "flex",
    name: "弹性布局",
    type: NodeType.FLEX,
    icon: "📐",
    category: "布局",
    description: "Flexbox布局容器",
    defaultProps: {
      layout: {
        type: "flex",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "flex-start",
        alignItems: "stretch",
        alignContent: "stretch"
      },
      style: {
        width: "100%",
        minHeight: "200px",
        height: "auto",
        padding: "16px",
        backgroundColor: "#f8f9fa",
        gap: "10px",
        marginBottom: "16px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [
          NodeType.DIV,
          NodeType.TEXT,
          NodeType.HEADING,
          NodeType.BUTTON,
          NodeType.IMAGE,
          NodeType.INPUT,
          NodeType.VIDEO,
          NodeType.FLEX,
          NodeType.GRID,
        ],
      },
    },
  },
  {
    id: "grid",
    name: "网格布局",
    type: NodeType.GRID,
    icon: "🔲",
    category: "布局",
    description: "CSS Grid布局容器",
    defaultProps: {
      layout: {
        type: "grid",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "auto",
        gridAutoFlow: "row",
        gridAutoRows: "auto",
        gridAutoColumns: "auto",
        justifyContent: "flex-start",
        alignItems: "stretch"
      },
      style: {
        width: "100%",
        minHeight: "200px",
        height: "auto",
        padding: "16px",
        backgroundColor: "#f8f9fa",
        gap: "10px",
        marginBottom: "16px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [
          NodeType.DIV,
          NodeType.TEXT,
          NodeType.HEADING,
          NodeType.BUTTON,
          NodeType.IMAGE,
          NodeType.INPUT,
          NodeType.VIDEO,
          NodeType.FLEX,
          NodeType.GRID,
        ],
      },
    },
  },

  // 基础组件
  {
    id: "div",
    name: "Div",
    type: NodeType.DIV,
    icon: "🧱",
    category: "基础",
    description: "通用块级元素",
    defaultProps: {
      layout: {
        type: "block",
        display: "block"
      },
      style: {
        width: "100%",
        minHeight: "100px",
        height: "auto",
        backgroundColor: "#e9ecef",
        border: "1px solid #dee2e6",
        borderRadius: "4px",
        marginBottom: "10px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [NodeType.TEXT, NodeType.IMAGE, NodeType.BUTTON],
      },
    },
  },
  {
    id: "text",
    name: "文本",
    type: NodeType.TEXT,
    icon: "📝",
    category: "基础",
    description: "文本内容",
    defaultProps: {
      layout: {
        type: "inline",
        display: "inline-block",
      },
      style: {
        fontSize: "14px",
        color: "#333333",
        lineHeight: "1.5",
      },
      content: {
        text: "示例文本",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [],
      },
    },
  },
  {
    id: "heading",
    name: "标题",
    type: NodeType.HEADING,
    icon: "📋",
    category: "基础",
    description: "标题文本",
    defaultProps: {
      layout: {
        type: "block",
        display: "block",
      },
      style: {
        fontSize: "24px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px 0",
      },
      content: {
        text: "标题",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [],
      },
    },
  },

  // 表单组件
  {
    id: "button",
    name: "按钮",
    type: NodeType.BUTTON,
    icon: "🔘",
    category: "表单",
    description: "交互按钮",
    defaultProps: {
      layout: {
        type: "inline",
        display: "inline-block",
      },
      style: {
        padding: "8px 16px",
        backgroundColor: "#007bff",
        color: "#ffffff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      },
      content: {
        text: "按钮",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [],
      },
    },
  },
  {
    id: "input",
    name: "输入框",
    type: NodeType.INPUT,
    icon: "📱",
    category: "表单",
    description: "文本输入框",
    defaultProps: {
      layout: {
        type: "inline",
        display: "inline-block",
      },
      style: {
        width: "200px",
        padding: "8px 12px",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        fontSize: "14px",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [],
      },
    },
  },

  // 媒体组件
  {
    id: "image",
    name: "图片",
    type: NodeType.IMAGE,
    icon: "🖼️",
    category: "媒体",
    description: "图片展示",
    defaultProps: {
      layout: {
        type: "inline",
        display: "inline-block",
        position: "absolute",
      },
      style: {
        width: "200px",
        height: "150px",
        backgroundColor: "#f8f9fa",
        border: "1px dashed #dee2e6",
        borderRadius: "4px",
      },
      content: {
        src: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e5e7eb'/%3E%3Ctext x='100' y='80' font-size='14' text-anchor='middle' fill='%23999999'%3E%E5%9B%BE%E7%89%87%3C/text%3E%3C/svg%3E",
      },
      constraints: {
        canDelete: true,
        canDuplicate: true,
        canResize: true,
        allowedChildren: [],
      },
    },
  },
];

// 按类别分组组件
export const getComponentsByCategory = () => {
  const categories = {
    layout: componentLibrary.filter((item) => item.category === "布局"),
    basic: componentLibrary.filter((item) => item.category === "基础"),
    form: componentLibrary.filter((item) => item.category === "表单"),
    media: componentLibrary.filter((item) => item.category === "媒体"),
  };

  return categories;
};
