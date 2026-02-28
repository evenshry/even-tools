import { Input, Checkbox, Select, Card, Space, Typography, Alert } from "antd";

const { Text } = Typography;

interface RegexPreset {
  id: string;
  name: string;
  description: string;
  pattern: string;
  flags: string;
  category: string;
}

interface RegexEditorProps {
  pattern: string;
  flags: string;
  onPatternChange: (value: string) => void;
  onFlagsChange: (value: string) => void;
  error?: string;
  presets?: RegexPreset[];
  onPresetSelect?: (preset: RegexPreset) => void;
}

const flagOptions = [
  { label: "g (全局匹配)", value: "g" },
  { label: "i (忽略大小写)", value: "i" },
  { label: "m (多行模式)", value: "m" },
  { label: "s (点号匹配换行)", value: "s" },
  { label: "u (Unicode)", value: "u" },
  { label: "y (粘性匹配)", value: "y" },
];

const RegexEditor = ({
  pattern,
  flags,
  onPatternChange,
  onFlagsChange,
  error,
  presets,
  onPresetSelect,
}: RegexEditorProps) => {
  const handleFlagChange = (checkedValues: string[]) => {
    onFlagsChange(checkedValues.join(""));
  };

  return (
    <Card title="正则表达式编辑器" className="regex-editor">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div className="regex-pattern-section">
          <Text strong>正则表达式模式</Text>
          <Input
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder="输入正则表达式，例如：^\\d+$"
            size="large"
            className="regex-pattern-input"
            status={error ? "error" : undefined}
          />
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginTop: 8 }} />
          )}
        </div>

        <div className="regex-flags-section">
          <Text strong>标志位</Text>
          <Checkbox.Group
            options={flagOptions}
            value={flags.split("")}
            onChange={handleFlagChange}
            className="regex-flags-checkbox"
          />
        </div>

        {presets && presets.length > 0 && (
          <div className="regex-presets-section">
            <Text strong>快速选择预设</Text>
            <Select
              placeholder="选择预设正则表达式"
              style={{ width: "100%" }}
              options={presets.map((preset) => ({
                label: preset.name,
                value: preset.id,
              }))}
              onChange={(value) => {
                const preset = presets.find((p) => p.id === value);
                if (preset && onPresetSelect) {
                  onPresetSelect(preset);
                }
              }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        )}
      </Space>
    </Card>
  );
};

export default RegexEditor;
