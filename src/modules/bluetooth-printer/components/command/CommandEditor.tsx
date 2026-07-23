import React from 'react';
import { Input } from 'antd';
import { usePrinterStore } from '../../store/usePrinterStore';

const { TextArea } = Input;

const PLACEHOLDER = '输入要打印的文本...';

const CommandEditor: React.FC = () => {
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);

  const handleContentChange = (raw: string) => {
    setCommandInput({ raw });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TextArea
        value={commandInput.raw}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder={PLACEHOLDER}
        style={{
          flex: 1,
          minHeight: 300,
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      />
    </div>
  );
};

export default CommandEditor;
