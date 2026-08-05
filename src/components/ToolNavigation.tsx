import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  SearchOutlined,
  ArrowRightOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import ToolIcon from "@/components/ToolIcon";
import { useThemeStore } from "@/store/useThemeStore";
import "./ToolNavigation.scss";

// 工具元数据接口
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  path: string;
  keywords?: string;
}

interface ToolNavigationProps {
  tools: Tool[];
}

// 分类 → 徽章类名映射
const CATEGORY_CLASS: Record<string, string> = {
  开发工具: "et-badge-dev",
  设计工具: "et-badge-design",
  生活工具: "cat-life",
};

// 分类筛选选项（保留工具原始顺序）
const CATEGORY_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "开发工具", label: "开发工具" },
  { value: "设计工具", label: "设计工具" },
  { value: "生活工具", label: "生活工具" },
];

// 工具导航首页 —— 墨骨朱魂设计方向
const ToolNavigation: React.FC<ToolNavigationProps> = ({ tools }) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  // ⌘K / Ctrl+K 聚焦搜索框
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 搜索 + 分类联合过滤
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      const matchesCategory =
        activeCategory === "all" || t.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = (
        t.name +
        " " +
        t.description +
        " " +
        t.category +
        " " +
        (t.keywords ?? "")
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [tools, query, activeCategory]);

  // 滚动揭示动画：观察网格内的卡片节点
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".et-card"));

    // 不支持 IntersectionObserver 时直接显示
    if (typeof IntersectionObserver === "undefined") {
      cards.forEach((c) => c.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [filteredTools]);

  return (
    <div className="et-page">
      <header className="et-header">
        <div className="et-container et-header__bar">
          <Link to="/" className="et-header__brand">
            <img
              src={`${import.meta.env.BASE_URL}icon.svg`}
              alt="etools"
              className="et-header__logo"
            />
            <span className="et-header__brand-name">etools</span>
          </Link>
          <nav className="et-header__nav">
            <Link to="/" className="et-header__nav-link is-active">
              首页
            </Link>
            <a
              href="https://github.com/evenshry/even-tools"
              target="_blank"
              rel="noreferrer"
              className="et-header__nav-link"
            >
              GitHub
            </a>
            <button
              type="button"
              className="et-header__theme-toggle"
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              {mode === "light" ? <MoonOutlined /> : <SunOutlined />}
            </button>
          </nav>
        </div>
      </header>

      <section className="et-hero">
        <div className="et-hero__glow" aria-hidden />
        <div className="et-container et-hero__inner">
          <h1 className="et-hero__title">
            <span className="et-hero__word">实用工具，</span>
            <span className="et-hero__word et-hero__word--brand">触手可及</span>
          </h1>
          <p className="et-hero__tagline et-hero__word">
            覆盖开发、设计、生活场景的纯前端工具集
          </p>
          <div className="et-search">
            <SearchOutlined className="et-search__icon" />
            <input
              ref={inputRef}
              type="text"
              className="et-search__input"
              placeholder="搜索工具名称或功能…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索工具"
            />
            <kbd className="et-kbd">⌘K</kbd>
          </div>
          <div className="et-hero__image">
            <img
              src={`${import.meta.env.BASE_URL}hero-visual.jpg`}
              alt="工具集主视觉"
              className="et-hero__image-img"
            />
          </div>
        </div>
      </section>

      <section id="tools" className="et-tools-section">
        <div className="et-container">
          <div className="et-chips" role="group" aria-label="工具分类筛选">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  "et-chip" +
                  (activeCategory === opt.value ? " is-active" : "")
                }
                onClick={() => setActiveCategory(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="et-tools-grid" ref={gridRef}>
            {filteredTools.length === 0 && (
              <div className="et-empty">未找到匹配的工具</div>
            )}
            {filteredTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="et-card et-reveal"
                data-category={tool.category}
              >
                <span className="et-card__icon" aria-hidden>
                  <ToolIcon id={tool.id} />
                </span>
                <ArrowRightOutlined className="et-card__arrow" aria-hidden />
                <div className="et-card__body">
                  <h3 className="et-card__name">{tool.name}</h3>
                  <p className="et-card__desc">{tool.description}</p>
                </div>
                <span
                  className={
                    "et-card__badge " +
                    (CATEGORY_CLASS[tool.category] ?? "et-badge-life")
                  }
                >
                  {tool.category}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="et-footer">
        <div className="et-container et-footer__inner">
          <span>etools · 纯前端工具集</span>
          <span className="et-footer__tech">React · TypeScript · Vite</span>
        </div>
      </footer>
    </div>
  );
};

export default ToolNavigation;
