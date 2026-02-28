import { useState, useEffect } from "react";
import { Layout, Tabs } from "antd";
import { EyeOutlined, BookOutlined, BulbOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import RegexEditor from "@/modules/regex-sandbox/components/RegexEditor";
import RegexTester from "@/modules/regex-sandbox/components/RegexTester";
import RegexLibrary from "@/modules/regex-sandbox/components/RegexLibrary";
import RegexCheatSheet from "@/modules/regex-sandbox/components/RegexCheatSheet";
import RegexGuideExamples from "@/modules/regex-sandbox/components/RegexGuideExamples";
import RegexVisualizer from "@/modules/regex-sandbox/components/RegexVisualizer";
import FirstTimeGuide from "@/modules/regex-sandbox/components/FirstTimeGuide";
import { regexPresets } from "@/modules/regex-sandbox/data/regexPresets";
import { executeRegex, validateRegex } from "@/modules/regex-sandbox/utils/regexUtils";
import type { RegexSandboxTypes } from "@/modules/regex-sandbox/data/interface";
import "@/modules/regex-sandbox/RegexSandbox.scss";

const { Content, Sider } = Layout;

const RegexSandboxModule = () => {
  const [pattern, setPattern] = useState("^\\d+$");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState("123\n456\nabc\n789");
  const [testResult, setTestResult] = useState<RegexSandboxTypes.TestResult | null>(null);
  const [regexError, setRegexError] = useState<string | undefined>();
  const [selectedPreset, setSelectedPreset] = useState<RegexSandboxTypes.RegexPreset | null>(null);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);

  useEffect(() => {
    const validation = validateRegex(pattern);
    setRegexError(validation.isValid ? undefined : validation.error);

    if (validation.isValid && testString) {
      const result = executeRegex(pattern, flags, testString);
      setTestResult(result);
    } else {
      setTestResult(null);
    }
  }, [pattern, flags, testString]);

  useEffect(() => {
    const hasVisited = localStorage.getItem("regexSandbox_visited");
    if (!hasVisited) {
      setShowFirstTimeGuide(true);
    }
  }, []);

  const handlePatternChange = (value: string) => {
    setPattern(value);
    setSelectedPreset(null);
  };

  const handleFlagsChange = (value: string) => {
    setFlags(value);
  };

  const handleTestStringChange = (value: string) => {
    setTestString(value);
  };

  const handlePresetSelect = (preset: RegexSandboxTypes.RegexPreset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setSelectedPreset(preset);
  };

  const handleFirstTimeGuideClose = () => {
    setShowFirstTimeGuide(false);
    localStorage.setItem("regexSandbox_visited", "true");
  };

  return (
    <Layout className="regex-sandbox">
      <ModuleHeader title="正则表达式沙盒" />

      <Content className="regex-sandbox__content">
        <Layout className="regex-sandbox__three-column">
          <Sider width={400} className="regex-sandbox__left-panel">
            <RegexLibrary presets={regexPresets} onPresetSelect={handlePresetSelect} selectedPreset={selectedPreset} />
          </Sider>

          <Content className="regex-sandbox__middle-panel">
            <RegexEditor
              pattern={pattern}
              flags={flags}
              onPatternChange={handlePatternChange}
              onFlagsChange={handleFlagsChange}
              error={regexError}
              presets={regexPresets.slice(0, 10)}
              onPresetSelect={handlePresetSelect}
            />
            <RegexTester testString={testString} onTestStringChange={handleTestStringChange} testResult={testResult} />
          </Content>

          <Sider width={400} className="regex-sandbox__right-panel">
            <Tabs
              defaultActiveKey="visualizer"
              items={[
                {
                  key: "visualizer",
                  label: (
                    <span>
                      <EyeOutlined />
                      可视化
                    </span>
                  ),
                  children: <RegexVisualizer pattern={pattern} flags={flags} testString={testString} selectedPreset={selectedPreset} />,
                },
                {
                  key: "examples",
                  label: (
                    <span>
                      <BulbOutlined />
                      用例引导
                    </span>
                  ),
                  children: <RegexGuideExamples />,
                },
                {
                  key: "cheatsheet",
                  label: (
                    <span>
                      <BookOutlined />
                      语法备忘
                    </span>
                  ),
                  children: <RegexCheatSheet />,
                },
              ]}
              className="regex-sandbox__tabs"
            />
          </Sider>
        </Layout>
      </Content>

      <FirstTimeGuide visible={showFirstTimeGuide} onClose={handleFirstTimeGuideClose} />
    </Layout>
  );
};

export default RegexSandboxModule;
