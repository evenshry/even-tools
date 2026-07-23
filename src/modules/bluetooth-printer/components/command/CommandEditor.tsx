// 指令编辑器 - 主编辑器

import React, { useState } from 'react';
import { Input, Tabs, Typography } from 'antd';
import { usePrinterStore } from '../../store/usePrinterStore';
import type { CommandSyntax } from '../../data/interface';

const { TextArea } = Input;
const { Text } = Typography;

const SYNTAX_LABELS: Record<CommandSyntax, string> = {
  hex: 'Hex 十六进制',
  mnemonic: '助记符',
  plaintext: '纯文本',
};

const PLACEHOLDERS_ESCPOS: Record<CommandSyntax, string> = {
  hex: '1B 40 1B 61 01 48 65 6C 6C 6F 1D 56 00',
  mnemonic: '@init\n@align center\n@size 2x2\nHello World\n@feed 3\n@cut',
  plaintext: 'Hello, Printer!',
};

const PLACEHOLDERS_TSPL: Record<CommandSyntax, string> = {
  hex: '53 49 5A 45 20 34 30 20 6D 6D 2C 33 30 20 6D 6D',
  mnemonic: '@init\n@qr https://example.com size=6 level=M\n@barcode CODE128 1234567890\n@print 1',
  plaintext: 'Hello, Label Printer!',
};

const HINT_ESCPOS = '助记符: @init @align @bold @size @feed @cut @qr @barcode @raw @beep';
const HINT_TSPL = '助记符: @init(=CLS) @qr @barcode @cut @print @raw (文本行作为 TEXT 流式布局)';

const CommandEditor: React.FC = () => {
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);
  const protocol = usePrinterStore(s => s.profile.protocol);

  const placeholders = protocol === 'tspl' ? PLACEHOLDERS_TSPL : PLACEHOLDERS_ESCPOS;
  const hint = protocol === 'tspl' ? HINT_TSPL : HINT_ESCPOS;

  // 每种语法独立缓存
  const [cache, setCache] = useState<Record<CommandSyntax, string>>({
    hex: '',
    mnemonic: commandInput.raw,
    plaintext: '',
  });

  const handleSyntaxChange = (syntax: CommandSyntax) => {
    // 保存当前内容到缓存
    setCache(prev => ({ ...prev, [commandInput.syntax]: commandInput.raw }));
    // 切换到新语法，加载缓存或默认值
    setCommandInput({
      syntax,
      raw: cache[syntax] || '',
    });
  };

  const handleContentChange = (raw: string) => {
    setCommandInput({ raw });
    setCache(prev => ({ ...prev, [commandInput.syntax]: raw }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs
        activeKey={commandInput.syntax}
        onChange={(k) => handleSyntaxChange(k as CommandSyntax)}
        items={(Object.keys(SYNTAX_LABELS) as CommandSyntax[]).map(s => ({
          key: s,
          label: SYNTAX_LABELS[s],
        }))}
        size="small"
      />
      <TextArea
        value={commandInput.raw}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder={placeholders[commandInput.syntax]}
        style={{
          flex: 1,
          minHeight: 300,
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      />
      {commandInput.syntax === 'mnemonic' && (
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
          {hint}
        </Text>
      )}
    </div>
  );
};

export default CommandEditor;
