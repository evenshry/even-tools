import { RouterProvider } from "react-router-dom";
import { ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { router } from "@/router";
import { useThemeStore } from "@/store/useThemeStore";

// 应用主组件 - 提供路由与 AntD 主题
function App() {
  const mode = useThemeStore((s) => s.mode);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: mode === "dark" ? "#f25962" : "#e0484f",
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Inter", "Segoe UI", Roboto, "Noto Sans", sans-serif',
          fontSize: 14,
        },
        algorithm:
          mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;
