import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SearchOutlined } from "@ant-design/icons";
import ToolIcon from "@/components/ToolIcon";
import ThemeToggle from "@/components/ThemeToggle";
import "./ToolNavigation.scss";

// 工具元数据接口
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  path: string;
}

interface ToolNavigationProps {
  tools: Tool[];
}

// 分类 → 徽章类名映射
const CATEGORY_CLASS: Record<string, string> = {
  开发工具: "cat-dev",
  设计工具: "cat-design",
  生活工具: "cat-life",
};

// 工具导航首页 - Hero + 搜索 + 分类工具卡片
const ToolNavigation: React.FC<ToolNavigationProps> = ({ tools }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K 聚焦搜索框
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

  // 按搜索词过滤工具
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [tools, query]);

  // 保留有匹配工具的分类（保持原分类顺序）
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    tools.forEach((t) => {
      if (!seen.has(t.category)) {
        seen.add(t.category);
        ordered.push(t.category);
      }
    });
    return ordered.filter((c) =>
      filteredTools.some((t) => t.category === c)
    );
  }, [tools, filteredTools]);

  return (
    <div className="tool-nav">
      <header className="tool-nav__header">
        <div className="tool-nav__brand">
          <img
            src={`${import.meta.env.BASE_URL}icon.svg`}
            alt="etools"
            className="tool-nav__logo"
          />
          <span className="tool-nav__brand-name">etools</span>
        </div>
        <div className="tool-nav__actions">
          <a
            href="https://github.com/evenshry/even-tools"
            target="_blank"
            rel="noreferrer"
            className="tool-nav__github"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>

      <section className="tool-nav__hero">
        <h1 className="tool-nav__slogan">实用工具，触手可及</h1>
        <p className="tool-nav__tagline">
          覆盖开发、设计、生活场景的纯前端工具集
        </p>
        <div className="tool-nav__search">
          <SearchOutlined className="tool-nav__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="tool-nav__search-input"
            placeholder="搜索工具名称或功能…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索工具"
          />
          <kbd className="tool-nav__kbd">⌘K</kbd>
        </div>
      </section>

      <section className="tool-nav__categories">
        {categories.length === 0 && (
          <div className="tool-nav__empty">未找到匹配的工具</div>
        )}
        {categories.map((category) => (
          <div key={category} className="tool-nav__category">
            <h2 className="tool-nav__category-title">{category}</h2>
            <div className="tool-nav__cards">
              {filteredTools
                .filter((t) => t.category === category)
                .map((tool) => (
                  <Link key={tool.id} to={tool.path} className="tool-card">
                    <div className="tool-card__icon" aria-hidden>
                      <ToolIcon id={tool.id} />
                    </div>
                    <div className="tool-card__body">
                      <h3 className="tool-card__name">{tool.name}</h3>
                      <p className="tool-card__desc">{tool.description}</p>
                    </div>
                    <span
                      className={`tool-card__cat ${
                        CATEGORY_CLASS[tool.category] ?? ""
                      }`}
                    >
                      {tool.category}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </section>

      <footer className="tool-nav__footer">
        <span>etools · 纯前端工具集</span>
        <span className="tool-nav__footer-tech">React · TypeScript · Vite</span>
      </footer>
    </div>
  );
};

export default ToolNavigation;
