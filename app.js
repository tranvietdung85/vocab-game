// ✅ Cập nhật đầy đủ app.js để hỗ trợ UI mới

// --- Khởi tạo biến ---
let wordList = [];
let filteredList = [];
let currentIndex = 0;
let knownWords = new Set();
let isRandom = true;
let lang = 'vi';
let isMuted = false;
let unlockedLevels = JSON.parse(localStorage.getItem("unlockedLevels") || '["A1"]');
let quizList = [], quizCurrent = 0, quizScore = 0;

// --- Load dữ liệu ---
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    wordList = data;
    populateTopics(wordList);
    filterByCriteria();
    loadProgress();
    loadCard(currentIndex);
    updateProgress();
    // Ẩn quizCount, quiz-actions, quiz-result-block ban đầu
    document.getElementById('quizCount').style.display = 'none';
    document.querySelector('.quiz-actions').style.display = 'none';
    document.getElementById('quiz-result-block').style.display = 'none';
  });


function populateTopics(data) {
  const topicSelect = document.getElementById('topicSelect');
  topicSelect.innerHTML = '<option value="">-- Chọn chủ đề --</option>';
  const topics = [...new Set(data.map(word => word.Topic))].sort();
  topics.forEach(topic => {
    const opt = document.createElement("option");
    opt.value = topic;
    opt.textContent = topic;
    topicSelect.appendChild(opt);
  });
}

function filterByCriteria() {
  const topic = document.getElementById('topicSelect').value;
  const level = document.getElementById('levelSelect').value;
  const type = document.getElementById('typeSelect').value;
  filteredList = wordList.filter(w =>
    (!topic || w.Topic === topic) &&
    (!level || w.Level === level) &&
    (!type || w.Type === type)
  );
  currentIndex = (isRandom && filteredList.length)
    ? Math.floor(Math.random() * filteredList.length)
    : 0;
  loadCard(currentIndex);
  updateProgress();
}

function loadCard(idx) {
  if (!filteredList.length) {
    document.getElementById('card-mode').style.display = "none";
    return;
  }
  const word = filteredList[idx];
  document.getElementById('card-mode').style.display = "block";
  document.getElementById('card-word').textContent = word.English || '';
  document.getElementById('card-ipa').textContent = word.IPA || '';
  document.getElementById('card-back').textContent = word.Vietnamese || word.Meaning || '';
  const img = document.getElementById('card-image');
  img.src = word.Image || `/image-A1/${word.English}.jpg`;
  img.style.display = word.Image ? 'block' : 'none';
  document.querySelector('.card').classList.remove('flipped');
  speak(word.English);
}

function nextCard() {
  if (!filteredList.length) return;
  currentIndex = isRandom
    ? Math.floor(Math.random() * filteredList.length)
    : (currentIndex + 1) % filteredList.length;
  loadCard(currentIndex);
}

function flipCard() {
  const card = document.querySelector('.card');
  const flipped = card.classList.contains('flipped');
  card.classList.toggle('flipped');
  if (flipped && filteredList.length) {
    speak(filteredList[currentIndex].English);
  }
}

function markAsKnown() {
  if (!filteredList.length) return;
  const word = filteredList[currentIndex];
  knownWords.add(word.English);
  saveProgress();
  updateProgress();
  nextCard();
}

function updateProgress() {
  const knownCount = filteredList.filter(w => knownWords.has(w.English)).length;
  const total = filteredList.length;
  document.getElementById('progress').textContent = `Từ đã biết: ${knownCount} / ${total} từ`;
  updateLevelUnlocking();
}

function updateLevelUnlocking() {
  const levelCounts = {};
  wordList.forEach(w => {
    if (!levelCounts[w.Level]) levelCounts[w.Level] = { total: 0, known: 0 };
    levelCounts[w.Level].total++;
    if (knownWords.has(w.English)) levelCounts[w.Level].known++;
  });
  const levels = ["A1", "A2", "B1", "B2"];
  levels.forEach((lvl, i) => {
    const stats = levelCounts[lvl];
    if (!stats || unlockedLevels.includes(levels[i + 1])) return;
    const progress = stats.known / stats.total;
    if (progress >= 0.8 && !unlockedLevels.includes(levels[i + 1])) {
      unlockedLevels.push(levels[i + 1]);
      alert(`🎉 Chúc mừng! Bạn đã mở khóa cấp độ ${levels[i + 1]}!`);
    }
  });
  localStorage.setItem("unlockedLevels", JSON.stringify(unlockedLevels));
  renderLevelOptions();
}

function renderLevelOptions() {
  const select = document.getElementById("levelSelect");
  [...select.options].forEach(opt => {
    if (opt.value && !unlockedLevels.includes(opt.value)) {
      opt.disabled = true;
      opt.textContent = `🔒 ${opt.value}`;
    } else if (opt.value) {
      opt.disabled = false;
      opt.textContent = opt.value;
    }
  });
}

function saveProgress() {
  localStorage.setItem("knownWords", JSON.stringify([...knownWords]));
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("knownWords"));
    knownWords = new Set(saved);
  } catch {
    knownWords = new Set();
  }
}

function resetProgress() {
  knownWords.clear();
  saveProgress();
  updateProgress();
}

function speak(word) {
  if (!word || isMuted) return;
  const wordObj = filteredList[currentIndex];
  if (wordObj && wordObj.Audio) {
    const audio = new Audio(`/audio-A1/${wordObj.Audio}`);
    audio.play();
  } else {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }
}

function speakFromObj(wordObj) {
  if (!wordObj || isMuted) return;
  if (wordObj.Audio) {
    const audio = new Audio(`/audio-A1/${wordObj.Audio}`);
    audio.play();
  } else {
    const utter = new SpeechSynthesisUtterance(wordObj.English || '');
    utter.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }
}

// --- Quiz logic ---
function switchMode(mode) {
  const card = document.getElementById('card-mode');
  const quiz = document.getElementById('quiz-container');
  const result = document.getElementById('quiz-result-block');
  const count = document.getElementById('quizCount');
  const reviewBtns = document.querySelector('.quiz-actions');

  document.getElementById('btnFlashcard').classList.toggle('active', mode === 'flashcard');
  document.getElementById('btnQuiz').classList.toggle('active', mode === 'quiz');

  card.style.display = mode === 'flashcard' ? 'block' : 'none';
  quiz.style.display = mode === 'quiz' ? 'block' : 'none';
  result.style.display = 'none';
  count.style.display = mode === 'quiz' ? 'inline-block' : 'none';
  reviewBtns.style.display = mode === 'quiz' ? 'flex' : 'none';

  const filters = ["topicSelect", "levelSelect", "typeSelect"];
  filters.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = mode === 'quiz' ? 'none' : 'inline-block';
  });

  if (mode === 'flashcard') {
    isRandom = true;
    loadCard(currentIndex);
    updateProgress();
  } else {
    startQuiz();
  }
}

function getRandomFromList(arr, count) {
  const copy = [...arr];
  const result = [];
  while (copy.length && result.length < count) {
    const i = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

function startQuiz()  {
  quizMode = true;
  quizScore = 0;
  quizCurrent = 0;
  quizList = [];

  const count = parseInt(document.getElementById("quizCount").value) || 5;

  // Tách wordList thành từ đã biết và chưa biết
  const known = [];
  const unknown = [];
  for (const w of wordList) {
    if (knownWords.has(w.English)) {
      known.push(w);
    } else {
      unknown.push(w);
    }
  }

  // Chọn theo tỷ lệ: 80% chưa biết, 20% đã biết
  const nUnknown = Math.floor(count * 0.8);
  const nKnown = count - nUnknown;

  const selected = [
    ...getRandomFromList(unknown, nUnknown),
    ...getRandomFromList(known, nKnown),
  ];

  quizList = shuffle(selected);

  document.getElementById("quiz-result-block").style.display = "none";
  document.getElementById("quiz-container").style.display = "block";
  document.getElementById("quiz-result").style.display = "none";
  renderQuiz();
}

// Cập nhật showNextWord để giảm tần suất từ đã biết
function showNextWord() {
  const known = [];
  const unknown = [];

  for (const w of wordList) {
    if (knownWords.has(w.English)) {
      known.push(w);
    } else {
      unknown.push(w);
    }
  }

  // Ưu tiên chọn từ chưa biết: 70% cơ hội
  let pickFrom = Math.random() < 0.7 ? unknown : known;
  if (pickFrom.length === 0) pickFrom = wordList;

  const index = Math.floor(Math.random() * pickFrom.length);
  currentWord = pickFrom[index];
  renderCard(currentWord);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
/* BỔ SUNG CHẾ ĐỘ ÔN LẠI (TỪ ĐẾN HẠN) */
function reviewDueWords() {
  quizMode = true;
  quizScore = 0;
  quizCurrent = 0;
  quizList = [];

  const dueWords = wordList.filter(w => isDue(w.English));
  const count = parseInt(document.getElementById("quizCount").value) || 5;

  if (dueWords.length === 0) {
    alert("Không có từ nào cần ôn lại hôm nay.");
    return;
  }

  const selected = getRandomFromList(dueWords, Math.min(count, dueWords.length));
  quizList = shuffle(selected);

  document.getElementById("quiz-container").style.display = "block";
  document.getElementById("quiz-result").style.display = "none";
  renderQuiz();
}

// ===========================
// HỢP NHẤT ÔN TẬP QUAN TRỌNG CÓ ƯU TIÊN
// ===========================
function reviewImportantWords() {
  const resultBlock = document.getElementById("quiz-result-block");
  if (resultBlock) resultBlock.style.display = "none";
  const resultDetails = document.getElementById("quiz-result-details");
  if (resultDetails) resultDetails.innerHTML = "";
  const resultText = document.getElementById("quiz-result");
  if (resultText) resultText.style.display = "none";

  quizMode = true;
  quizScore = 0;
  quizCurrent = 0;
  quizList = [];

  const count = parseInt(document.getElementById("quizCount").value) || 5;
  const wrongList = JSON.parse(localStorage.getItem("wrongWords") || "[]");

  // Từ sai
  const wrongWords = wordList.filter(w => wrongList.includes(w.English));
  // Từ đến hạn
  const dueWords = wordList.filter(w => isDue(w.English));

  // Hợp nhất và loại trùng
  const mergedMap = new Map();
  [...wrongWords, ...dueWords].forEach(w => {
    mergedMap.set(w.English, w);
  });
  const merged = Array.from(mergedMap.values());

  // Ưu tiên: từ sai → đến hạn
  merged.sort((a, b) => {
    const isWrongA = wrongList.includes(a.English) ? 1 : 0;
    const isWrongB = wrongList.includes(b.English) ? 1 : 0;
    return isWrongB - isWrongA;
  });

  if (merged.length === 0) {
    alert("Không có từ nào cần ôn lại.");
    return;
  }

  const selected = getRandomFromList(merged, Math.min(count, merged.length));
  quizList = shuffle(selected);

  document.getElementById("quiz-container").style.display = "block";
  renderQuiz();
}


function getRandomWrongAnswers(correct, count) {
  const pool = filteredList.filter(item => item.Vietnamese !== correct).map(item => item.Vietnamese);
  return shuffle(pool).slice(0, count);
}

function renderQuiz() {
  const quizContainer = document.getElementById('quiz-container');
  const resultBlock = document.getElementById('quiz-result-block');
  const resultText = document.getElementById('quiz-result');
  const resultDetails = document.getElementById('quiz-result-details');

  if (quizCurrent >= quizList.length) {
    quizContainer.innerHTML = '';
    const scoreText = `${quizScore} / ${quizList.length}`;

    if (resultText) {
      resultText.textContent = scoreText;
      resultText.style.display = "block"; 
    }
    const percentage = Math.round((quizScore / quizList.length) * 100);
    const feedback = percentage === 100
      ? "🎉 Tuyệt vời! Bạn đã làm đúng hết!"
      : percentage >= 70
      ? "👍 Khá tốt! Cố gắng thêm chút nữa nhé."
      : "🧐 Hãy ôn thêm những từ chưa chắc.";

    if (resultDetails) {
      resultDetails.innerHTML = `
        <p>${feedback}</p>
      `;
    }

    if (resultBlock) resultBlock.style.display = "block";
    return;
  }

  const q = quizList[quizCurrent];
  const correct = q.Vietnamese;
  const answers = shuffle([correct, ...getRandomWrongAnswers(correct, 3)]);

  let optionsHTML = "";
  answers.forEach(ans => {
    optionsHTML += `<button class="quiz-option quiz-button" onclick="checkQuizAnswer('${ans.replace(/'/g, "\\'")}', '${correct.replace(/'/g, "\\'")}')">${ans}</button>`;
  });

  quizContainer.innerHTML = `
    <div class="quiz-question">
      Tìm nghĩa của từ: <strong>${q.English}</strong>
      <span class="ipa">${q.IPA || ''}</span>
      <button onclick='speakFromObj(quizList[${quizCurrent}])'>🔊</button>
    </div>
    <div class="quiz-options">${optionsHTML}</div>
    <div class="score">Điểm: ${quizScore} / ${quizList.length}</div>
  `;

  applyPastelToOptions();
}



function applyPastelToOptions() {
  const options = document.querySelectorAll(".quiz-option");
  options.forEach(el => {
    const hue = Math.floor(Math.random() * 360);
    el.style.setProperty('--hue', hue);
  });
}

function checkQuizAnswer(selected, correct)  {
  const buttons = document.querySelectorAll('.quiz-option');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add("correct");
    if (btn.textContent === selected && selected !== correct) {
      btn.classList.add("wrong");
      btn.style.color = "#fff";
    }
  });

  const q = quizList[quizCurrent];
  const correctStreakMap = JSON.parse(localStorage.getItem("correctStreakMap") || '{}');
  const wrongList = JSON.parse(localStorage.getItem("wrongWords") || "[]");

  if (selected === correct) {
    quizScore++;
    if (!isMuted) { playEffect("correct"); }
    showFeedback("🎉 Chính xác!", "green");

    // tăng chuỗi đúng liên tiếp
    correctStreakMap[q.English] = (correctStreakMap[q.English] || 0) + 1;

    // nếu đúng ≥ 3 lần liên tiếp => đánh dấu đã biết
    if (correctStreakMap[q.English] >= 3) {
      knownWords.add(q.English);
      saveProgress();
      updateProgress();
    }
    localStorage.setItem("correctStreakMap", JSON.stringify(correctStreakMap));

  } else {
    if (!isMuted) { playEffect("wrong");}
    showFeedback("❌ Sai rồi!", "red");

    // reset chuỗi đúng liên tiếp
    correctStreakMap[q.English] = 0;
    localStorage.setItem("correctStreakMap", JSON.stringify(correctStreakMap));

    if (!wrongList.includes(q.English)) {
      wrongList.push(q.English);
      localStorage.setItem("wrongWords", JSON.stringify(wrongList));
    }
  }

  setTimeout(() => {
    hideFeedback();
    quizCurrent++;
    renderQuiz();
  }, 2500);
}

function showFeedback(text, color) {
  let fb = document.createElement("div");
  fb.id = "feedback";
  fb.textContent = text;
  fb.style.position = "fixed";
  fb.style.top = "95%";
  fb.style.left = "50%";
  fb.style.transform = "translate(-50%, -50%)";
  fb.style.padding = "16px 24px";
  fb.style.fontSize = "24px";
  fb.style.background = color;
  fb.style.color = "#fff";
  fb.style.borderRadius = "12px";
  fb.style.zIndex = 9999;
  fb.style.whiteSpace = "nowrap"; // ✅ ngăn xuống dòng
  document.body.appendChild(fb);
}

function hideFeedback() {
  let fb = document.getElementById("feedback");
  if (fb) fb.remove();
}

function startWrongQuiz() {
  const wrongList = JSON.parse(localStorage.getItem("wrongWords") || "[]");
  const wrongWords = filteredList.filter(w => wrongList.includes(w.English));
  if (!wrongWords.length) {
    alert("Bạn chưa có từ sai nào để ôn lại.");
    return;
  }
  quizList = shuffle([...wrongWords]);
  quizCurrent = 0;
  quizScore = 0;
  document.getElementById('card-mode').style.display = "none";
  document.getElementById('quiz-container').style.display = "block";
  document.getElementById('quiz-result-block').style.display = "none";
  renderQuiz();
}

function clearWrongWords() {
  localStorage.removeItem("wrongWords");
  alert("Đã xóa danh sách từ sai.");
}

function switchLanguage(l) {
  lang = l;
  const elements = document.querySelectorAll('[data-lang]');
  elements.forEach(el => {
    const key = el.getAttribute('data-lang');
    if (lang === 'vi') {
      if (key === 'title') el.textContent = "Học Từ Vựng";
      if (key === 'next') el.textContent = "Từ tiếp theo";
      if (key === 'known') el.textContent = "Từ đã biết";
      if (key === 'reset') el.textContent = "Học lại toàn bộ";
      if (key === 'random') el.textContent = "Hiển thị từ ngẫu nhiên";
    } else {
      if (key === 'title') el.textContent = "Vocabulary Practice";
      if (key === 'next') el.textContent = "Next";
      if (key === 'known') el.textContent = "Known";
      if (key === 'reset') el.textContent = "Reset progress";
      if (key === 'random') el.textContent = "Random order";
    }
  });
}

function playEffect(type) {
  const audio = new Audio(
    type === 'correct' ? 'sound-effects/correct.mp3' : 'sound-effects/wrong.mp3'
  );
  audio.play().catch(e => console.error("Lỗi phát hiệu ứng:", e));
}

function toggleMute() {
  isMuted = document.getElementById('muteToggle').checked;
}

window.onload = () => {
  loadProgress();
  switchLanguage('vi');
  renderLevelOptions();
};

// ===========================
// 🔁 SPACED REPETITION ENGINE
// ===========================

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getNextReviewDate(level) {
  const delays = [1, 3, 7, 15, 30];
  const today = new Date();
  today.setDate(today.getDate() + delays[Math.min(level, delays.length - 1)]);
  return today.toISOString().slice(0, 10);
}

function updateReview(word, isCorrect) {
  const map = JSON.parse(localStorage.getItem("reviewMap") || '{}');
  const today = getToday();
  let record = map[word] || { level: 0 };
  record.level = isCorrect ? record.level + 1 : 0;
  record.nextReview = getNextReviewDate(record.level);
  record.lastReviewed = today;
  map[word] = record;
  localStorage.setItem("reviewMap", JSON.stringify(map));
}

function isDue(word) {
  const map = JSON.parse(localStorage.getItem("reviewMap") || '{}');
  if (!map[word]) return true;
  return map[word].nextReview <= getToday();
}

// ===========================
// 📚 CHẾ ĐỘ QUIZ ĐẾN HẠN
// ===========================
function reviewDueWords() {
  quizMode = true;
  quizScore = 0;
  quizCurrent = 0;
  quizList = [];

  const dueWords = wordList.filter(w => isDue(w.English));
  const count = parseInt(document.getElementById("quizCount").value) || 5;

  if (dueWords.length === 0) {
    alert("Không có từ nào cần ôn lại hôm nay.");
    return;
  }

  const selected = getRandomFromList(dueWords, Math.min(count, dueWords.length));
  quizList = shuffle(selected);

  document.getElementById("quiz-container").style.display = "block";
  document.getElementById("quiz-result").style.display = "none";
  renderQuiz();
}