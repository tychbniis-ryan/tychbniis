# 第 5 版視覺優化紀錄

日期：2026-05-27

版本：`0.5.8`

## 0.5.8 學員體驗、像素圖示與翻身卡修正

1. 依使用者回饋移除報到與等候狀態的自轉方塊，改用 PixelArt Icons 的 SVG 圖示與像素條紋等候效果。
2. 學員答題介面移除不必要圖片，避免題目閱讀區被裝飾圖干擾。
3. 學員端分數列移除「道具加分」欄位，只保留個人積分、戰隊與排行榜，降低答題時的資訊負擔。
4. 成就清單每筆成就加入像素圖示，並優化「領取」、「已領取」、「進行中」、「完成」的按鈕與狀態樣式。
5. 挑戰卡加入 0 到 9 抽號碼動畫，結果畫面分為挑戰成功、挑戰失敗與放棄猜測。
6. 投影端改為像素風格背景、卡片、選項、排行榜與獎項樣式，維持與學員端一致的視覺語言。
7. 排行榜對使用者顯示正式隊名，不顯示 `team_1` 這類內部代碼。
8. 翻身卡邏輯改為只有唯一最後 1 名取得 30 分，其餘情形取得 5 分。
9. 本版新增 `pixelarticons` npm 依賴，靜態 SVG 放在各端 `dist/assets/icons/pixelarticons/`。
10. 功能狀態快照位置：`screenshots/v5_0_5_8/`。
11. GAS 已推送並更新既有 Web App deployment 到 `@52`。
12. Firebase Hosting 已部署完成，線上學員端、講師端與投影端均載入 `0.5.8` 前端資源。

## 0.5.7 第 5 版視覺優化收斂

1. 前端快取參數、`clientVersion`、`package.json` 與 `modules.json` 已收斂到 `0.5.7`。
2. 第 5 版已完成寶箱、道具、答題、等候、講師控制、投影排行、結算、戰隊識別與 RWD 視覺優化。
3. 本版只做文件、版號與回歸檢查，不新增 GAS 或 Firebase rules 變更。
4. 回歸快照位置：`screenshots/v5_0_5_7/`。
5. Firebase Hosting 已部署完成，線上學員端、講師端與投影端均載入 `0.5.7` 前端資源。

## 0.5.6 戰隊識別與 RWD 視覺補強

1. 學員端戰隊選擇按鈕依 `data-team-id` 套用不同 CSS 色票。
2. 戰隊按鈕內的 `.art-slot` 從虛線占位改為像素隊徽圖示。
3. 完成報到後，`gameView` 與 `playerTeam` 會保留 `data-team-id`，方便後續戰隊主題延伸。
4. 分數列補齊「道具加分」欄位，避免 4 欄 CSS 對 3 個欄位造成空間浪費。
5. 功能狀態快照位置：`screenshots/v5_0_5_6/`。

## 0.5.5 投影端排行榜與結算視覺

1. 投影端 `renderTeams()` 與 `renderPlayers()` 會為名次加入 `display-rank-item` 與 `rank-*` class。
2. 冠亞季軍加入不同邊框與背景，讓投影端遠距觀看時更容易辨識。
3. 得獎名單改為 `award-card`，幸運獎與全對獎有不同像素獎牌圖示。
4. 本版只改投影端渲染與 CSS，不修改計分或結算規則。
5. 功能狀態快照位置：`screenshots/v5_0_5_5/`。

## 0.5.4 講師端控制流程視覺

1. 講師端後端設定、啟動場次與題目控制面板加入 `flow-step` 階段樣式。
2. 目前操作階段會套用 `is-flow-active`，已完成階段會套用 `is-flow-complete`。
3. 模式徽章會依 GAS 後端或示範模式切換顏色。
4. 初始化遊戲資料按鈕改為危險操作視覺，與啟動、開題、關題、結算主動作區分。
5. 功能狀態快照位置：`screenshots/v5_0_5_4/`。

## 0.5.3 後台回應等候動畫

1. 學員端報到、同步、寶箱、成就、排行榜、挑戰卡與最終結果等狀態文字，會依文字內容自動套用 `is-loading`。
2. 講師端後端設定、啟動場次、開題、關題、排行榜、電腦學員與結算狀態加入一致的像素轉圈與條紋進度效果。
3. 投影端等待開題、讀取資料與結算階段加入等候動畫。
4. 本版只改前端顯示層，未修改 GAS、Firebase rules 或 API 行為。
5. 功能狀態快照位置：`screenshots/v5_0_5_3/`。

## 0.5.1 寶箱與道具視覺

1. 寶箱卡片加入像素寶箱圖示。
2. 道具卡片加入像素道具卡圖示。
3. 加倍、翻身、挑戰類道具可用不同圖示與背景色區分。
4. 開箱時加入短促搖晃動畫，開箱後淡出移除。
5. 快照位置：`screenshots/v5_0_5_1/`。

## 0.5.2 題目與答題回饋

1. 題目文字與作答視窗提高字級與卡片化。
2. 答案選項加入像素勾選框。
3. 選中與送出答案時會套用 `is-selected`、`is-submitted` 視覺狀態。
4. 答對、答錯、等待判定訊息加入圖示與短轉場。
5. 快照位置：`screenshots/v5_0_5_2/`。

## 1. 本版定位

第 5 版定位為「像素風視覺與教學展示體驗優化版」。

本版只處理前端顯示層，不修改 GAS、Firebase、API、計分規則、題庫資料結構或權限流程。

## 2. 本版修改範圍

1. 新增像素風 Hero 美術圖。
2. 新增等候與空狀態美術圖。
3. 學員端加入 Hero 圖、空狀態圖、像素風按鈕、卡片陰影、短轉場與 disabled 等候動作。
4. 講師端加入 Hero 圖、像素風控制台視覺、按鈕等候動作與短轉場。
5. 投影端加入 Hero 圖、像素風卡片、排行榜與題目區塊視覺強化。
6. 更新前端快取版號為 `0.5.0`。

## 3. 新增素材

```text
frontend/shared/assets/images/hero/v5-vaccine-hero.png
frontend/shared/assets/images/empty-states/v5-loading-empty.png
frontend/student/dist/assets/images/hero/v5-vaccine-hero.png
frontend/student/dist/assets/images/empty-states/v5-loading-empty.png
frontend/instructor/dist/assets/images/hero/v5-vaccine-hero.png
frontend/instructor/dist/assets/images/empty-states/v5-loading-empty.png
```

素材由內建 `image_gen` 工具產生。部署用圖片已複製到學生端與講師端各自的 `dist/assets/images/` 目錄，避免靜態伺服器無法讀取共用資料夾。

## 4. 未修改項目

1. 未修改 `gas/Code.gs`。
2. 未修改 Firebase rules。
3. 未修改 API 行為。
4. 未修改題目、答案、計分、道具與結算邏輯。
5. 未加入大型動畫套件。

## 5. 測試方式

```powershell
npm run check:functions
npm run dev:student
npm run dev:instructor
```

測試重點：

1. 學員端 `http://localhost:5173` 可正常載入。
2. 講師端 `http://localhost:5174` 可正常載入。
3. 投影端 `http://localhost:5174/Display.html` 可正常載入。
4. 360px 寬度無橫向捲動。
5. Console 無新錯誤。
6. 按鈕 disabled 時有明確等候動作。

## 6. 快照

快照位置：

```text
screenshots/v5_visual_review/
```

包含：

1. `student-360.png`
2. `student-desktop.png`
3. `instructor-desktop.png`
4. `display-desktop.png`

## 7. 還原方式

可使用以下備份還原前端顯示層：

```text
backup/v5_visual_20260527/
```

若使用 Git 還原，回復本版 commit 即可移除第 5 版視覺修改與新增素材。
