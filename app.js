// Phiên bản đầy đủ: Flashcard + Quiz + Mở khóa cấp độ + Ghi nhớ từ sai

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

// Load dữ liệu từ file data.json
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    wordList = data;
    populateTopics(wordList);
    filterByCriteria();
    loadProgress();
    loadCard(currentIndex);
    updateProgress();
  });


// --- Flashcard + Random + Chủ đề + Type + Level ---
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
  // Nếu đang bật random và có dữ liệu, chọn ngẫu nhiên; không thì chọn từ đầu
  currentIndex = (isRandom && filteredList.length)
    ? Math.floor(Math.random() * filteredList.length)
    : 0;
  loadCard(currentIndex);
  updateProgress();
}

// --- Load & lật flashcard ---
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
  img.src = word.Image || '';
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

// --- Tiến độ, mở khóa cấp độ ---
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
  document.getElementById('progress').textContent = `Tiến độ: ${knownCount} / ${total} từ đã biết`;
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

// --- Lưu / phát âm ---
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
  // Lấy object hiện tại
  const wordObj = filteredList[currentIndex];
  if (wordObj && wordObj.Audio) {
    // Phát file mp3 từ thư mục audio
    const audio = new Audio(`/audio-A1/${wordObj.Audio}`);
    audio.play();
  } else {
    // fallback sang speechSynthesis nếu không có file mp3
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }
}

// --- Quiz logic + từ sai ---
function switchMode(mode) {
  if (mode === 'flashcard') {
    document.getElementById('btnFlashcard').classList.add('active');
    document.getElementById('btnQuiz').classList.remove('active');
    document.getElementById('card-mode').style.display = "block";
    document.getElementById('quiz-container').style.display = "none";
    isRandom = true; // Sửa tại đây để bật ngẫu nhiên mặc định
    loadCard(currentIndex);
    updateProgress();
  } else {
    document.getElementById('btnQuiz').classList.add('active');
    document.getElementById('btnFlashcard').classList.remove('active');
    document.getElementById('card-mode').style.display = "none";
    document.getElementById('quiz-container').style.display = "block";
    startQuiz();
  }
}
function startQuiz() {
  const count = parseInt(document.getElementById("quizCount").value) || 5;
  quizList = shuffle([...filteredList]).slice(0, count);
  quizCurrent = 0;
  quizScore = 0;
  renderQuiz();
}
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
function getRandomWrongAnswers(correct, count) {
  const pool = filteredList.filter(item => item.Vietnamese !== correct).map(item => item.Vietnamese);
  return shuffle(pool).slice(0, count);
}

function renderQuiz() {
  if (!quizList.length) {
    document.getElementById('quiz-container').innerHTML = "<h3>Không có từ nào để luyện Quiz!</h3>";
    return;
  }
  if (quizCurrent >= quizList.length) {
    document.getElementById('quiz-container').innerHTML = `
      <h2>🎉 Hoàn thành Quiz!</h2>
      <p>Kết quả: ${quizScore} / ${quizList.length}</p>
      <button onclick="switchMode('flashcard')">Quay lại Flashcard</button>
    `;
    return;
  }
  const q = quizList[quizCurrent];
  const correct = q.Vietnamese;
  const answers = shuffle([correct, ...getRandomWrongAnswers(correct, 3)]);
  let optionsHTML = "";
  answers.forEach(ans => {
    optionsHTML += `<button class="quiz-option" onclick="checkQuizAnswer('${ans.replace(/'/g,"\'")}', '${correct.replace(/'/g,"\'")}')">${ans}</button>`;
  });
  document.getElementById('quiz-container').innerHTML = `
    <div class="quiz-question">
      Từ: <strong>${q.English}</strong>
      <span class="ipa">${q.IPA || ''}</span>
      <button onclick='speakFromObj(quizList[${quizCurrent}])'>🔊</button>
    </div>
    <div class="quiz-options">${optionsHTML}</div>
    <div class="score">Điểm: ${quizScore} / ${quizList.length}</div>
  `;
}
function checkQuizAnswer(selected, correct) {
  const buttons = document.querySelectorAll('.quiz-option');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add("correct");
    if (btn.textContent === selected && selected !== correct) btn.classList.add("wrong");
  });

  if (selected === correct) {
    quizScore++;
    playEffect("correct"); // 🔊 thêm dòng này
    showFeedback("🎉 Chính xác!", "green");
  } else {
    playEffect("wrong");   // 🔊 thêm dòng này
    showFeedback("❌ Sai rồi!", "red");
    const q = quizList[quizCurrent];
    let wrongList = JSON.parse(localStorage.getItem("wrongWords") || "[]");
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
  renderQuiz();
}
function clearWrongWords() {
  localStorage.removeItem("wrongWords");
  alert("Đã xóa danh sách từ sai.");
}

// --- Ngôn ngữ giao diện ---
function switchLanguage(l) {
  lang = l;
  const elements = document.querySelectorAll('[data-lang]');
  elements.forEach(el => {
    const key = el.getAttribute('data-lang');
    if (lang === 'vi') {
      if (key === 'title') el.textContent = "Học Từ Vựng";
      if (key === 'next') el.textContent = "Từ tiếp theo";
      if (key === 'known') el.textContent = "Đã biết";
      if (key === 'reset') el.textContent = "Reset tiến độ";
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
