import React from 'react';
import { Drawer, Typography, Divider, Tag } from 'antd';
import { SHORTCUT_TABLE } from '../hooks/useKeyboardShortcuts';

const { Title, Paragraph, Text } = Typography;

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 操作指南抽屉：快速上手、布局说明与快捷键速查
 */
const HelpDrawer: React.FC<HelpDrawerProps> = ({ open, onClose }) => (
  <Drawer
    title="操作指南"
    placement="right"
    width={420}
    open={open}
    onClose={onClose}
  >
    <Title level={5}>快速上手</Title>
    <Paragraph>
      <ol style={{ paddingLeft: 18, margin: 0 }}>
        <li>从左侧「组件」面板拖拽组件到画布。</li>
        <li>拖入「弹性布局 / 网格布局」容器后，再把组件拖进容器自动排布。</li>
        <li>选中节点，在右侧属性面板调整布局、样式、内容与交互。</li>
        <li>按 Ctrl/Cmd+S 保存，Ctrl/Cmd+Shift+P 切换预览。</li>
        <li>顶部「页面」管理多页面，「导出」生成 HTML / React / Schema。</li>
      </ol>
    </Paragraph>

    <Divider style={{ margin: '12px 0' }} />

    <Title level={5}>
      弹性布局 <Text code>FLEX</Text>
    </Title>
    <Paragraph>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li>主轴方向：子项横向或纵向排列，可反向。</li>
        <li>主轴对齐：起始 / 末尾 / 居中 / 两端 / 环绕 / 均匀分布。</li>
        <li>交叉轴对齐：拉伸、起点、终点、居中或基线对齐。</li>
        <li>换行后可用「多行对齐」控制多行之间的分布。</li>
        <li>子项可单独设置伸缩比例、基准尺寸与自身对齐。</li>
      </ul>
    </Paragraph>

    <Divider style={{ margin: '12px 0' }} />

    <Title level={5}>
      网格布局 <Text code>GRID</Text>
    </Title>
    <Paragraph>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li>列 / 行模板支持 CSS 写法，如 <Text code>repeat(3, 1fr)</Text>、<Text code>200px 1fr</Text>。</li>
        <li>自动流控制子项按行或按列填充，dense 会填补空位。</li>
        <li>自动行高 / 列宽用于描述隐式轨道尺寸。</li>
        <li>子项可设置网格列 / 行，如 <Text code>span 2</Text> 跨两列。</li>
      </ul>
    </Paragraph>

    <Divider style={{ margin: '12px 0' }} />

    <Title level={5}>图层与模板</Title>
    <Paragraph>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        <li>图层面板支持搜索、双击重命名、拖拽排序与显隐切换。</li>
        <li>右键图层可上移、下移、复制或删除节点。</li>
        <li>模板库支持应用、另存、重命名与删除自定义模板。</li>
      </ul>
    </Paragraph>

    <Divider style={{ margin: '12px 0' }} />

    <Title level={5}>快捷键</Title>
    <div>
      {SHORTCUT_TABLE.map((item) => (
        <div
          key={item.keys}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '5px 0',
            borderBottom: '1px solid var(--et-line)',
            fontSize: 12,
          }}
        >
          <Tag style={{ marginInlineEnd: 0, fontFamily: 'monospace' }}>{item.keys}</Tag>
          <span style={{ color: 'var(--et-ink-2)' }}>{item.action}</span>
        </div>
      ))}
    </div>
  </Drawer>
);

export default HelpDrawer;
