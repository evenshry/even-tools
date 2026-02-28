import React from 'react';
import { Layout, Typography } from 'antd';
import BackButton from '@/components/BackButton';
import '@/components/ModuleHeader.scss';

const { Header } = Layout;
const { Title } = Typography;

interface ModuleHeaderProps {
  title: string;
  extra?: React.ReactNode;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, extra }) => {
  return (
    <Header className="module-header">
      <BackButton />
      <Title level={3} className="module-header__title">
        {title}
      </Title>
      {extra && <div className="module-header__extra">{extra}</div>}
    </Header>
  );
};

export default ModuleHeader;
