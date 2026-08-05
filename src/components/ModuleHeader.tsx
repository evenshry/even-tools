import React, { useMemo } from "react";
import { Menu } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import ToolIcon from "@/components/ToolIcon";
import { tools } from "@/config/tools";
import "@/components/ModuleHeader.scss";

interface ModuleHeaderProps {
  title?: string;
  extra?: React.ReactNode;
  center?: React.ReactNode;
}

const CATEGORY_GROUPS: Record<string, string[]> = {
  开发工具: ["regex-sandbox", "bluetooth-printer", "barcode-generator", "json-toolkit"],
  设计工具: ["color-calculator", "visual-page-builder", "floor-plan-generator"],
  生活工具: ["unit-converter", "habit-tracker"],
};

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, extra, center }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = useMemo(() => {
    const items: any[] = [
      {
        key: "/",
        label: "首页",
      },
    ];
    for (const [category, ids] of Object.entries(CATEGORY_GROUPS)) {
      items.push({
        key: category,
        label: category,
        children: ids
          .map((id) => {
            const tool = tools.find((t) => t.id === id);
            if (!tool) return null;
            return {
              key: tool.path,
              label: (
                <span className="module-header__nav-item">
                  <span className="module-header__nav-icon">
                    <ToolIcon id={tool.id} />
                  </span>
                  <span>{tool.name}</span>
                </span>
              ),
            };
          })
          .filter(Boolean),
      });
    }
    return items;
  }, []);

  const currentTool = tools.find((t) => t.path === location.pathname);
  const selectedKey = currentTool ? currentTool.path : location.pathname === "/" ? "/" : "";

  return (
    <header className="module-header">
      <div className="module-header__left">
        <Link to="/" className="module-header__brand" aria-label="首页">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="etools" className="module-header__logo" />
          <span className="module-header__brand-name">etools</span>
        </Link>
        {title && (
          <>
            <span className="module-header__divider" />
            <span className="module-header__title">{title}</span>
          </>
        )}
      </div>
      {center && <div className="module-header__center">{center}</div>}
      <div className="module-header__right">
        <div className="module-header__nav">
          <Menu
            mode="horizontal"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={menuItems}
            onClick={({ key }) => {
              if (key.startsWith("/")) navigate(key);
            }}
            className="module-header__menu"
            triggerSubMenuAction="hover"
          />
        </div>
        {extra && <div className="module-header__extra">{extra}</div>}
        <ThemeToggle />
      </div>
    </header>
  );
};

export default ModuleHeader;
