import React from 'react';
import { Layout, Typography } from 'antd';
import BackButton from '@/components/BackButton';
import '@/components/ModuleHeader.scss';

const { Header } = Layout;
const { Title } = Typography;

interface ModuleHeaderProps {
  title?: string;
  extra?: React.ReactNode;
  center?: React.ReactNode;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, extra, center }) => {
  return (
    <Header className="module-header">
      <div className="module-header__left">
        <BackButton />
        {title && (
          <Title level={3} className="module-header__title">
            {title}
          </Title>
        )}
      </div>
      {center && <div className="module-header__center">{center}</div>}
      {extra && <div className="module-header__extra">{extra}</div>}
    </Header>
  );
};

export default ModuleHeader;
