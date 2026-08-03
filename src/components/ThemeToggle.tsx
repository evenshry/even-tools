import React from "react";
import { Button, Tooltip } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useThemeStore } from "@/store/useThemeStore";
import "./ThemeToggle.scss";

// 主题切换按钮 - 在 header 右侧使用
const ThemeToggle: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Tooltip title={mode === "light" ? "切换到暗色模式" : "切换到亮色模式"}>
      <Button
        type="text"
        className="theme-toggle"
        icon={mode === "light" ? <MoonOutlined /> : <SunOutlined />}
        onClick={toggle}
        aria-label="切换主题"
      />
    </Tooltip>
  );
};

export default ThemeToggle;
