import React from "react";
import { Typography } from "antd";
import BackButton from "@/components/BackButton";
import ThemeToggle from "@/components/ThemeToggle";
import "@/components/ModuleHeader.scss";

const { Title } = Typography;

interface ModuleHeaderProps {
  title?: string;
  extra?: React.ReactNode;
  center?: React.ReactNode;
}

// 模块页通用 Header：返回 + 标题 + 中部 tabs + 右侧操作 + 主题切换
const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, extra, center }) => {
  return (
    <header className="module-header">
      <div className="module-header__left">
        <BackButton />
        {title && (
          <Title level={3} className="module-header__title">
            {title}
          </Title>
        )}
      </div>
      {center && <div className="module-header__center">{center}</div>}
      <div className="module-header__right">
        {extra && <div className="module-header__extra">{extra}</div>}
        <ThemeToggle />
      </div>
    </header>
  );
};

export default ModuleHeader;
