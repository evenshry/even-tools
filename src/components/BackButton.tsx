import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import './BackButton.scss';

// 返回按钮组件 - 用于返回工具列表页
const BackButton: React.FC = () => {
  return (
    <Link to="/" className="back-button__link">
      <Button 
        type="default" 
        icon={<ArrowLeftOutlined />}
        size="large"
      >
        返回列表
      </Button>
    </Link>
  );
};

export default BackButton;
