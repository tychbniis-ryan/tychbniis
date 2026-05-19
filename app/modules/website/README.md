# Website 模組

## 1. 模組用途

此模組負責記錄 `GitHub` 靜態網站專案的版本與基本檢查方式。

## 2. 主要檔案

| 檔案 | 用途 |
| --- | --- |
| `runner.py` | 檢查網站必要檔案 |
| `version.py` | 紀錄模組版本 |
| `README.md` | 模組說明 |

## 3. 執行方式

```powershell
cd d:\GAS\GitHub
py app\modules\website\runner.py
```

## 4. 檢查項目

1. `index.html` 是否存在。
2. `assets/css/style.css` 是否存在。
3. `assets/js/main.js` 是否存在。
4. `docs/AI_HANDOVER.md` 是否存在。
5. `CHANGELOG.md` 是否存在。

## 5. 資安注意事項

此模組不得讀取或輸出帳密、Token、Cookie、憑證或個資。
