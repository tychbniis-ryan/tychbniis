from pathlib import Path

from version import VERSION


PROJECT_ROOT = Path(__file__).resolve().parents[3]

REQUIRED_FILES = [
    "index.html",
    "assets/css/style.css",
    "assets/js/main.js",
    "README.md",
    "CHANGELOG.md",
    "docs/AI_HANDOVER.md",
    "docs/GITHUB_PAGES_SETUP.md",
    "app/config/modules.json",
    "app/modules/website/README.md",
    "app/modules/website/version.py",
]


def run() -> None:
    missing_files = [
        file_path
        for file_path in REQUIRED_FILES
        if not (PROJECT_ROOT / file_path).is_file()
    ]

    if missing_files:
        print("Status：檢查失敗")
        print("Root Cause：必要檔案不存在")
        print("Suggested Fix：請確認以下檔案是否被刪除或移動")
        for file_path in missing_files:
            print(f"- {file_path}")
        raise SystemExit(1)

    print(f"網站專案檢查完成，版本：{VERSION}")


if __name__ == "__main__":
    run()
