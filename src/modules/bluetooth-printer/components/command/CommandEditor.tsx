import React from 'react';
import { Input } from 'antd';
import { usePrinterStore } from '../../store/usePrinterStore';

const { TextArea } = Input;

const PLACEHOLDERS = {
  plaintext: '输入要打印的文本...',
  hex: '输入十六进制字节，支持空格/换行/逗号分隔，例如：\n1B 40 1B 21 30\n53 49 5A 45 20 38 30 20 6D 6D 0D 0A',
};

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
        placeholder={PLACEHOLDERS[commandInput.syntax]}
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
