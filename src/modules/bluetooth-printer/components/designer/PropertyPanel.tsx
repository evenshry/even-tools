// 属性面板 - 编辑选中元素的属性

import React from 'react';
import {
  Card, Form, Input, InputNumber, Select, Switch, Radio, Space, Empty, Typography, Upload, Button,
} from 'antd';
import { SettingOutlined, UploadOutlined, ClearOutlined } from '@ant-design/icons';
import { usePrinterStore } from '../../store/usePrinterStore';
import type {
  PrintElement, TextElement, BarcodeElement, QrCodeElement,
  DividerElement, TableElement, ImageElement, Alignment, BarcodeType, QrErrorLevel,
} from '../../data/interface';
import { compressImage, processImage, bitmapToDataUrl } from '../../utils/imageProcessor';
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";

const { TextArea } = Input;
const { Text } = Typography;

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
];

const BARCODE_TYPES: BarcodeType[] = ['UPC_A', 'EAN13', 'CODE128', 'CODE39', 'ITF'];
const QR_LEVELS: QrErrorLevel[] = ['L', 'M', 'Q', 'H'];

const PropertyPanel: React.FC = () => {
  const elements = usePrinterStore(s => s.elements);
  const selectedElementId = usePrinterStore(s => s.selectedElementId);
  const updateElement = usePrinterStore(s => s.updateElement);

  const selected = elements.find(el => el.id === selectedElementId);

  if (!selected) {
    return (
      <Card
        title={<Space><SettingOutlined />属性</Space>}
        size="small"
        style={{ height: '100%' }}
      >
        <Empty description="点击元素以编辑属性" />
      </Card>
    );
  }

  const update = (patch: Partial<PrintElement>) => {
    updateElement(selected.id, patch);
  };

  return (
    <Card
      title={<Space><SettingOutlined />属性 - {selected.type}</Space>}
      size="small"
      style={{ height: '100%', overflow: 'auto' }}
    >
      <Form layout="vertical" size="small">
        {selected.type === 'text' && (
          <TextProps el={selected as TextElement} update={update} />
        )}
        {selected.type === 'divider' && (
          <DividerProps el={selected as DividerElement} update={update} />
        )}
        {selected.type === 'qrcode' && (
          <QrProps el={selected as QrCodeElement} update={update} />
        )}
        {selected.type === 'barcode' && (
          <BarcodeProps el={selected as BarcodeElement} update={update} />
        )}
        {selected.type === 'table' && (
          <TableProps el={selected as TableElement} update={update} />
        )}
        {selected.type === 'image' && (
          <ImageProps el={selected as ImageElement} update={update} />
        )}
      </Form>
    </Card>
  );
};

// ===== 文本属性 =====
const TextProps: React.FC<{
  el: TextElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => (
  <>
    <Form.Item label="内容">
      <TextArea
        value={el.content}
        onChange={(e) => update({ content: e.target.value })}
        autoSize={{ minRows: 2, maxRows: 6 }}
      />
    </Form.Item>
    <Form.Item label="对齐">
      <Radio.Group
        value={el.alignment}
        onChange={(e) => update({ alignment: e.target.value as Alignment })}
        options={ALIGN_OPTIONS}
        optionType="button"
        size="small"
      />
    </Form.Item>
    <Form.Item label="字号">
      <Select
        value={el.fontSize}
        onChange={(v) => update({ fontSize: v })}
        options={[1, 2, 3, 4].map(n => ({ value: n, label: `${n}x` }))}
      />
    </Form.Item>
    <Form.Item label="加粗">
      <Switch
        checked={el.bold}
        onChange={(v) => update({ bold: v })}
      />
    </Form.Item>
    <Form.Item label="下划线">
      <Select
        value={el.underline}
        onChange={(v) => update({ underline: v as 0 | 1 | 2 })}
        options={[
          { value: 0, label: '无' },
          { value: 1, label: '单线' },
          { value: 2, label: '双线' },
        ]}
      />
    </Form.Item>
    <Form.Item label="行间距">
      <InputNumber
        value={el.lineSpacing}
        onChange={(v) => update({ lineSpacing: v ?? 30 })}
        min={0}
        max={255}
      />
    </Form.Item>
    <Form.Item label="自动换行">
      <Switch
        checked={el.wrap}
        onChange={(v) => update({ wrap: v })}
      />
    </Form.Item>
  </>
);

// ===== 分割线属性 =====
const DividerProps: React.FC<{
  el: DividerElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => (
  <Form.Item label="分割字符">
    <Input
      value={el.char}
      onChange={(e) => update({ char: e.target.value.slice(0, 1) || '-' })}
      maxLength={1}
    />
  </Form.Item>
);

// ===== 二维码属性 =====
const QrProps: React.FC<{
  el: QrCodeElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => (
  <>
    <Form.Item label="内容">
      <TextArea
        value={el.content}
        onChange={(e) => update({ content: e.target.value })}
        autoSize={{ minRows: 2, maxRows: 4 }}
      />
    </Form.Item>
    <Form.Item label="尺寸">
      <Select
        value={el.size}
        onChange={(v) => update({ size: v })}
        options={Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))}
      />
    </Form.Item>
    <Form.Item label="纠错级别">
      <Select
        value={el.errorLevel}
        onChange={(v) => update({ errorLevel: v })}
        options={QR_LEVELS.map(l => ({ value: l, label: `${l} (${l === 'L' ? '7%' : l === 'M' ? '15%' : l === 'Q' ? '25%' : '30%'})` }))}
      />
    </Form.Item>
    <Form.Item label="对齐">
      <Radio.Group
        value={el.alignment}
        onChange={(e) => update({ alignment: e.target.value as Alignment })}
        options={ALIGN_OPTIONS}
        optionType="button"
        size="small"
      />
    </Form.Item>
  </>
);

// ===== 条码属性 =====
const BarcodeProps: React.FC<{
  el: BarcodeElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => (
  <>
    <Form.Item label="内容">
      <Input
        value={el.content}
        onChange={(e) => update({ content: e.target.value })}
      />
    </Form.Item>
    <Form.Item label="条码类型">
      <Select
        value={el.barcodeType}
        onChange={(v) => update({ barcodeType: v })}
        options={BARCODE_TYPES.map(t => ({ value: t, label: t }))}
      />
    </Form.Item>
    <Form.Item label="高度">
      <InputNumber
        value={el.height}
        onChange={(v) => update({ height: v ?? 80 })}
        min={10}
        max={255}
      />
    </Form.Item>
    <Form.Item label="宽度系数">
      <Select
        value={el.width}
        onChange={(v) => update({ width: v })}
        options={[2, 3, 4, 5, 6].map(n => ({ value: n, label: `${n}` }))}
      />
    </Form.Item>
    <Form.Item label="显示文字">
      <Switch
        checked={el.showText}
        onChange={(v) => update({ showText: v })}
      />
    </Form.Item>
    <Form.Item label="对齐">
      <Radio.Group
        value={el.alignment}
        onChange={(e) => update({ alignment: e.target.value as Alignment })}
        options={ALIGN_OPTIONS}
        optionType="button"
        size="small"
      />
    </Form.Item>
  </>
);

// ===== 表格属性 =====
const TableProps: React.FC<{
  el: TableElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => (
  <>
    <Form.Item label="对齐">
      <Radio.Group
        value={el.alignment}
        onChange={(e) => update({ alignment: e.target.value as Alignment })}
        options={ALIGN_OPTIONS}
        optionType="button"
        size="small"
      />
    </Form.Item>
    <Form.Item label={`列设置 (${el.columns.length} 列)`}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {el.columns.map((col, i) => (
          <Space key={i} size={4}>
            <Input
              value={col.header}
              onChange={(e) => {
                const cols = [...el.columns];
                cols[i] = { ...cols[i], header: e.target.value };
                update({ columns: cols });
              }}
              placeholder="表头"
              style={{ width: 120 }}
            />
            <InputNumber
              value={col.width}
              onChange={(v) => {
                const cols = [...el.columns];
                cols[i] = { ...cols[i], width: v ?? 1 };
                update({ columns: cols });
              }}
              min={1}
              max={20}
              placeholder="宽"
              style={{ width: 70 }}
            />
          </Space>
        ))}
      </Space>
    </Form.Item>
    <Form.Item label={`数据行 (${el.rows.length} 行)`}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          表格数据编辑：直接修改 CSV 文本，每行用换行分隔，单元格用逗号分隔
        </Text>
        <TextArea
          value={el.rows.map(r => r.join(',')).join('\n')}
          onChange={(e) => {
            const rows = e.target.value.split('\n').map(line => line.split(',').map(c => c.trim()));
            update({ rows });
          }}
          autoSize={{ minRows: 3, maxRows: 10 }}
          style={{ fontFamily: 'monospace', marginTop: 4 }}
        />
      </Form.Item>
    </>
  );

// ===== 图片属性 =====
const ImageProps: React.FC<{
  el: ImageElement;
  update: (patch: Partial<PrintElement>) => void;
}> = ({ el, update }) => {
  const mode = useThemeStore((s) => s.mode);
  const profile = usePrinterStore(s => s.profile);
  const [bitmapPreview, setBitmapPreview] = React.useState<string>('');
  const [bitmapInfo, setBitmapInfo] = React.useState<string>('');

  React.useEffect(() => {
    if (!el.src) {
      setBitmapPreview('');
      setBitmapInfo('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const targetWidthPx = profile.paperWidth * 8;
        const bitmap = await processImage(el.src, targetWidthPx, el.dither);
        if (cancelled) return;
        const previewUrl = bitmapToDataUrl(bitmap);
        setBitmapPreview(previewUrl);
        setBitmapInfo(`${bitmap.width}x${bitmap.height}px, ${bitmap.data.length} bytes`);
      } catch (e) {
        if (cancelled) return;
        setBitmapInfo(`处理失败: ${(e as Error).message}`);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [el.src, el.dither, profile.paperWidth]);

  const handleUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // 用纸张宽度作为压缩目标宽度
      const targetWidthPx = profile.paperWidth * 8;
      const compressed = await compressImage(dataUrl, targetWidthPx);
      update({ src: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    update({ src: '' });
  };

  return (
    <>
      <Form.Item label="图片">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {el.src ? (
            <div>
              <img
                src={el.src}
                alt="preview"
                style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain', border: `1px solid ${semanticColors.graye8[mode]}`, borderRadius: 4 }}
              />
              <Space size={4} style={{ marginTop: 8 }}>
                <Upload
                  beforeUpload={(file) => { handleUpload(file); return false; }}
                  accept="image/*"
                  showUploadList={false}
                  style={{ width: 'auto' }}
                >
                  <Button size="small" icon={<UploadOutlined />}>更换图片</Button>
                </Upload>
                <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>清除</Button>
              </Space>
            </div>
          ) : (
            <Upload
              beforeUpload={(file) => { handleUpload(file); return false; }}
              accept="image/*"
              showUploadList={false}
            >
              <Button size="small" icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
          )}
        </div>
      </Form.Item>
      {bitmapPreview && (
        <Form.Item label="处理预览（单色）">
          <div>
            <img
              src={bitmapPreview}
              alt="bitmap preview"
              style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', border: `1px solid ${semanticColors.graye8[mode]}`, borderRadius: 4, imageRendering: 'pixelated' }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              {bitmapInfo}
            </Text>
          </div>
        </Form.Item>
      )}
      <Form.Item label="打印宽度">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {profile.paperWidth} 字符 ({profile.paperWidth * 8} 点) / {profile.dpi}dpi
        </Text>
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
          图片自动缩放至纸张宽度，高度按比例计算
        </Text>
      </Form.Item>
      <Form.Item label="对齐">
        <Radio.Group
          value={el.alignment}
          onChange={(e) => update({ alignment: e.target.value as Alignment })}
          options={ALIGN_OPTIONS}
          optionType="button"
          size="small"
        />
      </Form.Item>
      <Form.Item label="抖动方式">
        <Select
          value={el.dither}
          onChange={(v) => update({ dither: v })}
          options={[
            { value: 'threshold', label: '阈值（简单）' },
            { value: 'floydSteinberg', label: 'Floyd-Steinberg（平滑）' },
            { value: 'ordered', label: '有序抖动（棋盘）' },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
          黑白转换算法，热敏打印机仅支持单色输出
        </Text>
      </Form.Item>
    </>
  );
};

export default PropertyPanel;
