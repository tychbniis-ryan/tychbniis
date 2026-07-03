# public.json 規格

本文件定義民眾端 Firebase 查詢網站讀取的公開資料格式。

民眾端只可讀取 `public/public.json`，不得直接讀取 Google Sheet。

## 根層欄位

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `title` | string | 是 | 網站標題 |
| `updatedAt` | string | 是 | JSON 產生或資料更新時間 |
| `notice` | string | 是 | 民眾端提醒文字 |
| `isOpen` | boolean | 是 | 是否開放查詢 |
| `defaultView` | string | 否 | 預設查詢模式：`today`、`tomorrow`、`week`、`all` |
| `data` | array | 是 | 公開接種站資料 |

## data 每筆欄位

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `id` | string | 是 | 公開資料 ID，例如 `SITE-20260702-0001` |
| `district` | string | 是 | 行政區 |
| `village` | string | 是 | 里別，可用頓號分隔多里別 |
| `date` | string | 是 | 西元日期，格式 `YYYY-MM-DD` |
| `rocDate` | string | 是 | 民國日期顯示用 |
| `weekday` | string | 否 | 星期 |
| `time` | string | 是 | 顯示用時間，例如 `08:00-12:00` |
| `rawTime` | string | 否 | 原始時間，例如 `0800-1200` |
| `startTime` | string | 否 | 開始時間，格式 `HH:mm` |
| `endTime` | string | 否 | 結束時間，格式 `HH:mm` |
| `siteName` | string | 是 | 接種地點 |
| `address` | string | 是 | 地址 |
| `hospitalName` | string | 是 | 服務院所 |
| `target` | string | 是 | 服務對象 |
| `fluBrand` | string | 否 | 流感疫苗廠牌 |
| `covidBrand` | string | 否 | 新冠疫苗廠牌 |
| `note` | string | 否 | 備註 |
| `lat` | number | 否 | 緯度 |
| `lng` | number | 否 | 經度 |
| `mapUrl` | string | 否 | Google Maps 連結 |
| `queueUrl` | string | 否 | 叫號或現場資訊連結 |
| `queueLabel` | string | 否 | 叫號按鈕文字 |
| `queueUpdatedAt` | string | 否 | 叫號資訊更新時間 |
| `tags` | array | 否 | 顯示標籤 |

`queueUrl` 必須是 `http://` 或 `https://` 開頭的完整外部網址。空白代表不顯示叫號按鈕；無效網址不得輸出到公開 JSON，也不得在民眾端顯示為可點擊按鈕。

## 不得輸出的欄位

`public.json` 不得包含：

1. 醫療院所十碼代碼。
2. 預估人數。
3. 接種人數。
4. 接種率。
5. 填報單位。
6. 填報人。
7. 填報人 Email。
8. 資料狀態。
9. 是否公開。
10. 宣導品配送資訊。
11. 內部異動紀錄。

本機檢查：

```powershell
node scripts/local-check.mjs
```

此指令會檢查 `public/public.json` 的根層欄位與 `data` 欄位是否符合白名單，並阻擋上述內部欄位出現在公開 JSON。

## 篩選條件

GAS 產生 `public.json` 時只能輸出：

```text
是否公開 = 是
資料狀態 = 已發布
```

已下架、取消、草稿、未公開資料不得輸出。
