# TYC_VaccineTest 單機版

## 入口

- 本機測試：`http://localhost:5173/TYCVACCINETEST/`
- Firebase Hosting：`https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`

## 資料來源

- 題庫正式來源：Firebase Realtime Database `soloQuestions/TYC_VaccineTest/v0_1_0`
- 成績與排行榜：GAS `submitSoloResult`、`getSoloLeaderboard`
- 本機測試可在網址加上 `?localQuestions=1` 使用同資料夾的種子題庫檔。

## 維運注意事項

- 不要把帳密、Token、Cookie 或個資寫進 `config.js`。
- 題庫由維運者上傳 Firebase，不提供學員端匯入題庫功能。
- 同一 `playerId` 多次遊玩時，GAS 排行榜只保留最佳成績；暱稱改變時更新顯示名稱。
