import { createBrowserRouter } from "react-router-dom";
import UnitConverter from "@/modules/unit-converter";
import HabitTracker from "@/modules/habit-tracker";
import ColorCalculator from "@/modules/color-calculator";
import RegexSandbox from "@/modules/regex-sandbox";
import VisualPageBuilder from "@/modules/visual-page-builder";
import ToolNavigation from "@/components/ToolNavigation";
import { tools } from "@/config/tools";

// 创建应用路由配置
export const router = createBrowserRouter([
  {
    path: "/", // 首页：工具导航页面
    element: <ToolNavigation tools={tools} />,
  },
  {
    path: "/unit-converter", // 单位换算工具页面
    element: <UnitConverter />,
  },
  {
    path: "/habit-tracker", // 习惯追踪器页面
    element: <HabitTracker />,
  },
  {
    path: "/color-calculator", // 颜色计算器页面
    element: <ColorCalculator />,
  },
  {
    path: "/regex-sandbox", // 正则表达式沙盒页面
    element: <RegexSandbox />,
  },
  {
    path: "/visual-page-builder", // 视觉页面构建器页面
    element: <VisualPageBuilder />,
  },

]);
