// 指令片段库面板 - 点击片段插入到编辑器

import React, { useMemo, useState } from 'react';
import { Card, List, Tag, Typography, Input, Space } from 'antd';
import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import type { CommandSnippet, CommandSyntax } from '../../data/interface';

const { Text } = Typography;

const SYNTAX_COLORS: Record<CommandSyntax, string> = {
  hex: 'blue',
  mnemonic: 'purple',
  plaintext: 'default',
};

const SYNTAX_LABELS: Record<CommandSyntax, string> = {
  hex: 'Hex',
  mnemonic: '助记符',
  plaintext: '纯文本',
};

const SnippetLibrary: React.FC = () => {
  const snippets = usePrinterStore(s => s.snippets);
  const commandInput = usePrinterStore(s => s.commandInput);
  const setCommandInput = usePrinterStore(s => s.setCommandInput);

  const [keyword, setKeyword] = useState('');

  // 按关键字过滤
  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return snippets;
    return snippets.filter(s =>
      s.name.toLowerCase().includes(k) ||
      s.description.toLowerCase().includes(k) ||
      s.content.toLowerCase().includes(k)
    );
  }, [snippets, keyword]);

  // 应用片段：切换到对应语法并填入内容
  const handleApply = (snip: CommandSnippet) => {
    setCommandInput({
      syntax: snip.syntax,
      raw: snip.content,
    });
  };

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          片段库
        </Space>
      }
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
    >
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          size="small"
          allowClear
          placeholder="搜索片段"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <List
        size="small"
        dataSource={filtered}
        locale={{ emptyText: '暂无片段' }}
        renderItem={(snip) => {
          const matchedSyntax = snip.syntax === commandInput.syntax;
          return (
            <List.Item
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 4,
                transition: 'background 0.2s',
              }}
              onClick={() => handleApply(snip)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 13 }}>
                  {snip.name}
                </Text>
                <Space size={4}>
                  <Tag color={SYNTAX_COLORS[snip.syntax]} style={{ margin: 0, fontSize: 11 }}>
                    {SYNTAX_LABELS[snip.syntax]}
                  </Tag>
                  {matchedSyntax && (
                    <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                      匹配
                    </Tag>
                  )}
                </Space>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {snip.description}
              </Text>
              <Text
                code
                style={{
                  fontSize: 11,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {snip.content.split('\n')[0].slice(0, 60) || '(空)'}
              </Text>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default SnippetLibrary;
