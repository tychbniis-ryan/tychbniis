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
13. 第 3 版 `0.3.3` 起，支援加分卡、加倍卡、翻身卡與挑戰卡效果。
14. 第 3 版 `0.3.4` 起，支援幸運獎與全對獎結算。
15. 第 3 版 `0.3.10` 起，排行榜以報到人數計算戰隊平均分，並顯示答對率。
16. 活動結束後從 Google Sheets 匯出：
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
14. `getPlayerAchievements`
15. `openTreasureBox`
16. `useItem`
17. `getTeamBonusLedger`
18. `recalculateV3Scoreboard`
19. `finalizeAwards`
20. `getAwardList`
21. `submitCreativeAnswer`
22. `getTeamCreativePool`
23. `voteTeamCreative`
24. `getTeamCreativeCandidates`
25. `selectCreativeFinalists`
26. `getCreativeFinalists`
27. `voteCreativeFinal`
28. `getCreativeVoteResult`
29. `exportGameReport`

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
第 3 版 0.3.3 起，`useItem` 可使用加分卡、加倍卡、翻身卡與挑戰卡。
第 3 版 0.3.4 起，`finalizeAwards` 可由講師結算幸運獎與全對獎，`getAwardList` 可讀取得獎名單。幸運獎以第一位抽中特殊道具者為得主；全對獎以全部正式題目皆答對者排序，取前 3 名。
第 3 版 0.3.6 起，`submitCreativeAnswer`、`getTeamCreativePool`、`voteTeamCreative` 支援創作題投稿與隊內初選。
第 3 版 0.3.7 起，`getTeamCreativeCandidates`、`selectCreativeFinalists`、`getCreativeFinalists`、`voteCreativeFinal`、`getCreativeVoteResult` 支援講師審核代表作品與匿名全體投票。
第 3 版 0.3.8 起，`exportGameReport` 可由講師建立賽後報表試算表。
第 3 版 0.3.9 起，`getPlayerAchievements` 可供學員端讀取成就狀態；加分卡立即套用，加倍卡與挑戰卡由 GAS 自動套用下一題。
第 3 版 0.3.10 起，`joinGame` 會拒絕尚未啟動的 `draft` 場次；`createGame` 會在啟動時寫入是否開放自由選隊；`setTeamChoiceMode` 只能在 `draft` 狀態變更。

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

### 創作投稿欄位

| 欄位 | 說明 |
|---|---|
| submissionId | 投稿 ID |
| gameId | 場次 ID |
| playerId | 投稿者玩家 ID，僅後端保存 |
| teamId | 投稿者戰隊 |
| content | 創作答案內容 |
| submittedAt | 投稿時間 |
| status | `submitted`、後續版本可加入審核狀態 |
| selectedByInstructor | 是否由講師選為代表作品 |
| finalAlias | 匿名全體投票顯示代號，例如 A 至 E |
| note | 系統備註 |

### 創作投票欄位

| 欄位 | 說明 |
|---|---|
| voteId | 投票 ID |
| gameId | 場次 ID |
| voterPlayerId | 投票者玩家 ID，僅後端保存 |
| voterTeamId | 投票者戰隊 |
| phase | `team_primary` 代表隊內初選 |
| submissionId | 被投票投稿 ID |
| votedAt | 投票時間 |
| note | 系統備註 |

### 道具紀錄欄位

| 欄位 | 說明 |
|---|---|
| itemId | 道具 ID |
| gameId | 場次 ID |
| playerId | 玩家 ID |
| teamId | 戰隊 ID |
| itemType | 道具類型 |
| sourceBoxId | 來源寶箱 ID |
| status | `available`、`armed`、`used` |
| createdAt | 道具取得時間 |
| usedAt | 使用或指定時間 |
| targetQuestionId | 目標題目 ID |
| targetTeamId | 目標戰隊 ID |
| effectScore | 道具產生的加成分數 |
| note | 系統備註 |

### 獎項紀錄欄位

| 欄位 | 說明 |
|---|---|
| awardId | 獎項紀錄 ID |
| gameId | 場次 ID |
| awardType | `lucky` 或 `perfect` |
| playerId | 玩家 ID |
| teamId | 戰隊 ID |
| nickname | 暱稱 |
| rank | 名次 |
| score | 結算分數 |
| completedAt | 完成時間或特殊道具取得時間 |
| sourceItemId | 幸運獎來源道具 ID |
| awardedAt | 結算時間 |
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

## 第 3 版道具效果

第 3 版 `0.3.3` 已支援基本道具效果。道具效果由 GAS 寫入 `道具紀錄`，前端不得自行計算或套用。

### useItem

`useItem` 需帶：

```json
{
  "playerId": "玩家 ID",
  "itemId": "道具 ID",
  "targetQuestionId": "目標題目 ID",
  "targetTeamId": "挑戰卡指定對手戰隊 ID"
}
```

`targetTeamId` 只有挑戰卡需要。加分卡、加倍卡與挑戰卡需要 `targetQuestionId`。翻身卡可帶 `targetQuestionId` 作紀錄。

### 道具狀態

| 狀態 | 說明 |
|---|---|
| available | 已取得，尚未使用 |
| armed | 已指定目標題，等待關題時計算 |
| used | 已套用或已消耗 |

### 已支援效果

| 道具 | 效果 |
|---|---|
| 小加分卡 | 戰隊 +1 |
| 中加分卡 | 戰隊 +3 |
| 大加分卡 | 戰隊 +5 |
| 超級加分卡 | 戰隊 +10 |
| 加倍卡 | 自動套用下一題，答對後個人分數 x2；每人最多 1 次，重複抽到改為大加分卡 |
| 翻身卡 | 使用當下本隊最後一名 +30，否則 +5；每隊最多 2 次 |
| 挑戰卡 | 指定對手戰隊，自動套用下一題；本隊答對率較高 +10，否則 +3 |

### 排行榜欄位

第 3 版排行榜保留第 2 版欄位，並新增：

| 欄位 | 說明 |
|---|---|
| playerCount | 報到人數 |
| effectivePlayerCount | 舊版相容欄位，0.3.10 起不作為顯示與排名依據 |
| closedQuestionCount | 已關閉且納入計算的正式題數 |
| correctAnswerCount | 戰隊答對總題數 |
| correctRate | 戰隊答對率，未作答或關題後才答都視同錯誤 |
| teamBonusScore | 戰隊道具加成 |
| finalScore | 戰隊總得分加上戰隊道具加成 |
| weightedAverageScore | 戰隊平均分加上戰隊道具加成 |

第 3 版 `0.3.10` 起，`averageScore` 使用報到人數計算，公式為：

```text
averageScore = totalScore / playerCount
weightedAverageScore = averageScore + teamBonusScore
correctRate = correctAnswerCount / (playerCount * closedQuestionCount)
```

若某戰隊尚無報到者，平均分、排名分與答對率皆為 0。未作答、逾時未送出、關題後才送出的答案都不會計入答對，因此在答對率中視同錯誤。

### 注意

1. 特殊道具會作為幸運獎判定來源；第一位抽中特殊道具者取得幸運獎。
2. 挑戰卡不扣對方分數。
3. 加倍卡若目標題答錯，會被消耗但不加分。
4. 每位學員只能取得或使用 1 次加倍卡，重複抽到時改為大加分卡。

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

特殊道具規則：

1. 第一位抽中特殊道具者取得幸運獎。
2. 特殊道具出現後，後續開箱不再抽出特殊道具。
3. 若正式題目開放進度達 70% 仍未抽出特殊道具，特殊道具機率由 3% 提高為 10%，空寶箱機率同步降低。

## 第 3 版獎項結算

第 3 版 `0.3.4` 已支援講師端獎項結算 API，尚未修改講師端 UI。

### finalizeAwards

`finalizeAwards` 需帶管理密碼。執行後會重新產生該場次 `lucky` 與 `perfect` 獎項，避免重複結算。

結算規則：

1. 幸運獎：取第一位抽中特殊道具者。
2. 全對獎：全部正式題目皆答對，依完成最後一題的送出時間排序，取前 3 名。
3. 若同一學員重複報到，依第 2 版既有合併玩家邏輯統一計算。

### getAwardList

`getAwardList` 需帶管理密碼，回傳該場次得獎名單。回傳資料包含獎項類型、玩家 ID、暱稱、戰隊、名次、分數、完成時間與頒獎時間。

## 第 3 版賽後報表

第 3 版 `0.3.8` 已支援 `exportGameReport`。此 API 需帶管理密碼，會建立一份新的 Google 試算表作為賽後報表。

匯出內容：

1. 報表摘要。
2. 戰隊排行榜。
3. 個人排行榜。
4. 作答紀錄。
5. 寶箱紀錄。
6. 道具紀錄。
7. 獎項紀錄。
8. 創作投稿。
9. 創作投票。
10. 創作決選結果。

匯出前會重新計算排行榜，並重新結算幸運獎與全對獎。報表不輸出管理密碼、Token、服務帳戶資訊；創作投票報表不輸出 `voterPlayerId`。

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

