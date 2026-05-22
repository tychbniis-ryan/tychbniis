# GAS 說明

Google Apps Script 用於連接 Google Sheets 與前端。第 1 版因 Firebase 免費方案不能部署 Cloud Functions，GAS 改為主要後端判斷層。

## GAS 功能

1. 從 Google Sheets 讀取題庫。
2. 驗證題庫欄位。
3. 提供 GAS Web App API。
4. 處理學員報到與自動分隊。
5. 將公開題庫預載到 Firebase Realtime Database，不同步正確答案。
6. 處理講師開題與關題。
7. 處理學員作答，防止同一人同一題重複作答。
8. 記錄學員翻開試卷時間，作為作答秒數的計時起點。
9. 問題關閉後依正確答案與作答秒數計算基本分，並給該題第一位答對者 5 分獎勵。
10. 選擇性同步公開 `gameState` 到 Firebase Realtime Database。
11. 第 3 版 `0.3.1` 起，關題計分後依規則發放寶箱，並限制每位學員最多保留 3 個未開啟寶箱。
12. 第 3 版 `0.3.2` 起，可開啟寶箱並寫入道具紀錄；道具效果尚未啟用。
13. 活動結束後從 Google Sheets 匯出：
   - 作答紀錄
   - 戰隊成績
   - 個人成績
   - 得獎名單

## 必要 Script Properties

| Key | 說明 |
|---|---|
| GAME_ID | 預設場次 ID |
| ADMIN_API_SECRET | 講師端管理操作密鑰，不可寫在程式碼中 |
| SPREADSHEET_ID | 獨立 Apps Script 專案必填；Google Sheets 網址 `/d/` 後面的試算表 ID |
| FIREBASE_DATABASE_URL | 選填，Realtime Database URL，用於同步公開 `gameState`；未設定時使用本專案預設 URL |
| FIREBASE_SERVICE_ACCOUNT_EMAIL | 選填，Firebase 服務帳戶 email，用於 GAS 寫入 Realtime Database |
| FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY | 選填，Firebase 服務帳戶 private key，用於 GAS 產生短效 access token，不可寫入程式碼 |

若 Apps Script 是從 Google Sheets 的「擴充功能 → Apps Script」開啟，通常可不填 `SPREADSHEET_ID`。若是從 Apps Script 首頁建立的獨立專案，第 1 版會在第一次初始化時自動建立一份「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並把新試算表 ID 寫入 Script Properties 的 `SPREADSHEET_ID`。

## 目前 Apps Script 專案

```text
scriptId: 1qNXWMJSxywJcdpjwgJqvfleqzGm24P9B3i6_vJwLhmF1YMygzWShZcah
Web App URL: https://script.google.com/macros/s/AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC/exec
```

注意：上述 Web App URL 已可公開呼叫。若日後重新部署，請確認 Apps Script 部署設定中「誰可以存取」為「任何人」或「任何知道連結的人」，且部署類型為「網頁應用程式」。

## Web App API

GAS Web App 接收 `POST` JSON：

```json
{
  "action": "joinGame",
  "data": {
    "nickname": "測試學員"
  }
}
```

目前支援 action：

1. `joinGame`
2. `getGameState`
3. `getCurrentQuestion`
4. `openPaper`
5. `submitAnswer`
6. `createGame`
7. `openQuestion`
8. `closeAndScoreQuestion`
9. `getPlayerSummary`
10. `recalculateScoreboard`
11. `getScoreboard`
12. `getPlayerLeaderboard`
13. `getPlayerInventory`
14. `openTreasureBox`

`getCurrentQuestion` 僅回傳題目 ID、題幹、選項、時間限制與題型旗標，不回傳 `correctAnswer` 與 `explanation`。
第 2 版學員端優先使用 Firebase `publicQuestions/{gameId}` 顯示題目，並呼叫 `openPaper` 記錄伺服端翻卷時間。若 Firebase 公開題目暫不可用，才回退呼叫 `getCurrentQuestion`。
學員端呼叫 `openPaper` 或 `getCurrentQuestion` 時會帶 `playerId`，GAS 會在 `試卷開啟紀錄` 記錄伺服端時間。`submitAnswer` 的 `responseSeconds` 使用「送出時間 - 試卷開啟時間」計算，不使用手機本機時間。
第 2 版 0.2.7 起，`submitAnswer` 只記錄作答，不立即回傳正誤與分數。正式分數在講師執行 `closeAndScoreQuestion` 後才寫入，學員端再用 `getPlayerSummary` 更新個人與戰隊積分。
第 2 版 0.2.8 起，學員端可用 `getScoreboard` 查看戰隊排行榜，並用 `getPlayerLeaderboard` 查看個人排行榜。`getPlayerLeaderboard` 只回傳暱稱、戰隊與分數，不回傳帳密、Token 或個資欄位。
第 2 版 0.2.9 起，`openQuestion` 會在場次狀態記錄 `openedQuestionIds`，同一場次中已開放過的題目不可再次開放。正式活動若要重來，請由講師端按「初始化遊戲資料」，系統會清空玩家、作答、翻卷、排行榜與已開放題目紀錄。
第 2 版 0.2.10 起，`joinGame` 會用匿名 `clientKey` 與同場次暱稱去重，同一學員重新報到會回傳原玩家資料。排行榜與個人積分會先合併同一人資料後再計算，避免重複玩家造成平均分下降。學員端預設由系統自動分配戰隊；講師可透過 `setTeamChoiceMode` 控制是否開放自由選隊。
第 2 版 0.2.11 起，自動分隊會依啟用中的戰隊與合併後玩家數分配到目前人數最少的隊伍。學員端報到頁會先讀取自由選隊設定，未開放自由選隊時不顯示戰隊選單並直接採自動分隊。
第 3 版 0.3.1 起，`closeAndScoreQuestion` 會在新計分且答對時發放寶箱。`getPlayerInventory` 可讀取指定玩家自己的寶箱與道具狀態，供後續學員端 UI 使用。
第 3 版 0.3.2 起，`openTreasureBox` 可開啟指定玩家自己的未開啟寶箱，抽到非空結果時會在 `道具紀錄` 建立 `available` 道具。此版本只記錄道具，不套用道具效果。

## 計分規則

1. `baseScore`：答對才有基本分，依 `responseSeconds` 落在 `SCORE_BUCKETS` 的區間計算。
2. `firstCorrectBonus`：每題第一位「提交且答對」的學員加 5 分。
3. `score`：`baseScore + firstCorrectBonus`。
4. 已計分的作答紀錄不會重複計分，避免講師重按關題造成分數重複累加。
5. 學員送出答案後不顯示正誤與分數，避免提前透露答案。講師關題後，系統才回傳分數與排行榜。

## 第 3 版寶箱資料

第 3 版 `0.3.2` 已建立基礎寶箱資料結構、開箱 API 與道具庫讀取。這一步只處理開箱與道具紀錄，尚未實作道具效果與 UI。

### 工作表

| 工作表 | 用途 |
|---|---|
| 寶箱紀錄 | 記錄寶箱來源、狀態、取得時間、開啟時間與失效時間 |
| 道具紀錄 | 預留給後續開箱與道具使用紀錄 |
| 獎項紀錄 | 預留給幸運獎與全對獎 |
| 創作投稿 | 預留給創作票選題投稿 |
| 創作投票 | 預留給隊內初選與匿名全體投票 |
| 規則設定 | 保存寶箱上限、掉落機率、投票秒數與獎項名額 |

### 寶箱紀錄欄位

| 欄位 | 說明 |
|---|---|
| boxId | 寶箱 ID |
| gameId | 場次 ID |
| playerId | 玩家 ID |
| teamId | 戰隊 ID |
| sourceType | 寶箱取得來源 |
| sourceKey | 防止重複發放的唯一鍵 |
| status | `unopened`、`discarded`，後續版本會加入 `opened` 與 `expired` |
| awardedAt | 取得時間 |
| openedAt | 開啟時間，`0.3.1` 尚未使用 |
| expiredAt | 失效或丟棄時間 |
| itemType | 開箱後道具類型 |
| note | 系統備註 |

### 寶箱取得規則

1. 每題答對有 30% 機率取得 1 個寶箱。
2. 累積答對 3 題取得 1 個寶箱。
3. 累積答對 5 題取得 1 個寶箱。
4. 累積答對 10 題取得 2 個寶箱。
5. 連續答對 3 題取得 1 個寶箱。
6. 連續答對 5 題取得 2 個寶箱。
7. 每人最多保留 3 個未開啟寶箱；超過時，最早取得且尚未開啟的寶箱會標記為 `discarded`。

### 注意

1. 寶箱只在 `closeAndScoreQuestion` 對新計分且答對的作答紀錄發放。
2. 同一題重複關題不會重複發寶箱，因已計分的作答紀錄會被略過。
3. `0.3.2` 未改學員端畫面，學員尚不會看到寶箱 UI。
4. `openTreasureBox` 只能開啟自己的 `unopened` 寶箱。
5. 開箱結果為 `empty` 時，不建立道具紀錄。
6. 開箱結果為非空道具時，`道具紀錄.status` 會設為 `available`。
7. `0.3.2` 不套用加分、加倍、翻身、挑戰或幸運獎效果。

### 開箱機率

| 道具 | 機率 |
|---|---:|
| 小加分卡：戰隊 +1 | 25% |
| 中加分卡：戰隊 +3 | 20% |
| 大加分卡：戰隊 +5 | 12% |
| 超級加分卡：戰隊 +10 | 5% |
| 加倍卡 | 10% |
| 翻身卡 | 8% |
| 挑戰卡 | 10% |
| 特殊道具 | 3% |
| 鼓勵語或空寶箱 | 7% |

## Firebase gameState 同步

GAS 仍是第 1 版可信任後端。當 `createGame`、`openQuestion`、`closeAndScoreQuestion` 執行時，系統會嘗試同步公開 `gameState/{gameId}` 到 Firebase Realtime Database。

第 1 版優先使用 Script Properties 內的 Firebase 服務帳戶 email 與 private key 產生短效 access token，寫入 Firebase Realtime Database。若未設定服務帳戶，會退回使用 Apps Script OAuth token，但目前實測會被 Firebase 回覆 `401 Unauthorized request`。Realtime Database rules 只允許部署帳號或本專案服務帳戶寫入，前端只能公開讀取 `gameState`。

第 2 版會在 `createGame` 時同步公開題庫到 Firebase Realtime Database `publicQuestions/{gameId}`。這份資料可讓學員端在一開始就預載題目，講師開題時只需切換 `gameState`。公開題庫不得包含 `correctAnswer` 與 `explanation`。

學員端會讀取 Firebase Realtime Database 的 `gameState/{gameId}` 作為公開提示，例如「講師已開放題目」。這個提示不會自動替學員開題，仍需學員按「翻開試卷」。正式作答與分數仍由 GAS / Google Sheets 處理。

`setupGameSheets` 會建立必要工作表，並在題庫空白時新增 `demo_q001` 預設測試題，讓第 1 版可先完成啟動、開題、報到、作答、關題計分與排行榜流程。`getGameState` 也會先執行初始化，避免新專案第一次呼叫時找不到 `場次狀態` 工作表。

其中管理操作必須帶：

```json
{
  "adminSecret": "Script Properties 內設定的 ADMIN_API_SECRET"
}
```

## 免費方案架構限制

1. 不部署 Cloud Functions。
2. Firebase Hosting 只提供前端靜態頁面。
3. Firebase Firestore / Realtime Database 保留供未來同步或展示使用。
4. 第 1 版主要資料儲存在 Google Sheets。
5. GAS Web App 有執行時間限制，不適合高頻即時遊戲邏輯；本案 200 人、9 至 11 題可先採保守流程。
6. Firebase Hosting 前端預設使用 JSONP 呼叫 GAS Web App，以降低 CORS 阻擋風險。
7. JSONP 會把請求內容放在網址參數中，不可傳送帳密、Token、身分證字號或完整姓名。
8. 學員端不自動輪詢 `getCurrentQuestion`。此設計避免不同裝置自動更新時間不同，影響競賽公平性。

## 第 2 版速度最佳化

第 2 版已先在 GAS 加入短時間快取，降低 Google Sheets 重複讀取：

1. `ensureGameSheetsReady`：以 Script Cache 記錄工作表已初始化狀態，避免每次學員翻卷都重跑欄位檢查。
2. `readQuestionRows`：題庫快取 300 秒，降低每次開題或翻卷讀取整張題庫的時間。
3. `getGameState` / `upsertGameState`：場次狀態快取 300 秒，開題與關題時同步更新快取。
4. `syncQuestionsToFirebase`：把公開題庫同步至 Firebase `publicQuestions/{gameId}`。
5. `openPaper`：讓學員端不需透過 `getCurrentQuestion` 取得題目內容，只記錄翻卷時間。
6. `getFirebaseAccessToken`：快取 Firebase service account access token，避免每次開題或同步題庫都重新向 Google OAuth 取 token。
7. `recordPaperOpen` / `getPaperOpenedAt`：快取同一玩家、同一題的翻卷時間，降低重複翻卷或送出作答時讀取「試卷開啟紀錄」的次數。
8. `findPlayer`：快取玩家資料，降低送出作答時讀取「玩家」工作表的次數。
9. `submitAnswer`：加入重複作答快取，避免同一玩家同一題重複送出時反覆掃描「作答紀錄」。

## 資料初始化

第 2 版新增 `resetGameData` 管理 API，正式活動前可由講師端按「初始化遊戲資料」清除測試資料。

清除範圍：

1. `玩家`
2. `作答紀錄`
3. `試卷開啟紀錄`
4. `排行榜`
5. `場次狀態`
6. `寶箱紀錄`
7. `道具紀錄`
8. `獎項紀錄`
9. `創作投稿`
10. `創作投票`

保留範圍：

1. `題庫`
2. `場次設定`
3. `戰隊設定`
4. `規則設定`

注意：此功能需要 `ADMIN_API_SECRET`。不得在未確認正式活動資料是否需要保留時執行。

## 低 token 工作流

後續功能改善需採以下流程，避免每次接手都讀取整個專案：

1. 先讀 `docs/AI_HANDOVER.md`、`docs/WORK_LOG.md`、`README.md`、`CHANGELOG.md` 與本檔。
2. 使用 `rg` 搜尋功能入口，只讀本次會影響的檔案。
3. 修改前列出影響檔案、測試方式與還原方式。
4. 先在本機做語法、JSON、前端頁面與既有 npm script 檢查。
5. 本機測試通過後，先回報結果，不直接推送雲端。
6. 只有在使用者明確確認後，才執行 `firebase deploy`、`clasp push` 或 `clasp deploy`。

注意：若活動中臨時修改題庫，建議重新啟動場次或等待最多 300 秒快取失效。正式活動題庫應在活動開始前確認完成。

## 注意

正式環境不得將 `ADMIN_API_SECRET`、帳密、Token 或個資寫在程式碼中。

