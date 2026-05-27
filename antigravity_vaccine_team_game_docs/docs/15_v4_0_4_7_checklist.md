# 第 4 版 0.4.1 到 0.4.7 檢查表

## 文件狀態

本文件保留第 4 版早期開發階段的檢查脈絡。
第 4 版已於 2026-05-27 以 `0.4.28` 定版，定版內容請以 `docs/16_v4_final_release.md` 為準。

## 早期版本目標

1. `0.4.1`：建立學員端與講師端靜態 HTML5 基礎。
2. `0.4.2`：新增第 4 版核心前端狀態與本機資料結構。
3. `0.4.3`：建立前端寶箱、道具與成就預載流程。
4. `0.4.4`：調整第 3 版未完成 BUG，移除創作題與票選流程。
5. `0.4.5`：新增前端去重、localStorage 鎖定與 Firebase 臨時寫入。
6. `0.4.6`：重構 GAS 最小化 API，降低逐列讀寫。
7. `0.4.7`：建立靜態 JSON、Firebase Hosting 與部署檢查流程。

## 已完成項目

1. 學員端改為靜態 HTML5。
2. 講師端拆分為手機控制端 `Instructor.html` 與大螢幕投影端 `Display.html`。
3. 題庫、答案、寶箱、道具、成就規則改為前端一次載入。
4. 學員端以 `gameSeed + playerId + questionId` 預先決定寶箱與內容。
5. 學員端本機計算答題得分、個人積分、成就進度與寶箱結果。
6. GAS 僅負責去重、紀錄、排行榜快照與最終結算。
7. 移除首答加分。
8. 移除創作題與票選流程。
9. 排行榜改為關題後產生快照。
10. 學員端排行榜改為點擊懸浮按鈕才讀取。

## 定版後狀態

| 項目 | 定版值 |
|---|---|
| 前端版本 | `0.4.28` |
| GAS deployment | `@51` |
| 學員端 | `https://tychbniis-32af5-student.web.app` |
| 講師手機端 | `https://tychbniis-32af5-instructor.web.app/Instructor.html` |
| 大螢幕投影端 | `https://tychbniis-32af5-instructor.web.app/Display.html` |
| 定版文件 | `docs/16_v4_final_release.md` |
| 靜態設定範本 | `data/v4_static_game_config.example.json` |

## 後續維護原則

1. 此文件不再作為最新需求清單。
2. 後續修正請新增 `0.4.29` 或更高維護版本紀錄。
3. 若規則改變，需同步更新 `docs/01_game_rules.md`、`docs/16_v4_final_release.md` 的後續維護註記、`CHANGELOG.md` 與 `docs/AI_HANDOVER.md`。
