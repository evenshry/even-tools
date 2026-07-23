// 模式切换组件

import React from 'react';
import { Segmented } from 'antd';
import { CodeOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../store/usePrinterStore';

const ModeSwitcher: React.FC = () => {
  const mode = usePrinterStore(s => s.mode);
  const setMode = usePrinterStore(s => s.setMode);

  return (
    <Segmented
      value={mode}
      onChange={(v) => setMode(v as 'command' | 'designer')}
      options={[
        { label: '指令模式', value: 'command', icon: <CodeOutlined /> },
        { label: '编辑模式', value: 'designer', icon: <FormatPainterOutlined /> },
      ]}
    />
  );
};

export default ModeSwitcher;
