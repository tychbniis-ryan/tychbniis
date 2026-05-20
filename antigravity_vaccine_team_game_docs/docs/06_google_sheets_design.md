# 06 Google Sheets 題庫與報表設計

## 使用原則

題庫由使用者在 Google Sheets 設計，系統不得預先寫死題目內容。GAS 負責讀取 Google Sheets，驗證欄位後同步至 Firebase。

## 建議 Sheet

| Sheet 名稱 | 用途 |
|---|---|
| 場次設定 | 活動名稱、日期、戰隊名稱、規則 |
| 題庫 | 使用者設計題目 |
| 戰隊設定 | 5 個戰隊名稱、顏色、口號 |
| 作答紀錄 | GAS 匯出 |
| 戰隊成績 | GAS 匯出 |
| 個人成績 | GAS 匯出 |
| 道具紀錄 | GAS 匯出 |
| 得獎名單 | GAS 匯出 |

## 題庫欄位

題庫內容保留空白，請使用者自行設計。

| 欄位 | 說明 | 必填 |
|---|---|---|
| questionId | 題目 ID，例如 q001 | 是 |
| order | 題目順序 | 是 |
| type | single, multiple, trueFalse, ordering, scenario, creative | 是 |
| section | 課程單元 | 否 |
| title | 題目文字 | 是 |
| optionA | 選項 A | 視題型 |
| optionB | 選項 B | 視題型 |
| optionC | 選項 C | 視題型 |
| optionD | 選項 D | 視題型 |
| optionE | 選項 E | 否 |
| correctAnswer | 正確答案，例如 A 或 A,C 或 A>B>C | 非 creative 必填 |
| explanation | 解析 | 建議填寫 |
| timeLimitSec | 作答秒數 | 是 |
| scoreMode | timeBucket 或 fixed | 是 |
| isBossQuestion | TRUE/FALSE | 否 |
| isCreativeVote | TRUE/FALSE | 否 |
| enabled | TRUE/FALSE | 是 |
| note | 備註 | 否 |

## GAS 同步規則

1. 只同步 enabled = TRUE 的題目。
2. 題目同步時分成：
   - publicQuestions：題目與選項，不含正確答案。
   - answerKeys：正確答案與解析。
3. 若題型不是 creative，必須有 correctAnswer。
4. 題目 ID 不可重複。
5. order 不可重複。
6. timeLimitSec 若空白，預設 60 秒。
