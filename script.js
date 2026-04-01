const titleScreen = document.getElementById("title-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const startBtn = document.getElementById("start-btn");
const continueBtn = document.getElementById("continue-btn");
const backTitleBtn = document.getElementById("back-title-btn");

const choicesEl = document.getElementById("choices");
const resultMarkEl = document.getElementById("result-mark");
const resultMessageEl = document.getElementById("result-message");

const timeLeftText = document.getElementById("time-left-text");
const timeRightText = document.getElementById("time-right-text");

const leftCanvas = document.getElementById("clock-left");
const rightCanvas = document.getElementById("clock-right");

let currentQuestion = null;

/* =========================
   画面切り替え
========================= */
function showScreen(screen) {
  [titleScreen, quizScreen, resultScreen].forEach(s => {
    s.classList.remove("active");
  });
  screen.classList.add("active");
}

/* =========================
   時間関連
========================= */

// 0～1439分 → 12時間表示の「時」「分」に変換
function totalMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  let hour24 = Math.floor(normalized / 60);
  let minute = normalized % 60;

  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return {
    hour24,
    hour12,
    minute
  };
}

// 12時間表記の時刻文字列
function formatClockTime(timeObj) {
  return `${timeObj.hour12}時${timeObj.minute}分`;
}

// 経過時間の表示
function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* =========================
   問題生成
========================= */
function generateQuestion() {
  // 開始時刻は 1日(24時間)の中からランダム
  // 5分刻み
  const startTotalMinutes = getRandomInt(0, 287) * 5;

  // 正解は 5分刻み、10分～180分
  const correctDuration = getRandomInt(2, 36) * 5;

  // 終了時刻
  const endTotalMinutes = startTotalMinutes + correctDuration;

  // 選択肢作成
  let choicesSet = new Set();
  choicesSet.add(correctDuration);

  while (choicesSet.size < 3) {
    const diff = getRandomInt(-6, 6) * 5; // ±30分以内
    const candidate = correctDuration + diff;

    if (candidate >= 5 && candidate <= 240 && candidate % 5 === 0) {
      choicesSet.add(candidate);
    }
  }

  const choices = Array.from(choicesSet).sort((a, b) => a - b);

  // 最小と最大の差は1時間以内
  if (choices[2] - choices[0] > 60) {
    return generateQuestion();
  }

  const startTime = totalMinutesToTime(startTotalMinutes);
  const endTime = totalMinutesToTime(endTotalMinutes);

  return {
    startTotalMinutes,
    endTotalMinutes,
    startTime,
    endTime,
    correctDuration,
    choices
  };
}

/* =========================
   アナログ時計描画
========================= */
function drawClock(canvas, timeObj) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 10;

  ctx.clearRect(0, 0, w, h);

  // 背景円
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#333333";
  ctx.stroke();

  // 目盛り
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
    const outerX = cx + Math.cos(angle) * (radius - 4);
    const outerY = cy + Math.sin(angle) * (radius - 4);
    const innerLength = i % 5 === 0 ? 16 : 8;
    const innerX = cx + Math.cos(angle) * (radius - 4 - innerLength);
    const innerY = cy + Math.sin(angle) * (radius - 4 - innerLength);

    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.3;
    ctx.strokeStyle = "#444444";
    ctx.stroke();
  }

  // 数字
  ctx.fillStyle = "#222222";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let n = 1; n <= 12; n++) {
    const angle = (Math.PI * 2 * n) / 12 - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius - 28);
    const y = cy + Math.sin(angle) * (radius - 28);
    ctx.fillText(String(n), x, y);
  }

  // 分針
  const minute = timeObj.minute;
  const minuteAngle = (Math.PI * 2 * minute) / 60 - Math.PI / 2;
  const minuteLength = radius - 28;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(minuteAngle) * minuteLength,
    cy + Math.sin(minuteAngle) * minuteLength
  );
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#1d4e89";
  ctx.stroke();

  // 時針
  const hourForClock = timeObj.hour12 % 12;
  const hourAngle =
    (Math.PI * 2 * (hourForClock + minute / 60)) / 12 - Math.PI / 2;
  const hourLength = radius - 48;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(hourAngle) * hourLength,
    cy + Math.sin(hourAngle) * hourLength
  );
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff6b6b";
  ctx.stroke();

  // 中心
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#333333";
  ctx.fill();
}

/* =========================
   問題表示
========================= */
function renderQuestion() {
  currentQuestion = generateQuestion();

  // 時計と文字表示を同じデータから表示
  drawClock(leftCanvas, currentQuestion.startTime);
  drawClock(rightCanvas, currentQuestion.endTime);

  timeLeftText.textContent = formatClockTime(currentQuestion.startTime);
  timeRightText.textContent = formatClockTime(currentQuestion.endTime);

  choicesEl.innerHTML = "";

  currentQuestion.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = formatDuration(choice);
    btn.addEventListener("click", () => judgeAnswer(choice));
    choicesEl.appendChild(btn);
  });
}

/* =========================
   判定
========================= */
function judgeAnswer(selectedDuration) {
  const isCorrect = selectedDuration === currentQuestion.correctDuration;

  resultMarkEl.textContent = isCorrect ? "正解" : "不正解";
  resultMarkEl.className = "result-mark " + (isCorrect ? "correct" : "wrong");

  resultMessageEl.textContent =
    `${formatClockTime(currentQuestion.startTime)}から` +
    `${formatClockTime(currentQuestion.endTime)}なので` +
    `経過時間は${formatDuration(currentQuestion.correctDuration)}でした！`;

  showScreen(resultScreen);
}

/* =========================
   ボタン
========================= */
startBtn.addEventListener("click", () => {
  renderQuestion();
  showScreen(quizScreen);
});

continueBtn.addEventListener("click", () => {
  renderQuestion();
  showScreen(quizScreen);
});

backTitleBtn.addEventListener("click", () => {
  showScreen(titleScreen);
});