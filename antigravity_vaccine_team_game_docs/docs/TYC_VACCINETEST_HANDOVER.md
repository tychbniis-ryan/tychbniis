# TYC_VaccineTest 單機版交接文件

## 版本

- 主專案版本：`0.7.44`
- 單機版版本：`0.1.0`
- 單機版資料夾：`frontend/student/dist/TYCVACCINETEST/`

## 網址

- 本機規劃網址：`http://localhost:5173/TYCVACCINETEST/`
- 本次測試網址：`http://127.0.0.1:5183/TYCVACCINETEST/?localQuestions=1`
- Firebase Hosting 預計網址：`https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`

## 資料流

1. 題庫正式來源：
   `soloQuestions/TYC_VaccineTest/v0_1_0`
2. 題庫內容：
   只保留「疫苗教育訓練題庫」與「兒少虐待與疏忽測驗題」。
3. 成績與排行榜：
   由 GAS 處理 `submitSoloResult` 與 `getSoloLeaderboard`。
4. GAS 新增工作表：
   `TYC單機成績`、`TYC單機場次`、`TYC單機作答明細`。
5. 同一 `playerId` 多次遊玩：
   排行榜只保留最佳成績；暱稱改變時更新顯示名稱。

## 前端規則

1. 首頁有 2 個區塊：`進入遊戲`、`查看排行`。
2. 每題倒數從 60 秒開始。
3. 答題後、下一題前才能使用道具。
4. 保留道具：
   `+1`、`+3`、`+5`、`+10` 加分卡、加倍卡、挑戰卡、空寶箱。
5. 不保留：
   講師控制、戰隊排行、翻身卡、幸運箱、追加寶箱、落後寶箱。
6. 每次開始測驗會重置本局道具與成就，避免重玩累積道具影響最佳成績公平性。
7. 結算頁提供全部題目結果與 `只看錯題`。

## 維運指令

```powershell
npm run build:tycvaccinetest:questions
npm run check:tycvaccinetest:questions
npm run test:tycvaccinetest:smoke -- http://127.0.0.1:5183/TYCVACCINETEST/?localQuestions=1
```

## 測試結果

- `node --check frontend\student\dist\TYCVACCINETEST\app.js`：通過。
- `node --check scripts\build-tycvaccinetest-question-seed.mjs`：通過。
- `node --check scripts\tycvaccinetest-smoke-test.mjs`：通過。
- JSON 檢查：通過。
- 題庫種子檢查：60 題，通過。
- GAS `Code.gs` 基本 JavaScript parse：通過。
- Playwright smoke test：通過，完成 60 題全流程與全對結算。

## 注意事項

1. 正式使用前，需把 `firebase/tycvaccinetest.soloQuestions.v0_1_0.json` 上傳到 Firebase 指定路徑。
2. 正式使用前，需部署 Firebase Database Rules。
3. 正式排行榜功能需部署 GAS `Code.gs`。
4. 本次 `5173` 連接埠已有其他程序占用，因此測試改用 `5183`。
5. 不得把 GAS Secret、Firebase 私鑰、Cookie 或個資寫進 `config.js`。

## 還原方式

1. 使用 `backup/tycvaccinetest_solo_0_1_0_20260630_172543/` 中的檔案覆蓋回原檔。
2. 刪除 `frontend/student/dist/TYCVACCINETEST/`。
3. 刪除 `scripts/build-tycvaccinetest-question-seed.mjs`。
4. 刪除 `scripts/tycvaccinetest-smoke-test.mjs`。
5. 刪除 `firebase/tycvaccinetest.soloQuestions.v0_1_0.json`。
6. 若已部署 Firebase 或 GAS，需重新部署還原後版本。
