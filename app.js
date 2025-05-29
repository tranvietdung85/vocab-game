
let wordData = [];
let filteredWords = [];
let currentIndex = 0;
let currentMode = "flashcard";
let knownWords = new Set();

async function loadJSONData() {
    try {
        const response = await fetch("data.json");
        wordData = await response.json();
        populateTopics();
        applyFilters();
        renderFlashcard();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu JSON:", error);
    }
}

function populateTopics() {
    const topicSet = new Set(wordData.map(word => word.topic));
    const topicFilter = document.getElementById("topicFilter");
    topicFilter.innerHTML = '<option value="all">All</option>';
    topicSet.forEach(topic => {
        const option = document.createElement("option");
        option.value = topic;
        option.textContent = topic;
        topicFilter.appendChild(option);
    });
}

function applyFilters() {
    const level = document.getElementById("levelFilter").value;
    const topic = document.getElementById("topicFilter").value;
    filteredWords = wordData.filter(word =>
        (level === "all" || word.level === level) &&
        (topic === "all" || word.topic === topic) &&
        !knownWords.has(word.word)
    );
    currentIndex = 0;
}

function renderFlashcard() {
    if (filteredWords.length === 0) {
        document.getElementById("flashcard-front").textContent = "No words to display.";
        document.getElementById("flashcard-back").textContent = "";
        return;
    }
    const word = filteredWords[currentIndex];
    document.getElementById("flashcard-front").textContent = word.word;
    document.getElementById("flashcard-back").textContent = word.translation;
    speak(word.word);
}

function nextWord() {
    if (currentIndex < filteredWords.length - 1) {
        currentIndex++;
        renderFlashcard();
    }
}

function prevWord() {
    if (currentIndex > 0) {
        currentIndex--;
        renderFlashcard();
    }
}

function flipCard() {
    const front = document.getElementById("flashcard-front");
    const back = document.getElementById("flashcard-back");
    if (front.style.display !== "none") {
        front.style.display = "none";
        back.style.display = "block";
    } else {
        front.style.display = "block";
        back.style.display = "none";
    }
}

function switchMode(mode) {
    currentMode = mode;
    document.getElementById("flashcard-container").classList.toggle("hidden", mode !== "flashcard");
    document.getElementById("quiz-container").classList.toggle("hidden", mode !== "quiz");
    document.getElementById("flashcardModeBtn").classList.toggle("active", mode === "flashcard");
    document.getElementById("quizModeBtn").classList.toggle("active", mode === "quiz");
    if (mode === "flashcard") {
        renderFlashcard();
    } else {
        startQuiz();
    }
}

function markKnown() {
    const word = filteredWords[currentIndex];
    knownWords.add(word.word);
    applyFilters();
    renderFlashcard();
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
}

// Quiz
let quizIndex = 0;
function startQuiz() {
    quizIndex = 0;
    loadNextQuiz();
}

function loadNextQuiz() {
    const questionSet = filteredWords.slice(quizIndex, quizIndex + 5);
    if (questionSet.length === 0) {
        document.getElementById("quiz-question").textContent = "You finished the quiz!";
        document.getElementById("quiz-options").innerHTML = "";
        return;
    }

    const currentWord = questionSet[0];
    document.getElementById("quiz-question").textContent = "What is the translation of: " + currentWord.word;
    const options = shuffle([currentWord.translation, ...questionSet.slice(1).map(w => w.translation)]);
    document.getElementById("quiz-options").innerHTML = "";
    options.forEach(option => {
        const btn = document.createElement("button");
        btn.textContent = option;
        btn.onclick = () => checkAnswer(option, currentWord.translation);
        document.getElementById("quiz-options").appendChild(btn);
    });
}

function checkAnswer(selected, correct) {
    const feedback = document.getElementById("quiz-feedback");
    if (selected === correct) {
        feedback.textContent = "✅ Correct!";
    } else {
        feedback.textContent = "❌ Incorrect. Correct answer: " + correct;
    }
    quizIndex++;
    setTimeout(() => {
        feedback.textContent = "";
        loadNextQuiz();
    }, 1500);
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Event listeners
document.getElementById("nextBtn").onclick = nextWord;
document.getElementById("prevBtn").onclick = prevWord;
document.getElementById("flipBtn").onclick = flipCard;
document.getElementById("markKnownBtn").onclick = markKnown;
document.getElementById("flashcardModeBtn").onclick = () => switchMode("flashcard");
document.getElementById("quizModeBtn").onclick = () => switchMode("quiz");
document.getElementById("levelFilter").onchange = () => {
    applyFilters();
    renderFlashcard();
};
document.getElementById("topicFilter").onchange = () => {
    applyFilters();
    renderFlashcard();
};

loadJSONData();
