# 09 部署檢查表

## 第 4 版定版資訊

定版版本：`0.4.28`
定版日期：2026-05-27
GAS Web App deployment：`@51`
定版文件：`docs/16_v4_final_release.md`

## A. GitHub 檢查

- [ ] `README.md` 已標示第 4 版定版。
- [ ] `CHANGELOG.md` 已新增 `0.4.28-final` 紀錄。
- [ ] `docs/AI_HANDOVER.md` 已放入最近一次修改摘要。
- [ ] `docs/16_v4_final_release.md` 已建立。
- [ ] `docs/01_game_rules.md` 已符合目前遊戲規則。
- [ ] `docs/02_architecture_github_firebase_gas.md` 已標示第 4 版架構。
- [ ] `docs/03_firestore_schema.md` 已標示 Firestore 不啟用。
- [ ] `docs/04_realtime_database_schema.md` 已更新為第 4 版 schema。
- [ ] `data/v4_static_game_config.example.json` 可被 JSON 解析。
- [ ] `app/config/modules.json` 狀態為 `v4_0_4_28_final`。

## B. Firebase Hosting 檢查

- [ ] 學員端可開啟：`https://tychbniis-32af5-student.web.app`
- [ ] 講師手機端可開啟：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
- [ ] 大螢幕投影端可開啟：`https://tychbniis-32af5-instructor.web.app/Display.html`
- [ ] 三個頁面載入的版本為 `0.4.28`。
- [ ] 學員端、講師端、投影端沒有載入舊版快取。

## C. Realtime Database 檢查

- [ ] 已啟用 Realtime Database。
- [ ] `gameState/{gameId}` 可由講師端更新。
- [ ] `publicQuestions/{gameId}` 可由前端讀取。
- [ ] `answers/{gameId}` 可接收學員送出紀錄。
- [ ] `itemUses/{gameId}` 可接收道具使用紀錄。
- [ ] `publicScoreboards/{gameId}` 可由 GAS 寫入排行榜快照。
- [ ] `finalSettlement/{gameId}` 可由 GAS 寫入結算結果。
- [ ] Firebase rules 未暴露帳密、Token 或敏感資料。

## D. Google Sheets / GAS 檢查

- [ ] Google Sheets 試算表存在。
- [ ] 題庫工作表存在且題目、選項、答案、解析完整。
- [ ] 戰隊設定工作表存在。
- [ ] 道具與寶箱設定已符合第 4 版機率。
- [ ] GAS Script Properties 已設定 `SPREADSHEET_ID`。
- [ ] GAS Script Properties 已設定 `ADMIN_API_SECRET`。
- [ ] GAS Script Properties 已設定 `FIREBASE_DATABASE_URL`。
- [ ] 若 GAS 需要服務帳戶，憑證只放在 Script Properties，不寫入程式碼。
- [ ] Web App deployment 版本為 `@51` 或後續維護版本。

## E. 課前測試

- [ ] 講師執行初始化遊戲。
- [ ] 講師開啟場次。
- [ ] 4 名測試學員登入。
- [ ] 自動分隊人數接近一致。
- [ ] 講師開題後，學員端自動開始倒數。
- [ ] 投影端顯示目前題目與倒數。
- [ ] 學員送出答案後，前端顯示已作答、選項與花費秒數。
- [ ] 講師關題後，學員端顯示正誤提示並可使用道具。
- [ ] 排行榜只在關題後更新快照。
- [ ] 學員端點擊懸浮排行榜才讀取排行榜。
- [ ] 成就、寶箱、道具紀錄不帶到上一場。
- [ ] 結算前 15 秒倒數可顯示。
- [ ] 結算結果可顯示戰隊排名、個人排名、幸運獎、全對獎。

## F. 還原方式

1. GitHub 回到上一個穩定 commit。
2. Firebase Hosting 重新部署上一版靜態檔。
3. GAS Web App 改回上一個已知可用 deployment。
4. Google Sheets 可用備份分頁或副本還原。
5. 若 Realtime Database 狀態異常，先保留匯出檔，再執行初始化遊戲。

## G. 維護原則

1. 第 4 版已定版，後續修改應以 `0.4.29` 或更高維護版本處理。
2. 不直接覆寫 `docs/16_v4_final_release.md` 的定版結論；若有異動，新增維護紀錄。
3. 不重新啟用 Cloud Functions、Cloud Run 或 Firestore 作為必要流程，除非另開新版本規劃。
