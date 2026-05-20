const form = document.querySelector("#checkinForm");
const nicknameInput = document.querySelector("#nickname");
const teamSelect = document.querySelector("#teamId");
const playerName = document.querySelector("#playerName");
const playerTeam = document.querySelector("#playerTeam");
const questionText = document.querySelector("#questionText");
const optionList = document.querySelector("#optionList");

const teamNames = {
  team_1: "第 1 隊",
  team_2: "第 2 隊",
  team_3: "第 3 隊",
  team_4: "第 4 隊",
  team_5: "第 5 隊"
};

const demoQuestion = {
  text: "接種疫苗前，下列哪一項最需要先確認？",
  options: ["受種者身分與接種紀錄", "現場椅子數量", "海報顏色", "講師麥克風音量"]
};

function pickTeam() {
  const teams = Object.keys(teamNames);
  return teams[Math.floor(Math.random() * teams.length)];
}

function renderQuestion() {
  questionText.textContent = demoQuestion.text;
  optionList.replaceChildren();

  demoQuestion.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    button.addEventListener("click", () => {
      button.textContent = `${button.textContent}，已送出`;
      [...optionList.querySelectorAll("button")].forEach(item => {
        item.disabled = true;
      });
    });
    optionList.append(button);
  });
}

function restoreCheckin() {
  const saved = JSON.parse(localStorage.getItem("vaccineGamePlayer") || "null");
  if (!saved) return;

  nicknameInput.value = saved.nickname;
  teamSelect.value = saved.teamId;
  playerName.textContent = saved.nickname;
  playerTeam.textContent = teamNames[saved.teamId] || "自動分隊";
  renderQuestion();
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const nickname = nicknameInput.value.trim();
  const teamId = teamSelect.value || pickTeam();
  const player = { nickname, teamId, checkedInAt: new Date().toISOString() };

  localStorage.setItem("vaccineGamePlayer", JSON.stringify(player));
  playerName.textContent = nickname;
  playerTeam.textContent = teamNames[teamId];
  teamSelect.value = teamId;
  renderQuestion();
});

restoreCheckin();

