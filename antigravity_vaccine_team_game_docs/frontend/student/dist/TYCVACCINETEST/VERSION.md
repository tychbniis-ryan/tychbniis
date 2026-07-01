# TYC_VaccineTest 單機版版本紀錄

- 專案代號：`TYC_VaccineTest`
- 正式網址路徑：`/TYCVACCINETEST/`
- 單機版版本：`0.1.1`
- 快取識別：`0.1.1-answerfix-20260701-1`
- 版本來源：`frontend/student/dist/TYCVACCINETEST/config.js` 的 `soloVersion`
- 客戶端識別：`TYC_VaccineTest-0.1.1`
- 題庫來源：`soloQuestions/TYC_VaccineTest/v0_1_0`

## 維護規則

- 單機版版本獨立管理，不跟主專案 `package.json` 版本連動。
- 單機版檔案只放在 `frontend/student/dist/TYCVACCINETEST/`。
- 正式入口維持 `/TYCVACCINETEST/`，不使用 `/solo/`。
- 本次 `0.1.1` 是 UI 與手機操作流程修正，題庫路徑仍沿用 `v0_1_0`。
- 若只修快取，可只更新 `index.html` 內 `styles.css`、`config.js`、`app.js` 的 `v=` 參數，不必更動 `soloVersion`。
