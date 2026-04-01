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

function showScreen(screen) {
  [titleScreen, quizScreen, resultScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function formatTime(hour, minute) {
  return `${hour}時${minute}分`;
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function toTotalMinutes(hour, minute) {
  return hour * 60 + minute;
}

function fromTotalMinutes(total) {
  const normalized = ((total % 720) + 720) % 720; // 0～719
  let hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  if (hour === 0) hour = 12;
  return { hour, minute };
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function generateQuestion() {
  let startHour = getRandomInt(1, 12);
  let startMinute = getRandomInt(0, 11) * 5;

  // 正解は5分刻み、10分～180分の範囲にする
  let correctDuration = getRandomInt(2, 36) * 5;

  // 右の時計
  const startTotal = toTotalMinutes(startHour % 12, startMinute);
  const endTotal = startTotal + correctDuration;
  const endTime = fromTotalMinutes(endTotal);

  // 選択肢3つを作る
  // 一番小さい～一番大きいの差が1時間以内になるようにする
  let choicesSet = new Set([correctDuration]);

  while (choicesSet.size < 3) {
    const diff = getRandomInt(-6, 6) * 5; // 最大±30分
    const candidate = correctDuration + diff;

    if (
      candidate >= 5 &&
      candidate <= 240 &&
      candidate % 5 === 0
    ) {
      choicesSet.add(candidate);
    }
  }

  let choices = Array.from(choicesSet).sort((a, b) => a - b);

  // 最大差が60分を超えたら作り直し
  if (choices[2] - choices[0] > 60) {
    return generateQuestion();
  }

  return {
    startHour,
    startMinute,
    endHour: endTime.hour,
    endMinute: endTime.minute,
    correctDuration,
    choices
  };
}

function drawClock(canvas, hour, minute) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const r = w / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(r, r);

  // 外枠
  ctx.beginPath();
  ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#333";
  ctx.stroke();

  // 目盛り
  for (let i = 0; i < 60; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 30) * i);
    ctx.beginPath();
    ctx.moveTo(0, -(r - 18));
    ctx.lineTo(0, -(i % 5 === 0 ? r - 34 : r - 24));
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
    ctx.strokeStyle = "#444";
    ctx.stroke();
    ctx.restore();
  }

  // 数字
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let num = 1; num <= 12; num++) {
    const angle = (Math.PI / 6) * (num - 3);
    const x = Math.cos(angle) * (r - 48);
    const y = Math.sin(angle) * (r - 48);
    ctx.fillText(String(num), x, y);
  }

  // 分針
  const minuteAngle = (Math.PI / 30) * minute - Math.PI / 2;
  ctx.save();
  ctx.rotate(minuteAngle);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -(r - 30));
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#1d4e89";
  ctx.stroke();
  ctx.restore();

  // 時針
  const hourValue = (hour % 12) + minute / 60;
  const hourAngle = (Math.PI / 6) * hourValue - Math.PI / 2;
  ctx.save();
  ctx.rotate(hourAngle);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(0, -(r - 52));
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff6b6b";
  ctx.stroke();
  ctx.restore();

  // 中心
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#333";
  ctx.fill();

  ctx.restore();
}

function renderQuestion() {
  currentQuestion = generateQuestion();

  drawClock(leftCanvas, currentQuestion.startHour, currentQuestion.startMinute);
  drawClock(rightCanvas, currentQuestion.endHour, currentQuestion.endMinute);

  timeLeftText.textContent = formatTime(currentQuestion.startHour, currentQuestion.startMinute);
  timeRightText.textContent = formatTime(currentQuestion.endHour, currentQuestion.endMinute);

  choicesEl.innerHTML = "";

  currentQuestion.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = formatDuration(choice);
    btn.addEventListener("click", () => judgeAnswer(choice));
    choicesEl.appendChild(btn);
  });
}

function judgeAnswer(selectedDuration) {
  const isCorrect = selectedDuration === currentQuestion.correctDuration;

  resultMarkEl.textContent = isCorrect ? "正解" : "不正解";
  resultMarkEl.className = "result-mark " + (isCorrect ? "correct" : "wrong");

  resultMessageEl.textContent =
    `${currentQuestion.startHour}時${currentQuestion.startMinute}分から` +
    `${currentQuestion.endHour}時${currentQuestion.endMinute}分なので` +
    `経過時間は${formatDuration(currentQuestion.correctDuration)}でした！`;

  showScreen(resultScreen);
}

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