# AI 開發規格書：Pixel Art Retro Game UI 教學演示版

## 0. 文件目的

本文件提供給 Antigravity、Codex 或其他 AI coding agent 使用，作為網站視覺優化與前端開發的完整任務規格。

網站目前已完成主要功能模組，本版本目標是在不更動既有功能邏輯的前提下，進行：

- 視覺優化
- 互動體驗升級
- RWD
- Loading / Skeleton
- Pixel UI
- 效能整理
- AI 美術素材導入

本版本定位為：

> 課堂演示與教學展示網站

因此：

- 不處理 SEO
- 不處理 WCAG 無障礙
- 不處理正式營運規範

核心哲學：

> 像素視覺為表，極速操作為骨。

---

# 1. 專案背景與版本定位

## 1.1 參考風格

| 參考作品 | 取用方向 | 本案轉化方式 |
|---|---|---|
| GOONS DESIGN | 點陣、像素藝術、粗框線、復古遊戲感 | 像素按鈕、像素卡片、像素框線、遊戲式頁面切換 |
| Avocado Language School | 明亮、友善、教育感、活潑插圖 | 教學演示網站的親和感與角色引導 |

---

## 1.2 視覺定位

> 粗像素復古遊戲風 × 友善教育式網站體驗

---

## 1.3 本版本包含

- 視覺風格重塑
- AI 美術素材導入
- UI 元件一致化
- RWD
- Hover / Active / Transition
- Loading / Skeleton
- 效能整理
- Antigravity / Codex 任務拆解
- 驗收清單

---

## 1.4 本版本不包含

- 業務邏輯重寫
- 資料庫變更
- 正式營運部署
- 大型功能新增
- 真實個資展示

---

# 2. AI Agent 絕對開發限制

## 2.1 底層邏輯零干涉

嚴禁修改：

- API Request / Response
- Service / Controller
- 狀態管理
- Router Guard
- Permission Guard
- Database Schema
- 登入驗證
- 權限角色

---

## 2.2 安全限制

禁止：

- 讀取 `.env`
- 輸出 token / password
- 寫入正式環境資訊
- 使用真實個資

---

## 2.3 單一任務原則

每次任務：

- 僅處理單一目標
- 必須輸出修改摘要
- 必須列出影響檔案
- 必須提供測試方式
- 必須說明風險

---

# 3. 視覺設計策略

## 3.1 整體風格

關鍵字：

- chunky pixel art
- retro game UI
- 16-bit pixel style
- pixel border
- arcade menu
- friendly educational illustration
- playful but structured

---

## 3.2 設計原則

| 原則 | 說明 |
|---|---|
| 風格一致 | icon、插圖、按鈕、框線統一 |
| 操作快速 | 動畫短促 |
| 資訊清楚 | 不因風格犧牲可讀性 |
| 保持留白 | 避免畫面擁擠 |
| 色彩受控 | 全站 3-4 色 |
| 手機友善 | 不破版 |

---

## 3.3 圖文分工

| 類型 | 規範 |
|---|---|
| 主標題 | 使用 HTML 文字 |
| CTA | button / link |
| Hero | 僅放插圖 |
| 錯誤訊息 | 使用文字 |

---

# 4. 色彩與版面規範

## 4.1 6:3:1 配色比例

| 比例 | 類型 | 用途 |
|---|---|---|
| 60% | Primary | 背景與框架 |
| 30% | Secondary | 卡片與區塊 |
| 10% | Accent | CTA 與重點 |

---

## 4.2 Design Tokens

```css
:root {

  --color-primary-900: #10213f;
  --color-primary-700: #173b68;

  --color-secondary-500: #45b883;
  --color-secondary-300: #9be7c1;

  --color-accent-500: #ffb238;
  --color-accent-600: #f58a1f;

  --color-bg: #f7f3e8;
  --color-surface: #ffffff;
  --color-text: #1e1e1e;
  --color-border: #1e1e1e;

  --font-heading: "Pixel", "Noto Sans TC", sans-serif;
  --font-body: "Noto Sans TC", sans-serif;

  --border-pixel-thick: 3px solid var(--color-border);

  --shadow-pixel-block: 4px 4px 0px var(--color-border);

  --motion-fast: 120ms;
  --motion-normal: 180ms;
  --motion-slow: 240ms;
}
```

---

# 5. 字體與排版

## 5.1 字體策略

| 使用位置 | 字體 |
|---|---|
| Hero | Pixel + Noto Sans TC |
| 標題 | Pixel / Noto Sans TC |
| 按鈕 | Noto Sans TC Bold |
| 表格 | Noto Sans TC |

---

## 5.2 字級建議

| 類型 | 桌機 | 手機 |
|---|---|---|
| H1 | 40-56px | 32-40px |
| H2 | 28-36px | 24-28px |
| 內文 | 16-18px | 16px |

---

# 6. AI 美術圖規範

## 6.1 素材清單

| 類型 | 用途 |
|---|---|
| Hero | 首頁 |
| Pixel Icon | 功能入口 |
| Empty State | 無資料 |
| Loading | 等候動畫 |
| Error Scene | 錯誤頁 |

---

## 6.2 AI 製圖限制

禁止：

- 放重要文字
- 放真實個資
- 放 Logo
- 混用風格

必須：

- 使用 16-bit pixel art
- 保持高對比
- 支援手機裁切

---

## 6.3 AI Prompt

### Hero Prompt

```text
A 16-bit pixel art website hero illustration, retro game style mixed with friendly educational illustration, Taiwan-inspired digital city, chunky pixel shapes, clean composition, teal and blue palette, orange accent color, no text, no logo.
```

### Empty State Prompt

```text
A friendly 16-bit pixel art character holding a magnifying glass, looking for missing data, retro game UI style, no text, no logo.
```

---

# 7. 資料夾結構

```text
src/
  assets/
    images/
      hero/
      icons/
      empty-states/
      errors/
      backgrounds/

  components/
    ui/
      PixelButton/
      PixelCard/
      PixelBadge/
      PixelModal/
      PixelToast/
      PixelSkeleton/

  styles/
    tokens.css
    pixel.css
    animations.css
```

---

# 8. PixelButton 規格

## Props

```ts
variant: primary | secondary | danger | ghost
size: sm | md | lg
loading: boolean
disabled: boolean
```

---

## CSS

```css
.pixel-button {

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: var(--border-pixel-thick);

  background: var(--color-accent-500);

  padding: 12px 24px;

  box-shadow: var(--shadow-pixel-block);

  transition: transform var(--motion-fast);
}

.pixel-button:hover {
  transform: translate(2px, 2px);
}

.pixel-button:active {
  transform: translate(4px, 4px);
}
```

---

# 9. PixelCard 規格

## 類型

- Static Card
- Interactive Card
- Feature Card
- Data Card

---

## Hover

```css
.pixel-card.is-interactive:hover {

  transform: translate(-2px, -2px);

  box-shadow: 6px 6px 0px var(--color-border);
}
```

---

# 10. PixelModal

```css
.pixel-modal {

  background: var(--color-surface);

  border: var(--border-pixel-thick);

  box-shadow: 8px 8px 0px var(--color-border);

  animation: pixel-modal-in var(--motion-normal);
}
```

---

# 11. PixelSkeleton

```css
@keyframes pixel-pulse {

  0% {
    background-color: #eee9dd;
  }

  50% {
    background-color: #dfdacd;
  }

  100% {
    background-color: #eee9dd;
  }
}
```

---

# 12. Layout 規範

| 區塊 | 規格 |
|---|---|
| Header | 64px |
| Sidebar | 桌機顯示 |
| Main | max-width 1200px |
| Footer | 版本資訊 |

---

# 13. 首頁規範

首屏保留：

1. 主標題
2. 副標
3. CTA
4. 功能入口
5. Hero 插圖

避免：

- 首屏過度擁擠
- Hero 過高
- 多重 CTA

---

# 14. Mobile-first RWD

## 14.1 Breakpoints

| 裝置 | 寬度 |
|---|---|
| 小手機 | 360px |
| 平板 | 768px |
| 筆電 | 1024px |
| 桌機 | 1280px |

---

## 14.2 表格轉卡片

```css
@media (max-width: 768px) {

  table.pixel-table thead {
    display: none;
  }

  table.pixel-table tr {
    display: block;
  }

  table.pixel-table td::before {
    content: attr(data-label);
  }
}
```

---

# 15. Loading 與等待

## Loading 分級

| 情境 | 建議 |
|---|---|
| 按鈕送出 | Button Loading |
| 表格查詢 | Skeleton Table |
| 卡片資料 | Skeleton Card |
| 長時間處理 | Pixel Progress |

---

## 防重複送出

所有：

- 查詢
- 匯出
- 送出

都必須：

- disabled
- loading
- 防止重複 API request

---

# 16. 動畫與轉場

## Duration

| 類型 | 時間 |
|---|---|
| hover | 120ms |
| active | 120ms |
| modal | 180ms |
| page transition | 180-240ms |

---

## Page Transition

```css
.page-enter {

  animation: page-enter var(--motion-slow) ease-out both;
}
```

---

# 17. 效能規範

## 必須

- WebP / SVG
- lazy loading
- Hero 桌機手機分尺寸
- CSS 動畫優先

---

## 禁止

- 超大圖
- GIF 濫用
- 大型動畫套件
- Layout Shift

---

# 18. Antigravity / Codex 總 Prompt

```text
你正在協助一個已完成功能模組的教學演示網站進行 UI/UX 視覺優化。

請在不修改核心業務邏輯、API、資料庫、權限判斷的前提下：

- 優化視覺
- RWD
- Loading
- Skeleton
- Transition
- Pixel UI

嚴禁：

- 修改 Service
- 修改 API
- 修改 Router Guard
- 修改 RBAC
- 讀取 .env
- 輸出 token
- 使用真實個資
```

---

# 19. 分階段開發任務

## Task 1

現況盤點：

- 頁面
- 元件
- CSS
- API
- 圖片
- 風險

---

## Task 2

建立：

```text
src/styles/tokens.css
```

---

## Task 3

建立：

- PixelButton
- PixelCard
- PixelBadge
- PixelModal
- PixelToast
- PixelSkeleton

---

## Task 4

首頁與 Layout：

- Hero
- Header
- CTA
- Pixel UI

---

## Task 5

功能入口卡片：

- 3 欄桌機
- 2 欄平板
- 1 欄手機

---

## Task 6

表單頁：

- loading
- 防重複點擊
- sticky action bar

---

## Task 7

表格：

- data-label
- skeleton
- empty state

---

## Task 8

Loading：

- Button Loading
- Skeleton
- Progress Bar

---

## Task 9

微互動：

- hover
- active
- transition

---

## Task 10

圖片與效能：

- WebP
- lazy loading
- 壓縮

---

## Task 11

最終回歸測試。

---

# 20. 驗收清單

## 視覺驗收

- 像素風一致
- 色彩符合 6:3:1
- 首頁清楚
- 圖片一致

---

## RWD 驗收

- 360px 無橫向捲動
- 手機單欄
- 表格轉卡片

---

## Loading 驗收

- Skeleton
- Button Loading
- Empty State

---

## 效能驗收

- lazy loading
- 圖片壓縮
- 無大型動畫套件

---

# 21. 課堂展示前檢查

- 首頁可快速說明
- Hero 清楚
- CTA 可操作
- 手機正常
- Loading 正常
- Console 無 error
- Demo 資料非真實個資

---

# 22. 最終版本定義

網站完成後應具備：

- 強烈 pixel art 識別
- 流暢互動
- 教學展示感
- 手機友善
- 快速感知速度

核心原則：

1. 圖片負責風格。
2. 文字負責操作。
3. 像素風可以強烈，但資訊不能亂。
4. 手機優先。
5. 動畫短促。
6. Loading 明確。
7. AI 協助開發，但需人工驗收。
