// 蓝牙打印机工具 - 主组件
// 双模式：指令模式 (command) / 编辑模式 (designer)

import React from 'react';
import { Layout, Card } from 'antd';
import ModuleHeader from '@/components/ModuleHeader';
import { usePrinterStore } from './store/usePrinterStore';

// 共享组件
import ModeSwitcher from './components/ModeSwitcher';
import DeviceConnectionPanel from './components/DeviceConnectionPanel';
import PrinterSettings from './components/PrinterSettings';
import SnippetLibrary from './components/command/SnippetLibrary';

// 指令模式组件
import CommandEditor from './components/command/CommandEditor';
import HexPreview from './components/command/HexPreview';
import CommandToolbar from './components/command/CommandToolbar';
import PrintHistory from './components/PrintHistory';

// 编辑模式组件
import ElementToolbar from './components/designer/ElementToolbar';
import PrintEditor from './components/designer/PrintEditor';
import PropertyPanel from './components/designer/PropertyPanel';
import PrintPreview from './components/designer/PrintPreview';

import './BluetoothPrinter.scss';

const { Content } = Layout;

// 指令模式布局
const CommandMode: React.FC = () => (
  <div className="bp-mode-panel bp-command-mode">
    <div className="bp-toolbar-row">
      <CommandToolbar />
    </div>
    <div className="bp-command-grid">
      <Card size="small" className="bp-editor-card" title="指令编辑" styles={{ body: { padding: 8, height: 'calc(100% - 40px)', overflow: 'auto' } }}>
        <CommandEditor />
      </Card>
      <div className="bp-preview-stack">
        <HexPreview />
      </div>
      <div className="bp-snippet-stack">
        <PrintHistory />
      </div>
    </div>
  </div>
);

// 编辑模式布局
const DesignerMode: React.FC = () => (
  <div className="bp-mode-panel bp-designer-mode">
    <div className="bp-toolbar-row">
      <ElementToolbar />
    </div>
    <div className="bp-designer-grid">
      <PrintEditor />
      <PropertyPanel />
      <PrintPreview />
    </div>
  </div>
);

const BluetoothPrinter: React.FC = () => {
  const mode = usePrinterStore(s => s.mode);

  return (
    <Layout className="bluetooth-printer">
      <ModuleHeader
        title="蓝牙打印机"
        extra={<ModeSwitcher />}
      />
      <Content className="bluetooth-printer__content">
        <div className="bluetooth-printer__layout">
          {/* 左侧 - 共享面板 */}
          <aside className="bluetooth-printer__sidebar">
            <DeviceConnectionPanel />
            <PrinterSettings />
            <SnippetLibrary />
          </aside>

          {/* 右侧 - 模式面板 */}
          <main className="bluetooth-printer__main">
            {mode === 'command' ? <CommandMode /> : <DesignerMode />}
          </main>
        </div>
      </Content>
    </Layout>
  );
};

export default BluetoothPrinter;
