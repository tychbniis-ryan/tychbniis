const gameStatus = document.querySelector("#gameStatus");
const questionStatus = document.querySelector("#questionStatus");
const checklist = document.querySelector("#checklist");

const items = [
  "Firebase 專案已建立",
  "Authentication 匿名登入已啟用",
  "Firestore 已建立",
  "Realtime Database 已建立",
  "題庫 Google Sheets 已建立",
  "至少完成一次模擬測試"
];

document.querySelector("#startGame").addEventListener("click", () => {
  gameStatus.textContent = "進行中";
});

document.querySelector("#pauseGame").addEventListener("click", () => {
  gameStatus.textContent = "暫停";
});

document.querySelector("#endGame").addEventListener("click", () => {
  gameStatus.textContent = "已結束";
});

document.querySelector("#openQuestion").addEventListener("click", () => {
  questionStatus.textContent = "示範題已開放。正式版會改由 Cloud Functions 控制題目狀態。";
});

document.querySelector("#closeQuestion").addEventListener("click", () => {
  questionStatus.textContent = "示範題已關閉。";
});

items.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

