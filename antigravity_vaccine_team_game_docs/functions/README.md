# Cloud Functions 開發規格

Cloud Functions 負責所有可信任遊戲邏輯。第 1 版已建立 TypeScript 骨架，先支援場次建立、加入場次、開題、作答與關題流程。

## 本機指令

```powershell
npm install
npm run build
```

## 第 1 版已建立 Functions

- `createGame`
- `joinGame`
- `openQuestion`
- `submitAnswer`
- `closeAndScoreQuestion`

## 第 1 版尚未完成

- 完整計分。
- 寶箱與道具。
- 創作題投稿與票選。
- 得獎名單產生。

## 必做 Functions

| Function | 功能 |
|---|---|
| createGame | 建立場次 |
| joinGame | 學員加入 |
| openQuestion | 講師開題 |
| submitAnswer | 學員作答 |
| closeAndScoreQuestion | 關題並結算 |
| openBox | 開寶箱 |
| useItem | 使用道具 |
| submitCreativeAnswer | 提交創作題 |
| voteSubmission | 投票 |
| finalizeGame | 整場結算 |
| exportGameResults | 匯出資料給 GAS 或前端 |

## 後端必須負責

- 防止重複作答。
- 防止投自己隊。
- 防止前端竄改分數。
- 防止幸運獎超過 1 名。
- 防止全對獎超過 3 名。
- 寶箱超過 3 個時丟棄最早者。
- 正確答案不得下發到學員端。
