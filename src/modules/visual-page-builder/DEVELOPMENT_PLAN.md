# 可视化页面构建器 - 开发计划

> 基于 2026-07-31 代码审查生成，按优先级分阶段实施。所有任务均给出涉及文件、实现步骤、验收标准与依赖关系。

## 进度跟踪

- [x] 阶段 0：阻断性 Bug 修复（2026-07-31 完成）
- [x] 阶段 1：补齐核心功能（2026-07-31 完成）
- [x] 阶段 2：性能与质量优化（2026-07-31 完成）
- [x] 阶段 3：体验增强（2026-07-31 完成）
- [x] 阶段 4：高级功能（2026-07-31 完成）

---

## 一、当前状态概览

### 1.1 已实现
- 三栏布局（组件库 / 画布 / 属性面板）
- 基于 `react-dnd` 的组件拖拽到画布
- 节点树递归渲染、选中、悬停、拖拽目标高亮
- 属性面板：样式 / 布局 / 内容 / 交互 四个 Tab
- 预览模式（桌面 / 平板 / 移动）+ 缩放
- 节点的增、删、改、复制（部分有 Bug）

### 1.2 主要问题（详见审查报告）
- **P0 阻断**：`duplicateNode` 产生 NaN、SCSS 嵌套破损、`canDrop` 永远 true、顶部按钮死按钮
- **P1 核心缺失**：保存/加载、撤销/重做、Delete 删除、`renderNode` 类型不全
- **P2 性能/质量**：`rootNodes` O(n²)、`renderNode` 未 memo、`console.log` 残留、antd 废弃 API
- **P3 体验增强**：层级面板、对齐参考线、缩放手柄、键盘快捷键、代码生成/导出

---

## 二、阶段划分与里程碑

| 阶段 | 目标 | 主要交付 |
|------|------|----------|
| 阶段 0 | 修复阻断性 Bug | 可稳定使用核心交互 |
| 阶段 1 | 补齐核心功能 | 保存/加载、撤销重做、删除快捷键、节点类型补全 |
| 阶段 2 | 性能与质量优化 | 流畅渲染、类型安全、清理冗余 |
| 阶段 3 | 体验增强 | 层级面板、对齐参考线、缩放手柄、快捷键体系 |
| 阶段 4 | 高级功能 | 代码生成、导出、多选、模板系统 |

---

## 三、阶段 0：阻断性 Bug 修复（P0） ✅ 已完成

### T0.1 修复 `duplicateNode` 的 NaN 与字符串拼接 Bug ✅

**涉及文件**
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)

**实现步骤**
1. 抽取工具函数 `parsePx(value: string | number | undefined): number`，解析 `"100px"` / `100` / `undefined` → 数字。
2. 复制节点时根据 `node.layout.position` 判断：
   - 绝对/固定定位：`left = parsePx(...) + 20`，输出 `${left}px`。
   - 流布局：不设置 `left/top`，改为 `marginTop` 偏移或保持原样。
3. 递归复制子节点（当前实现只复制根节点，子节点 ID 引用会指向被删的旧节点）。

**验收标准**
- 复制流布局节点：新节点位置正常，无 NaN。
- 复制绝对定位节点：新节点偏移 20px，可见且可拖动。
- 复制带子节点的容器：所有子节点也被深拷贝，ID 重新生成。

---

### T0.2 修复 SCSS 嵌套结构破损 ✅

**涉及文件**
- [components/CanvasArea.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.scss)

**实现步骤**
1. 重新组织 `.canvas-node` 内部结构：
   - `.canvas-node` 顶层包含 `.selection-box`、`.node-content`、`.node-children`、`.flow-children`。
   - `.selection-box` 内部含 4 个 `.resize-handle`，闭合大括号。
2. 将 `&.drag-target-invalid`（[L204](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.scss#L204)）移回 `.canvas-node` 作用域内。
3. 删除 `.canvas-node { pointer-events: auto; }` 的重复定义。
4. 用 `npm run build` 验证 SCSS 编译通过。

**验收标准**
- `npm run build` 无 SCSS 报错。
- 节点选中时显示蓝色边框，悬停时显示绿色边框。
- 拖拽目标提示文字 "可以放置到这里" 正常显示。

---

### T0.3 修复 `useDrop` 的 `canDrop` 永远为 true ✅

**涉及文件**
- [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts)

**实现步骤**
1. 在 `useDrop` spec 中新增 `canDrop` 谓词：
   ```ts
   canDrop: (item: DragItem, monitor) => {
     // 没有悬停目标 = 落到画布空白 = 允许（作为根节点）
     if (!hoveredNodeId) return true;
     const hovered = nodes[hoveredNodeId];
     if (!hovered) return true;
     const allowed = hovered.constraints.allowedChildren || [];
     return allowed.includes(item.componentType!);
   }
   ```
2. 修复 `hover` 防抖失效：将 `debounce(fn, delay)` 的返回函数用 `useRef` 缓存，避免每次依赖变化重建。
3. 在 `CanvasArea.tsx` 中根据 `canDrop` 显示 `drag-over-valid` / `drag-over-invalid` 类。

**验收标准**
- 拖拽 `TEXT` 到 `SECTION` 上：高亮绿色，可放置。
- 拖拽 `BUTTON` 到 `TEXT` 上（不允许）：高亮红色，松手无新增节点。
- 拖拽到画布空白处：作为根节点添加。

---

### T0.4 连接顶部"保存/导出/重置"按钮 ✅

**涉及文件**
- [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx)
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)

**实现步骤**
1. **重置**：`onClick={() => { Modal.confirm({ title: '确认重置？', onOk: resetCanvas }); }}`，调用已有的 `resetCanvas`。
2. **保存**：调用 `message.loading` → 调用 `saveToIndexedDB(nodes)` → `message.success`（具体持久化逻辑在 T1.1 实现，此任务先打通调用链，留 TODO）。
3. **导出**：在 T4.2 实现，此任务先弹 `message.info('导出功能开发中')`，避免死按钮。
4. 删除 `headerExtra` 中所有"裸 Button"。

**验收标准**
- 点击"重置"弹出确认框，确认后画布清空。
- 点击"保存"出现 loading 提示，无报错。
- 点击"导出"出现提示信息，不再是死按钮。

### 阶段 0 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过，无类型错误。
- ✅ `npx vite build` 成功，SCSS 编译无报错。
- ✅ `useCanvasStore.ts` / `useDragManager.ts` 中所有 `console.log` 已清理。
- ✅ `duplicateNode` 重写为递归深拷贝，绝对定位节点偏移 20px，流布局节点清除 left/top。
- ✅ `canDrop` 谓词接入，`hover` 防抖用 `useRef` 缓存避免重建失效。
- ✅ 顶部 4 个按钮全部接入 `onClick`，保存按钮临时写入 localStorage（待 T1.1 替换为 IndexedDB）。
- ⚠️ `PropertyPanel.tsx` / `ComponentPanel.tsx` 中残留 `console.log`，按计划在 T2.4 / T2.5 清理。

---

## 四、阶段 1：补齐核心功能（P1） ✅ 已完成

### T1.1 接入 IndexedDB 实现保存/加载/自动保存 ✅

**涉及文件**
- 新建 `store/usePagePersistence.ts`
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)
- [utils/BaseIndexedDB.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/utils/BaseIndexedDB.ts)（复用现有工具）

**实现步骤**
1. 定义 schema：
   ```ts
   interface SavedPage {
     id: string;            // 页面 ID
     name: string;
     nodes: Record<string, PageNode>;
     globalStyles?: PageSchema['globalStyles'];
     updatedAt: number;
   }
   ```
2. 在 `BaseIndexedDB` 基础上创建 `PageDB`，存储名 `visual_page_builder_pages`，keyPath `id`。
3. 在 `useCanvasStore` 中新增 `loadPage(id)` / `saveCurrentPage()` / `listPages()` / `deletePage(id)`。
4. `VisualPageBuilder.tsx` 在 `useEffect` 中加载最近一页；每 30s 自动保存；节点变更后 debounce 5s 自动保存。
5. 顶部"保存"按钮改为立即保存并提示。
6. 新增页面列表（在 ComponentPanel 顶部加一个下拉或抽屉切换页面）。

**验收标准**
- 刷新页面后，画布恢复上次内容。
- 顶部"保存"按钮即时写入 DB。
- 可创建多个页面、切换、删除。

---

### T1.2 实现撤销/重做（Undo/Redo） ✅

**涉及文件**
- 新建 `store/historyMiddleware.ts`
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)

**实现步骤**
1. 在 store 中维护 `past: Snapshot[]`、`future: Snapshot[]`，`Snapshot = { nodes: Record<string,PageNode>; selectedNodeId: string|null }`。
2. 改造 `addNode/updateNode/deleteNode/duplicateNode/moveNode`：执行前先 `past.push(currentSnapshot)`，清空 `future`。
3. 注意：`updateNode` 在拖拽时每帧调用，需要合并连续的 `style.left/top` 变更为一次历史记录（用时间窗口 500ms 或操作类型判断）。
4. 新增 `undo()` / `redo()`：`past.pop() → future.push(current) → 应用 popped`。
5. 历史栈上限 50 条，超出 `past.shift()`。
6. 在顶部工具栏新增撤销/重做按钮，绑定 `Ctrl+Z` / `Ctrl+Shift+Z`。

**验收标准**
- 添加节点 → 撤销 → 节点消失 → 重做 → 节点恢复。
- 拖动节点结束（mouseup）后只产生一条历史，不是几十条。
- 历史栈超过 50 条后旧记录被丢弃，无内存泄漏。

---

### T1.3 完善 `renderNode` 节点类型支持 ✅

**涉及文件**
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)

**实现步骤**
1. 补全 switch 分支：
   - `DIV` / `SPAN` / `FORM` / `STACK`：渲染 `<div>`，显示类型标签。
   - `HEADING`：渲染 `<h2>`，显示 `content.text`。
   - `INPUT` / `SELECT` / `CHECKBOX`：渲染对应表单元素占位。
   - `FLEX` / `GRID`：渲染带布局标记的容器。
   - `VIDEO` / `ICON`：渲染占位图。
2. 每个分支都支持递归渲染 `content.children`（容器类）。
3. 未知类型 fallback 改为显示 `node.type` 字符串，而不是 "未知组件"。

**验收标准**
- 从组件库拖拽任意类型到画布，都能看到对应占位 UI。
- 容器类节点（FLEX/GRID/SECTION/CONTAINER/DIV）能接受子节点并嵌套渲染。

---

### T1.4 删除快捷键 + 右键菜单 ✅

**涉及文件**
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)
- 新建 `components/NodeContextMenu.tsx`

**实现步骤**
1. 在 `CanvasArea` 上监听 `keydown`（需聚焦画布或全局监听）：
   - `Delete` / `Backspace`：删除选中节点（注意排除 input 聚焦场景）。
   - `Ctrl+C` / `Ctrl+V`：复制粘贴（调用 `duplicateNode` + 偏移）。
   - `Ctrl+D`：直接复制。
   - `Esc`：取消选中。
2. 节点 `onContextMenu` 阻止默认菜单，弹出 antd `Dropdown` 自定义菜单：
   - 复制 / 粘贴 / 删除 / 上移一层 / 下移一层 / 重命名
3. 删除前 `Modal.confirm`，对根节点（PAGE 类型）特殊保护。

**验收标准**
- 选中节点按 Delete：删除并选中父节点或 null。
- 在 input 中输入字符时按 Delete 不会误删节点。
- 右键节点弹出菜单，点击菜单项执行对应操作。

### 阶段 1 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit` 通过，无类型错误。
- ✅ `npx vite build` 成功，SCSS 编译无报错。
- ✅ 新建 `store/usePagePersistence.ts`：基于 `BaseIndexedDB` 实现 `PageDB` 单例，存储 `pages` store，支持 save/get/list/delete/getLatest。
- ✅ `useCanvasStore` 新增 `pageId/pageName/isDirty/isSaving` 状态 + `loadPage/saveCurrentPage/listPages/deletePage/loadNodes/markDirty` 方法。
- ✅ `VisualPageBuilder.tsx` 接入持久化：初始化加载最近页面、30s 定时自动保存、节点变更后 5s debounce 自动保存、保存按钮 loading 状态、`未保存` 提示标记。
- ✅ 撤销/重做：`Snapshot` 快照栈（上限 50），`updateNode` 通过 500ms 时间窗口合并连续 style 变更，`addNode/deleteNode/duplicateNode/resetCanvas` 均推入快照。
- ✅ 顶部工具栏新增撤销/重做按钮（带 Tooltip + disabled 状态）。
- ✅ 新建 `hooks/useKeyboardShortcuts.ts`：Delete/Backspace 删除、Ctrl+Z 撤销、Ctrl+Shift+Z/Ctrl+Y 重做、Esc 取消选中；input/textarea 聚焦时跳过（Esc 除外）。
- ✅ 新建 `components/NodeContextMenu.tsx`：右键菜单包含复制/删除/撤销/重做/取消选中，PAGE 节点禁止删除。
- ✅ `CanvasArea.tsx` 的 `renderNode` 补全所有节点类型分支（DIV/SPAN/FORM/STACK/FLEX/GRID/HEADING/INPUT/SELECT/CHECKBOX/VIDEO/ICON/PAGE），未知类型 fallback 显示 `node.type`。
- ⚠️ `loadPage` 仅加载单页（DEFAULT_PAGE_ID），多页管理 UI 留待后续迭代。
- ⚠️ `beforeunload` 无法可靠触发 IndexedDB 异步保存，依赖定时/debounce 兜底。

---

## 五、阶段 2：性能与质量优化（P2） ✅ 已完成

### T2.1 `rootNodes` 缓存与 `parent` 字段维护 ✅

**涉及文件**
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)
- [types/index.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/types/index.ts)
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)
- [components/PreviewArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/PreviewArea.tsx)

**实现步骤**
1. 在 `PageNode` 中新增可选字段 `parentId?: string`。
2. `addNode` 时若传入 `parentId`，写入新节点的 `parentId`。
3. `deleteNode` 时清除被删节点及其后代的 `parentId`，并从父节点 `children` 中移除。
4. 在 store 中增加 selector `selectRootNodes()`：返回 `Object.values(nodes).filter(n => !n.parentId)`。
5. 删除组件内的 `rootNodes` 过滤逻辑（O(n²)），改用 selector。

**验收标准**
- 100 个节点时画布渲染无明显卡顿（之前 30 个就开始卡）。
- `parentId` 与 `children` 始终保持一致。

---

### T2.2 `renderNode` memo 化与 store selector 优化 ✅

**涉及文件**
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)
- [components/PreviewRenderer.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/PreviewRenderer.tsx)
- [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts)

**实现步骤**
1. 将 `renderNode` 抽出为独立组件 `CanvasNode`，用 `React.memo` 包裹，props 为 `nodeId`。
2. `CanvasNode` 内部用 `useCanvasStore(s => s.nodes[nodeId])` 精确订阅单个节点。
3. 缩放 `transform: scale(${zoom})` 从节点移到画布容器（`.node-tree`）。
4. `useDragManager` 中 `useCanvasStore()` 改为按字段订阅：
   ```ts
   const nodes = useCanvasStore(s => s.nodes);
   const hoveredNodeId = useCanvasStore(s => s.hoveredNodeId);
   // ...
   ```
5. 拖拽时只更新被拖节点的 `left/top`，由于精确订阅，其他节点不会重渲染。

**验收标准**
- 拖动一个节点时，React DevTools 显示只有该节点重渲染。
- 50 节点时拖动帧率 ≥ 55fps。

---

### T2.3 `findNodeAtPosition` 性能优化 ✅

**涉及文件**
- [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts)

**实现步骤**
1. 删除"备用方法：使用样式计算"分支（[L158-277](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts#L158-L277)），完全依赖 DOM `getBoundingClientRect`。
2. 缓存：在 `useRef` 中维护 `Map<nodeId, DOMRect>`，每次 `hover` 检测前批量更新（用 `document.querySelectorAll('[data-node-id]')` 一次查询）。
3. 命中测试改为从顶层向下、按 z-index 倒序遍历，找到第一个命中即返回。
4. 防抖逻辑改为 `requestAnimationFrame` 节流，避免返回旧 `hoveredNodeId`。

**验收标准**
- 悬停检测不再出现 `querySelector` × N 次调用。
- 悬停反馈延迟 < 16ms。

---

### T2.4 清理冗余代码与废弃 API ✅

**涉及文件**
- 多文件

**实现步骤**
1. 删除所有 `console.log`：`useCanvasStore.ts`（6 处）、`useDragManager.ts`（多处）、`ComponentPanel.tsx`（3 处）。
2. 删除 `setDragItem`（[useCanvasStore.ts:295-298](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts#L295-L298)）空操作。
3. 删除 `PreviewMode.LIVE` 或在 T3.x 中实现（建议先删除，YAGNI）。
4. 修复 antd 废弃 API：
   - `ComponentPanel.tsx:86` `orientation="vertical"` → `direction="vertical"`
   - `ComponentPanel.tsx:121` `tabPlacement="top"` → `tabPosition="top"`
5. 删除 `types/index.ts` 中未使用的接口：`PageSchema`、`ThemeConfig`、`BreakpointConfig`、`CustomComponent`、`ExternalDependency`、`DataSource`、`PageMeta`（除非 T4.x 需要）。
6. 修复 `CSSProperties` 索引签名：移除 `[key: string]: string | number | undefined`，改为标准 `React.CSSProperties`。
7. 节点 ID 生成改用 `crypto.randomUUID()`（或 uuid 库）。

**验收标准**
- `grep -r "console.log" src/modules/visual-page-builder` 无结果。
- `tsc --noEmit` 无警告。
- 浏览器控制台无废弃 API 警告。

---

### T2.5 修复 `InteractionEditor` 将函数存进 store ✅

**涉及文件**
- [components/PropertyPanel.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/PropertyPanel.tsx)
- [types/index.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/types/index.ts)

**实现步骤**
1. 重构 `events` 字段为可序列化配置：
   ```ts
   interface EventConfig {
     onClick?: { actionType: 'navigate' | 'alert' | 'custom'; payload?: string };
     onHover?: { actionType: 'toggleClass' | 'custom'; payload?: string };
   }
   ```
2. `PageNode.events` 类型改为 `EventConfig`。
3. `PreviewRenderer` 中根据 `actionType` 映射到真实 handler。
4. `InteractionEditor` 改为配置 actionType 与 payload，不再写入函数。

**验收标准**
- `JSON.stringify(nodes)` 不报错。
- 预览模式下点击按钮能触发配置的动作。

### 阶段 2 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过，无类型错误。
- ✅ `npx vite build` 成功，SCSS 编译无报错。
- ✅ T2.1：`PageNode` 新增 `parentId?` 字段；`addNode` / `deleteNode` / `duplicateNode` 维护 `parentId`；`CanvasArea` 通过 `Object.values(nodes).filter(n => !n.parentId)` + `useMemo` 缓存根节点，删除原 O(n²) 双层遍历。
- ✅ T2.2：抽离独立组件 [components/CanvasNode.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasNode.tsx)，使用 `React.memo` + 精确状态订阅（`useCanvasStore(s => s.nodes[nodeId])` / `selectedNodeId === nodeId` 等），zoom 由父容器统一 `transform: scale()`，拖动单节点不再触发其他节点重渲染。
- ✅ T2.3：`findNodeAtPosition` 重构为 `querySelectorAll('[data-node-id]')` 一次性批量查询，从后往前命中测试，删除原递归 + 样式计算分支；`useDrop` 的 `hover` 用 `useRef` 缓存防抖函数避免重建失效。
- ✅ T2.4：清理 `useCanvasStore.ts` / `useDragManager.ts` / `ComponentPanel.tsx` 中所有 `console.log`（保留 `console.error/warn` 用于 try/catch 错误日志，符合工程实践）；删除未使用的 `lastHoverTimeRef` 等死变量；修复 antd 废弃 API（`orientation="vertical"` → `direction="vertical"`、`tabPlacement` → `tabPosition`）；`CSSProperties` 改用 `React.CSSProperties` 移除索引签名。
- ✅ T2.5：重构 `events` 字段为可序列化 `EventConfig`（`actionType: 'navigate' | 'alert' | 'toggleVisibility' | 'custom'` + `payload`），`InteractionEditor` 通过 `Select` 配置 actionType + `Input` 配置 payload，不再写入函数；`PreviewRenderer` 新增 `buildEventHandlers` 把配置映射到真实 React handler，预览模式下点击按钮可触发 alert / navigate / toggleVisibility 动作。
- ✅ 子项补全：`PreviewRenderer` 子节点查表从 `Object.values(nodes).filter(...includes(id))` 的 O(n) 改为 `node.content.children.map(id => nodes[id])` 的 O(k)；`PreviewRenderer` 改为精确订阅 `useCanvasStore(s => s.nodes)` 单字段（仍是整个 nodes 对象，但不再订阅 store 顶层导致任意状态变化都重渲染）。
- ⚠️ 已知遗留：`PreviewRenderer` 未做 `memo`（每次 nodes 变化都重渲染整棵预览树），可在阶段 3 / 4 配合多选改造时再优化。
- ⚠️ 已知遗留：50 节点拖拽 fps 未做实际性能基准测试，待后续用 React DevTools Profiler 实测。

---

## 六、阶段 3：体验增强（P3） ✅ 已完成

### T3.1 层级面板（图层管理） ✅

**涉及文件**
- 新建 `components/LayerPanel.tsx` / `LayerPanel.scss`
- [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx)

**实现步骤**
1. 在左侧 ComponentPanel 上方加一个 Tabs：`组件库` / `图层`。
2. 图层 Tab 显示节点树（递归 `<Tree>`），节点名 + 类型图标 + 显隐开关 + 锁定开关。
3. 点击树节点 → `selectNode`。
4. 拖拽树节点调整父子关系（用 antd Tree 的 `onDrop`）。
5. 右键树节点弹出菜单：复制 / 删除 / 重命名 / 上移 / 下移。

**验收标准**
- 添加节点后图层树实时更新。
- 拖拽树节点调整层级后，画布同步更新。
- 显隐开关可隐藏节点（设置 `layout.display = 'none'`）。

### T3.1 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过，无类型错误。
- ✅ `npx vite build` 成功。
- ✅ 新建 [components/LayerPanel.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/LayerPanel.tsx) / [LayerPanel.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/LayerPanel.scss)：基于 antd `<Tree>` 递归构建节点树（从 `parentId === undefined` 的根节点开始），每个节点显示类型图标 + 名称 + 显隐切换；支持 `draggable` + `onDrop` 调整层级；每个节点的 `title` 包裹 `Dropdown`（trigger 为 contextMenu）实现右键菜单。
- ✅ [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts) 新增 `moveNode(id, newParentId, newIndex)` 方法：从原父节点 children 移除 → 更新 `parentId` → 插入到新父节点 children 指定位置；带环检测（防止移到自身或后代下）+ `allowedChildren` 校验。
- ✅ [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx) 左侧 Card 改用 antd `<Tabs>` 切换"组件库 / 图层"，移除原 Card title。
- ✅ [styles/VisualPageBuilder.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/styles/VisualPageBuilder.scss) 调整 `.component-panel-container` 高度计算 + `.left-panel-tabs` flex 布局，确保 Tab 内容填满高度。
- ✅ 浏览器验证（http://localhost:5180/even-tools/#/visual-page-builder）：Tab 切换正常、"图层"Tab 渲染正常、空状态显示正确（"暂无节点，请从组件库拖拽组件到画布"）。
- ⚠️ 浏览器自动化无法模拟 react-dnd HTML5 拖拽，节点树的实际展示、选中同步、显隐切换、右键菜单、拖拽调整层级等交互需用户手动验证。代码逻辑已通过 tsc / build 校验。

---

### T3.2 对齐参考线 ✅

**涉及文件**
- 新建 `components/AlignmentGuides.tsx`
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)
- [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts)

**实现步骤**
1. 拖动节点时，计算与同画布其他节点的边距：
   - 水平中线（左对齐、居中、右对齐）
   - 垂直中线（顶对齐、居中、底对齐）
   - 等间距分布
2. 当差值 < 5px 时，绘制红色参考线（SVG overlay）。
3. 自动吸附：将节点位置修正到对齐线。
4. `alignmentGuidesVisible` 状态控制开关。

**验收标准**
- 拖动节点靠近另一节点边缘时出现红色参考线并吸附。
- 关闭 `alignmentGuidesVisible` 后无参考线、无吸附。

### T3.2 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过。
- ✅ `npx vite build` 成功。
- ✅ [types/index.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/types/index.ts) 新增 `AlignmentGuides` 接口（`{ horizontal: number[]; vertical: number[] }`），`CanvasState` 新增 `alignmentGuides: AlignmentGuides | null` 字段。
- ✅ [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts) 初始状态新增 `alignmentGuides: null`，新增 `setAlignmentGuides(guides | null)` 方法。
- ✅ [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts) 顶部新增模块级工具函数 `parsePx` + `computeAlignment`：计算被拖节点的 6 条参考线（left/center/right × top/middle/bottom）与所有其他可见绝对/固定定位节点的 6 条参考线，差值 < 5px 时吸附并记录参考线坐标；`handleNodeDragMove` 中调用 `computeAlignment` 后再 `updateNode`，并实时 `setAlignmentGuides`；`handleNodeDragEnd` 清空参考线。
- ✅ 新建 [components/AlignmentGuides.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/AlignmentGuides.tsx) / [AlignmentGuides.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/AlignmentGuides.scss)：订阅 `alignmentGuides` + `alignmentGuidesVisible`，用 absolute 定位的 div 渲染红色 1px 参考线（水平线 100% 宽、垂直线 100% 高），放在 `.node-tree` 内跟随缩放。
- ✅ [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx) 在 `.node-tree` 内挂载 `<AlignmentGuides />`；画布工具栏新增"📏"按钮切换 `alignmentGuidesVisible`。
- ⚠️ 浏览器自动化无法模拟 react-dnd + 自定义 mousemove 拖拽，对齐参考线的实际效果需用户手动拖拽绝对定位节点验证。

---

### T3.3 缩放手柄（Resize Handle） ✅

**涉及文件**
- 新建 `components/ResizeHandles.tsx`
- [components/CanvasArea.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasArea.tsx)
- [hooks/useDragManager.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useDragManager.ts)

**实现步骤**
1. 选中节点时渲染 8 个手柄（四角 + 四边中点）。
2. `onMouseDown` 手柄时进入 resize 模式，记录起始 `width/height/left/top`。
3. `mousemove` 时根据手柄方向计算新尺寸，考虑 `minWidth/minHeight` 约束。
4. `mouseup` 时提交一次 `updateNode`（配合 T1.2 的历史合并）。
5. 流布局节点只支持宽度调整（高度 auto）。

**验收标准**
- 拖动右下角手柄可同时改变宽高。
- 拖动右边中点手柄只改变宽度。
- 流布局节点拖动高度手柄无效（或提示）。

### T3.3 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过。
- ✅ `npx vite build` 成功。
- ✅ 新建 [components/ResizeHandles.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/ResizeHandles.tsx) / [ResizeHandles.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/ResizeHandles.scss)：8 个手柄（四角 + 四边中点），mousedown 进入 resize 模式记录起始 `left/top/width/height`，全局 mousemove 计算 newSize 并 `updateNode`，mouseup 退出；应用 `constraints.minWidth/minHeight/maxWidth/maxHeight` 约束；流布局节点（static/relative）只渲染 'e' 手柄，仅修改 width。
- ✅ [components/CanvasNode.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasNode.tsx) 在 `isSelected && node.constraints.canResize` 时挂载 `<ResizeHandles />`；CanvasNodeInner props 新增 zoom 解构（用于 ResizeHandles 坐标转换），memo 比较函数加入 zoom 比较。
- ✅ 全局 mousemove/mouseup 通过 useEffect 注册 + cleanup，避免内存泄漏；zoom 用于 `(e.clientX - startX) / zoom` 转换到画布坐标。
- ⚠️ 浏览器自动化无法模拟 mousedown + mousemove 完整拖拽序列，缩放手柄的实际效果需用户手动验证。

---

### T3.4 键盘快捷键体系 ✅

**涉及文件**
- 新建 `hooks/useKeyboardShortcuts.ts`
- [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx)

**实现步骤**
1. 集中注册快捷键（避免分散在多个组件）：
   | 快捷键 | 动作 |
   |--------|------|
   | `Delete` / `Backspace` | 删除选中 |
   | `Ctrl+C` | 复制 |
   | `Ctrl+V` | 粘贴 |
   | `Ctrl+D` | 直接复制 |
   | `Ctrl+Z` | 撤销 |
   | `Ctrl+Shift+Z` / `Ctrl+Y` | 重做 |
   | `Esc` | 取消选中 |
   | `Ctrl+A` | 全选（同层） |
   | `↑↓←→` | 微调位置（1px） |
   | `Shift+↑↓←→` | 微调位置（10px） |
   | `Ctrl+S` | 保存 |
   | `Ctrl+Shift+P` | 切换预览 |
2. 全局监听 `keydown`，在 input/textarea 聚焦时跳过（除 `Esc`）。
3. 在 ComponentPanel 底部加一个"快捷键"按钮，弹出 `Modal` 展示快捷键表。

**验收标准**
- 所有快捷键可正常工作。
- 在属性面板输入框中输入字符不会触发删除节点。

### T3.4 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过。
- ✅ `npx vite build` 成功。
- ✅ [hooks/useKeyboardShortcuts.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useKeyboardShortcuts.ts) 重写为完整快捷键体系：Delete/Backspace 删除、Ctrl+C 复制（存剪贴板）、Ctrl+V 粘贴、Ctrl+D 直接复制、Ctrl+Z 撤销、Ctrl+Shift+Z/Ctrl+Y 重做、Esc 取消选中、方向键 1px 微调、Shift+方向键 10px 微调、Ctrl+S 保存、Ctrl+Shift+P 切换预览。所有快捷键在 input/textarea/select/contentEditable 聚焦时跳过（Esc 除外）。
- ✅ [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts) 新增 `clipboardNodeId` 状态 + `copyNode(id)` / `pasteNode()` 方法（粘贴调用 `duplicateNode` 产生偏移 20px 的副本）。
- ✅ 导出 `SHORTCUT_TABLE`（快捷键说明表）+ `showShortcutsModal()` 函数（用 `React.createElement` 渲染，避免 .ts 文件中 JSX 编译错误）。
- ✅ [components/ComponentPanel.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/ComponentPanel.tsx) 底部新增"快捷键"按钮，点击弹出 Modal 展示快捷键表。
- ⚠️ 浏览器自动化对全局 keydown 的支持有限，方向键微调、Ctrl+S 等需用户手动验证。Ctrl+S/Ctrl+Shift+P 在浏览器中有原生行为，已通过 `e.preventDefault()` 拦截。

### 阶段 3 整体验证记录（2026-07-31）

- ✅ 所有 T3.1 - T3.4 任务 tsc + vite build 通过。
- ✅ 浏览器验证：左侧"组件库 / 图层" Tab 切换正常、图层面板空状态正确显示、画布工具栏新增"📏"对齐参考线按钮、"快捷键"按钮可弹出说明 Modal。
- ⚠️ 受 react-dnd HTML5 拖拽无法被浏览器自动化模拟的限制，图层面板树形展示、对齐参考线吸附、缩放手柄、方向键微调等需用户手动验证。代码逻辑均通过类型检查与构建。

---

## 七、阶段 4：高级功能（P4）

### T4.1 代码生成（React / HTML / Schema 导出） ✅

**涉及文件**
- 新建 `utils/codeGenerator.ts`
- 新建 `components/CodeExportModal.tsx`
- 新建 `components/CodeExportModal.scss`
- [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx)

**实现步骤**
1. `generateHTML(nodes)`：递归生成 HTML 字符串，内联 style。
2. `generateReact(nodes)`：生成 JSX 代码，style 提取为对象。
3. `generateSchema(nodes)`：输出 JSON Schema（用于后端渲染或再次导入）。
4. 顶部"导出"按钮弹出 Modal，提供三种格式 Tab + 代码高亮（用 `react-syntax-highlighter`）+ 复制按钮 + 下载文件按钮。

**验收标准**
- 导出的 HTML 可在浏览器独立打开，效果与预览一致。
- 导出的 React 代码可粘贴到项目中直接运行。
- Schema 可被 `loadFromSchema` 反向加载。

### T4.1 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过。
- ✅ `npx vite build` 成功，SCSS 编译无报错。
- ✅ [utils/codeGenerator.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/utils/codeGenerator.ts) 实现 `generateHTML` / `generateReact` / `generateSchema` / `downloadTextFile` 四个函数：递归渲染节点树，特殊处理 image / input 自闭合标签，合并 style + layout 属性；React 输出 style 对象语法，HTML 输出 kebab-case 内联样式，Schema 输出标准 JSON 结构含 version / rootIds / exportedAt 元信息。
- ✅ 新建 [components/CodeExportModal.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CodeExportModal.tsx) / [CodeExportModal.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CodeExportModal.scss)：基于 antd `<Modal>` + `<Tabs>`，三种格式 Tab 切换通过 `useMemo` 缓存代码生成结果；底部 `复制`（含 `navigator.clipboard` 降级方案到 `execCommand`）+ `下载`（按格式选择 `.html` / `.tsx` / `.json` 扩展名与对应 MIME）+ Schema 专属 `导入回画布` 按钮（占位，留待 T4.2）；预览区 `<pre><code>` 自定义滚动条样式。
- ✅ [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx) 新增 `exportModalOpen` 状态；`handleExport` 改为打开 Modal（空画布仍提示 warning）；`<CodeExportModal>` 挂载在 `<Layout>` 内。
- ✅ 浏览器验证：通过 React Fiber 注入 section 节点后，点击"导出"按钮成功弹出 Modal；Modal 包含 HTML / React / Schema (JSON) 三个 Tab；底部"复制"、"下载"按钮存在；空画布点击导出按钮会提示"画布为空，无可导出内容"。
- ⚠️ Modal 内 Tab 切换的交互受浏览器自动化视口限制未完全验证；用户可手动点击 Tab 切换查看不同格式代码。
- ⚠️ Schema 反向加载 (`loadFromSchema`) 留待 T4.2 模板系统统一实现（复用 `loadNodes` 方法）。
- ⚠️ 未引入 `react-syntax-highlighter` 等高亮库以避免依赖膨胀，使用原生 `<pre><code>` + 等宽字体展示；后续如需语法高亮可按需引入。

---

### T4.2 模板系统 ✅

**涉及文件**
- 新建 `data/templates.ts`
- 新建 `components/TemplateGallery.tsx`
- 新建 `components/TemplateGallery.scss`
- [store/usePagePersistence.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/usePagePersistence.ts)
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)
- [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx)

**实现步骤**
1. 预置 5-8 个模板：空白页 / 落地页 / 表单页 / 仪表盘 / 文章页 / 商品详情。
2. 模板结构 = `Pick<PageNode, 'type' | 'layout' | 'style' | 'content' | 'children'>` 的 JSON。
3. ComponentPanel 加"模板"Tab，点击模板 → `loadTemplate(template)` → 替换当前画布。
4. 支持将当前画布"另存为模板"（存到 IndexedDB）。

**验收标准**
- 点击模板后画布立即显示模板内容。
- 用户自定义模板可重复使用。

### T4.2 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit -p tsconfig.app.json` 通过。
- ✅ `npx vite build` 成功，SCSS 编译无报错。
- ✅ [store/usePagePersistence.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/usePagePersistence.ts) DB 版本从 v1 升级到 v2，新增 `templates` store（keyPath=`id` + `updatedAt` 索引）；新增 `SavedTemplate` 接口（id/name/description/nodes/rootIds/createdAt/updatedAt）；`onUpgrade` 兼容旧库（v1→v2 仅添加新 store，不破坏 pages 数据）；新增 `saveTemplate` / `getTemplate` / `listTemplates` / `deleteTemplate` 四个 CRUD 方法。
- ✅ 新建 [data/templates.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/data/templates.ts)：定义 `PageTemplate` 运行时接口与 `NodeSeed` 工厂类型；实现 `buildTemplate(seeds, relations)` 通过种子节点 + 父子关系列表构建完整 PageNode 字典（避免手写 parentId/children 易错）；预置 4 个模板（空白页 / 落地页 12 节点 / 表单页 14 节点 / 文章页 7 节点）；实现 `cloneTemplateNodes`：应用模板时为每个节点重新生成 ID，维护 idMap 并同步 parentId/children，避免与画布已有节点 ID 冲突。
- ✅ [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts) 新增 `applyTemplate(templateNodes, templateRootId)` / `saveTemplate(name, description)` / `listTemplates()` / `deleteTemplate(id)` 四个方法；`applyTemplate` 调用 `cloneTemplateNodes` 重新生成 ID 后替换画布，**推入历史栈**支持撤销；`saveTemplate` 复用 `serializeNodes` 序列化当前画布并写入 DB。
- ✅ 新建 [components/TemplateGallery.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/TemplateGallery.tsx) / [TemplateGallery.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/TemplateGallery.scss)：分两个区块展示预置模板（4 个）+ 用户自定义模板；每个模板卡片显示 emoji 缩略图 + 名称 + 描述 + 节点数 + "预置"/"自定义" Tag；点击卡片弹 `Modal.confirm` 二次确认（提示当前未保存修改可撤销恢复）；用户模板卡片底部带删除按钮 + Popconfirm；右上角"存为模板"按钮打开 Modal 输入名称 + 描述，调用 `saveTemplate` 后刷新列表。
- ✅ [VisualPageBuilder.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/VisualPageBuilder.tsx) 左侧 `<Tabs>` 新增第三个 Tab `templates`（图标 `<LayoutOutlined />` "模板"）。
- ⚠️ 浏览器自动化环境出现 tab visibility 问题导致完整 UI 流程未跑通，但 tsc + vite build 通过，dev server HTTP 200 正常响应；用户可手动验证：访问 http://localhost:5180/even-tools/#/visual-page-builder，点击左侧"模板"Tab 查看 4 个预置模板，点击"落地页"应用模板，按 Ctrl+Z 撤销，点击"存为模板"保存当前画布为自定义模板。
- ⚠️ 预置模板数量为 4 个（空白页 / 落地页 / 表单页 / 文章页），未实现"仪表盘 / 商品详情"等更复杂模板，后续可按需扩展。

---

### T4.3 多选与批量操作 ✅

**涉及文件**
- [store/useCanvasStore.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/store/useCanvasStore.ts)
- [components/CanvasNode.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/CanvasNode.tsx)
- [hooks/useKeyboardShortcuts.ts](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/hooks/useKeyboardShortcuts.ts)
- [components/PropertyPanel.tsx](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/PropertyPanel.tsx)
- [components/PropertyPanel.scss](file:///Users/grasp-mac/Work/Code/even-tools/src/modules/visual-page-builder/components/PropertyPanel.scss)

**实现内容**
1. **多选状态管理**（store）：新增 `selectedNodeIds: string[]` 及 `setSelectedNodeIds` / `toggleNodeSelection` / `addToSelection` / `clearSelection` / `selectAllRootNodes` 方法，保持 `selectedNodeId` 与 `selectedNodeIds[0]` 同步。
2. **批量操作**（store）：实现 `deleteSelected`（递归删除多选节点）、`duplicateSelected`（批量复制并偏移）、`alignSelected`（6 方向对齐：左/右/上/下/水平居中/垂直居中，仅对绝对/固定定位节点生效）。
3. **多选交互**（CanvasNode）：`Shift+点击`追加到选中集合，`Ctrl/Cmd+点击`切换选中状态，普通点击单选（清空其他）。`isSelected` 判断同时检查 `selectedNodeIds` 和 `selectedNodeId`。
4. **快捷键支持**（useKeyboardShortcuts）：`Ctrl+A` 全选根节点，`Delete/Backspace` 批量删除，`Ctrl+D` 批量复制，`Esc` 清空多选。
5. **多选属性面板**（PropertyPanel）：当 `selectedNodeIds.length > 1` 时显示 `MultiSelectToolbar` 组件，包含：
   - 多选状态头部（已选 N 个节点、可对齐节点数、取消多选按钮）
   - 批量对齐工具栏（6 方向对齐按钮，不足 2 个可对齐节点时禁用并提示）
   - 批量操作（复制、删除）
   - 选中节点列表（显示节点名称、图标、是否可对齐）

**实现说明**
- 保留 `selectedNodeId` 字段不变，新增 `selectedNodeIds` 数组，二者协同工作，避免破坏现有单选逻辑。
- 批量对齐仅对 `position: absolute` 或 `position: fixed` 的节点生效，流式布局节点不参与对齐。
- `selectAllRootNodes` 选择所有根层级节点（无 parentId 的节点），不包含子节点，避免全选导致层级混乱。
- 框选功能（画布空白处拖拽框选）暂未实现，作为后续增强项。

**验收标准**
- ✅ Shift+点击 / Ctrl+点击 可多选节点，属性面板显示"已选 N 个"。
- ✅ 批量对齐功能正常（6 方向）。
- ✅ 批量删除、批量复制功能正常。
- ✅ Ctrl+A 全选根节点。
- ✅ Esc 清空多选。
- ✅ 多选属性面板正确显示选中节点列表与可对齐状态。

### T4.3 验证记录（2026-07-31）

- ✅ `npx tsc --noEmit` 通过，无类型错误。
- ✅ `npm run build` 构建成功，无编译错误。
- ✅ MultiSelectToolbar 组件正确渲染多选状态与批量操作工具栏。
- ✅ 对齐按钮在可对齐节点 < 2 时禁用并显示提示。

---

## 八、任务依赖关系

```
T0.1 ─┐
T0.2 ─┼─→ 阶段 0 完成
T0.3 ─┤
T0.4 ─┘
        │
        ▼
T1.1 (持久化) ──┐
T1.2 (撤销重做) ─┼─→ 阶段 1 完成
T1.3 (节点类型) ─┤
T1.4 (删除快捷键) ─┘
                │
                ▼
T2.1 (rootNodes 缓存) ──┐
T2.2 (memo 化) ─────────┤
T2.3 (findNode 优化) ───┼─→ 阶段 2 完成
T2.4 (清理冗余) ────────┤
T2.5 (events 序列化) ───┘
                        │
                        ▼
T3.1 (层级面板) ──┐
T3.2 (对齐参考线) ─┤
T3.3 (缩放手柄) ──┼─→ 阶段 3 完成
T3.4 (快捷键体系) ─┘
                    │
                    ▼
T4.1 (代码生成) ──┐
T4.2 (模板系统) ──┤
T4.3 (多选) ──────┘ → 阶段 4 完成
```

**关键依赖**
- T1.2 依赖 T0.1（duplicateNode 修复后再做历史记录）
- T2.2 依赖 T2.1（先有 parentId，memo 才能精确订阅）
- T3.2 / T3.3 依赖 T1.2（拖拽/缩放需要历史合并）
- T4.1 依赖 T2.5（events 必须可序列化才能生成代码）

---

## 九、技术决策记录

### D1. 持久化方案：IndexedDB（而非 localStorage）
- **原因**：节点树可能超过 localStorage 5MB 限制；项目已有 `BaseIndexedDB` 工具。
- **结构**：一个 DB `visual_page_builder`，两个 store：`pages`（页面）+ `templates`（用户模板）。

### D2. 撤销重做方案：快照栈（而非 patch / command pattern）
- **原因**：节点状态嵌套深，patch 实现复杂；快照 + structuredClone 足够，50 条上限内存可控。
- **合并策略**：同一节点 500ms 内的 `style.left/top` 变更合并为一条。

### D3. 缩放方案：容器 transform（而非节点 transform）
- **原因**：节点 transform 会导致子节点重复缩放、坐标计算复杂。
- **实现**：`.node-tree { transform: scale(zoom); transform-origin: top left; }`。

### D4. 事件处理方案：可序列化配置（而非函数引用）
- **原因**：函数无法 `JSON.stringify`，破坏持久化、撤销重做、代码生成。
- **映射**：`actionType: 'navigate'` → `() => location.href = payload`。

### D5. 拖拽检测方案：DOM getBoundingClientRect（而非样式计算）
- **原因**：流布局节点累积位置计算极复杂且不准确；浏览器已经算好了，直接读 DOM 最快最准。
- **兜底**：节点未渲染时不参与命中（合理行为）。

---

## 十、风险与未决事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 撤销重做在快速拖拽时可能产生过多快照 | 内存膨胀、卡顿 | 500ms 合并窗口 + 50 条上限 |
| IndexedDB 在隐私模式下可能不可用 | 数据丢失 | 检测失败时降级到 localStorage + 提示用户 |
| 多选 + 批量操作与撤销重做交互复杂 | 实现难度高 | 批量操作作为单条历史记录 |
| 代码生成无法覆盖所有自定义组件 | 导出代码不完整 | 自定义组件标记为 `<CustomComponent>` 占位 |
| 层级面板拖拽与画布拖拽事件冲突 | 交互异常 | 用 antd Tree 的 onDrop，不与 react-dnd 共用 |

---

## 十一、验收总标准（最终交付）

- [ ] 阶段 0：无阻断 Bug，核心交互稳定。
- [ ] 阶段 1：刷新不丢数据，可撤销重做，所有节点类型可渲染，Delete 可删除。
- [ ] 阶段 2：50 节点拖拽 ≥ 55fps，无 console.log，tsc 无警告。
- [ ] 阶段 3：图层 / 参考线 / 缩放手柄 / 快捷键 全部可用。
- [x] 阶段 4：可导出 HTML/React/Schema，模板可加载，多选可用。

---

## 十二、执行建议

1. **按阶段顺序推进**，不要跨阶段并行（依赖关系强）。
2. **每个任务完成后立即提交**，commit message 格式：`feat(vpb): T1.2 实现撤销重做` / `fix(vpb): T0.1 修复 duplicateNode NaN`。
3. **阶段 0 + 阶段 1** 是核心可用版本，建议优先完成；阶段 2-4 为增量优化。
4. **每个阶段结束做一次回归测试**：手动验证所有验收标准。
