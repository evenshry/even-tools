import { create } from "zustand";

// 主题模式
export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "etools-theme";

// 读取初始主题：localStorage 优先，否则跟随系统偏好
function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// 将主题应用到 <html data-theme="..."> 并持久化
function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
}

// 模块加载时立即同步一次 DOM（避免首屏闪烁）
const initialMode = getInitialMode();
applyTheme(initialMode);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  toggle: () =>
    set((state) => {
      const next: ThemeMode = state.mode === "light" ? "dark" : "light";
      applyTheme(next);
      return { mode: next };
    }),
  setMode: (mode) => {
    applyTheme(mode);
    set({ mode });
  },
}));
