# 02 GitHub、Firebase、GAS 架構

## 第 4 版定版架構

定版版本：`0.4.28`
定版日期：2026-05-27
定版文件：`docs/16_v4_final_release.md`

第 4 版採用「靜態網頁優先、GAS 最小化、Realtime Database 做狀態同步」架構。
目標是讓課堂小遊戲能在免費額度內穩定執行，並降低每次作答、開寶箱、領成就時的後端呼叫。

## 架構總覽

```text
GitHub
  ├─ 文件與版本紀錄
  ├─ 靜態前端原始碼
  ├─ GAS 原始碼
  └─ 靜態設定範本

Firebase Hosting
  ├─ 學員端：Student.html / app.js
  ├─ 講師手機端：Instructor.html
  └─ 大螢幕投影端：Display.html

Firebase Realtime Database
  ├─ gameState：目前場次與題目狀態
  ├─ publicQuestions：前端可讀題庫與答案
  ├─ answers：學員作答臨時紀錄
  ├─ itemUses：道具使用臨時紀錄
  ├─ publicScoreboards：關題後排行榜快照
  └─ finalSettlement：最終結算結果

Google Apps Script
  ├─ 初始化場次
  ├─ 同步題庫與設定
  ├─ 接收與去重答案
  ├─ 接收與去重道具使用
  ├─ 產生排行榜快照
  ├─ 結算幸運獎與全對獎
  └─ 輸出賽後報表

Google Sheets
  ├─ 題庫
  ├─ 戰隊設定
  ├─ 作答紀錄
  ├─ 道具紀錄
  ├─ 成就與獎項紀錄
  └─ 賽後報表
```

## 各元件責任

### GitHub

1. 保存可回復版本。
2. 保存文件、規則、部署檢查表與交接文件。
3. 保存靜態設定範本 `data/v4_static_game_config.example.json`。

### Firebase Hosting

1. 提供靜態 HTML5 網頁。
2. 不執行後端計算。
3. 學員端、講師手機端、大螢幕投影端分離，避免單一頁面過度複雜。

### Realtime Database

1. 提供目前題目與場次狀態。
2. 提供排行榜快照。
3. 暫存作答與道具使用紀錄。
4. 不存放帳密、Token、Cookie 或敏感個資。

### Google Apps Script

GAS 只處理需要後端可信紀錄或多人彙整的工作：

1. 開局載入或產生場次必要資料。
2. 接收作答結果。
3. 使用 `gameId + playerId + questionId` 去重。
4. 接收道具使用結果。
5. 產生排行榜快照。
6. 結算幸運獎。
7. 紀錄個人全對獎。
8. 輸出賽後報表。

### Google Sheets

1. 作為正式資料來源。
2. 作為賽後稽核與人工檢查位置。
3. 保留課堂結束後可下載、可備份的成績資料。

## 第 4 版資料流

### 1. 開局

```text
講師輸入密碼
  → GAS 初始化場次
  → GAS 載入題庫、機率表、戰隊設定
  → 寫入 Realtime Database
  → 學員端登入後一次載入必要資料
```

### 2. 開題

```text
講師按下開放題目
  → GAS 更新 gameState
  → 學員端讀取狀態後自動倒數
  → 投影端顯示題目、選項與倒數
```

### 3. 作答

```text
學員端本機判斷答案
  → 本機計算答題得分、花費秒數、個人道具加分、成就進度
  → 寫入 localStorage 防止重送
  → 用 clientSubmitId 送出答案
  → GAS 去重並寫入正式紀錄
```

### 4. 關題

```text
講師按下關題
  → 投影端與學員端先顯示答案與解析
  → GAS 背景彙整作答與道具
  → 產生排行榜快照
```

### 5. 道具與成就

```text
前端即時顯示道具效果與成就提示
  → 一般加分卡與挑戰卡前端立即套用
  → 加倍卡、翻身卡保留後端確認
  → 後端失敗時標示待同步，不讓玩家重複點擊
```

### 6. 最終結算

```text
講師按下結算
  → 投影端顯示 15 秒最後道具倒數
  → 20 秒後 GAS 執行正式結算
  → 寫入 finalSettlement
  → 投影端、講師端、學員端顯示結算結果
```

## 不啟用項目

第 4 版定版流程不依賴以下服務：

1. Cloud Functions。
2. Cloud Run。
3. Firestore。
4. Firebase Authentication 強制登入。
5. 創作題。
6. 票選功能。
7. 首答加分。

## 維護注意事項

1. 後續修改以維護版本處理，例如 `0.4.29`。
2. 不應將即時計分重新搬回 GAS。
3. 不應讓學員端自動輪詢排行榜。
4. 若需新增後端服務，必須先更新架構文件與部署檢查表。
5. 若發現前端與 GAS 分數不一致，優先檢查「前端計分規則」、「送出 payload」、「GAS 彙整公式」三處是否一致。
