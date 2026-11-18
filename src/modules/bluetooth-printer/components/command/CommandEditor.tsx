import React from 'react';
import { Input } from 'antd';
import { usePrinterStore } from '../../store/usePrinterStore';

const { TextArea } = Input;

const PLACEHOLDERS = {
  plaintext: '输入要打印的文本...',
  hex: '输入十六进制字节，支持空格/换行/逗号分隔，例如：\n1B 40 1B 21 30\n53 49 5A 45 20 38 30 20 6D 6D 0D 0A',
  mnemonic: [
    '输入助记符指令，例如：',
    '@align center',
    '@bold on',
    '@size 2x2',
    'Hello 热敏打印',
    '@bold off',
    '@qr https://example.com size=6 level=M',
    '@feed 3',
    '@cut',
    '',
    'TSPL 模式支持坐标写法：@text 10,10 "Hello" / @qr 10,40 https://example.com / @barcode CODE128 10,100 "123" / @print 1',
    '注意：TSPL 下 @size、@bold、@underline、@linespace 会被忽略；@raw 原样写入文本指令。',
  ].join('\n'),
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
