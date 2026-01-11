const state = {
  playerName: "",
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  settings: {
    amount: 10,
    difficulty: "easy",
    category: "",
    time: 10,
  },
  timer: null,
  timeLeft: 10,
  answered: false,
}

const screens = {
  home: document.getElementById("home-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen"),
}

const elements = {
  playerNameInput: document.getElementById("player-name"),
  startBtn: document.getElementById("start-btn"),
  amountSelect: document.getElementById("amount-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  categorySelect: document.getElementById("category-select"),
  timeSelect: document.getElementById("time-select"),
  questionCounter: document.getElementById("question-counter"),
  scoreDisplay: document.getElementById("score-display"),
  timer: document.getElementById("timer"),
  progressFill: document.getElementById("progress-fill"),
  questionText: document.getElementById("question-text"),
  optionsContainer: document.getElementById("options-container"),
  nextBtn: document.getElementById("next-btn"),
  resultIcon: document.getElementById("result-icon"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  finalScore: document.getElementById("final-score"),
  resultStats: document.getElementById("result-stats"),
  homeBtn: document.getElementById("home-btn"),
  loading: document.getElementById("loading"),
  leaderboardList: document.getElementById("leaderboard-list"),
}

function init() {
  loadLeaderboard()
  fetchCategories()

  elements.startBtn.addEventListener("click", handleStart)
  elements.nextBtn.addEventListener("click", handleNext)
  elements.homeBtn.addEventListener("click", handleGoHome)

  elements.playerNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleStart()
  })
}

async function fetchCategories() {
  try {
    const response = await fetch("https://opentdb.com/api_category.php")
    const data = await response.json()

    data.trivia_categories.map((cat) => {
      const option = document.createElement("option")
      option.value = cat.id
      option.textContent = cat.name
      elements.categorySelect.appendChild(option)
    })
  } catch (error) {
    console.error("Kategoriyalarni yuklashda xatolik:", error)
  }
}

function handleStart() {
  const name = elements.playerNameInput.value.trim()
  if (!name) {
    elements.playerNameInput.focus()
    elements.playerNameInput.style.borderColor = "var(--danger)"
    setTimeout(() => {
      elements.playerNameInput.style.borderColor = ""
    }, 2000)
    return
  }

  state.playerName = name
  state.settings.amount = Number.parseInt(elements.amountSelect.value)
  state.settings.difficulty = elements.difficultySelect.value
  state.settings.category = elements.categorySelect.value
  state.settings.time = Number.parseInt(elements.timeSelect.value)

  fetchQuestions()
}

async function fetchQuestions() {
  showLoading(true)

  let url = `https://opentdb.com/api.php?amount=${state.settings.amount}&difficulty=${state.settings.difficulty}&type=multiple`

  if (state.settings.category) {
    url += `&category=${state.settings.category}`
  }

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      state.questions = data.results
      state.currentIndex = 0
      state.score = 0
      state.correctCount = 0

      showScreen("quiz")
      displayQuestion()
    } else {
      alert("Savollar topilmadi. Iltimos, boshqa sozlamalarni tanlang.")
    }
  } catch (error) {
    console.error("Savollarni yuklashda xatolik:", error)
    alert("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
  } finally {
    showLoading(false)
  }
}

function displayQuestion() {
  const question = state.questions[state.currentIndex]
  state.answered = false
  state.timeLeft = state.settings.time

  elements.questionCounter.textContent = state.currentIndex + 1 + " / " + state.questions.length
  elements.scoreDisplay.textContent = "Ball: " + state.score
  elements.progressFill.style.width = (state.currentIndex / state.questions.length) * 100 + "%"
  elements.questionText.innerHTML = decodeHTML(question.question)
  elements.nextBtn.classList.add("hidden")

  const answers = [...question.incorrect_answers, question.correct_answer]
  shuffleArray(answers)

  const letters = ["A", "B", "C", "D"]
  elements.optionsContainer.innerHTML = answers
    .map(
      (answer, i) =>
        '<button class="option-btn" data-answer="' +
        escapeHTML(answer) +
        '">' +
        '<span class="option-letter">' +
        letters[i] +
        "</span>" +
        '<span class="option-text">' +
        decodeHTML(answer) +
        "</span>" +
        '<span class="option-icon correct-icon">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
        "</svg>" +
        "</span>" +
        '<span class="option-icon wrong-icon">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="3">' +
        '<path d="M18 6 6 18"></path>' +
        '<path d="m6 6 12 12"></path>' +
        "</svg>" +
        "</span>" +
        "</button>",
    )
    .join("")

  Array.from(document.querySelectorAll(".option-btn")).map((btn) => {
    btn.addEventListener("click", () => {
      handleAnswer(btn)
    })
  })

  startTimer()
}

function startTimer() {
  updateTimerDisplay()

  state.timer = setInterval(() => {
    state.timeLeft--
    updateTimerDisplay()

    if (state.timeLeft <= 0) {
      clearInterval(state.timer)
      handleTimeUp()
    }
  }, 1000)
}

function updateTimerDisplay() {
  elements.timer.textContent = state.timeLeft
  const timerContainer = document.querySelector(".timer-container")

  if (state.timeLeft <= 3) {
    timerContainer.classList.add("warning")
  } else {
    timerContainer.classList.remove("warning")
  }
}

function handleTimeUp() {
  if (state.answered) return

  state.answered = true
  showCorrectAnswer()
  elements.nextBtn.classList.remove("hidden")
}

function handleAnswer(btn) {
  if (state.answered) return

  clearInterval(state.timer)
  state.answered = true

  const selectedAnswer = btn.dataset.answer
  const correctAnswer = state.questions[state.currentIndex].correct_answer

  Array.from(document.querySelectorAll(".option-btn")).map((b) => {
    b.classList.add("disabled")
  })

  if (selectedAnswer === correctAnswer) {
    btn.classList.add("correct")
    const points = getPoints()
    state.score += points
    state.correctCount++
    elements.scoreDisplay.textContent = "Ball: " + state.score
  } else {
    btn.classList.add("wrong")
    showCorrectAnswer()
  }

  elements.nextBtn.classList.remove("hidden")
}

function showCorrectAnswer() {
  const correctAnswer = state.questions[state.currentIndex].correct_answer

  Array.from(document.querySelectorAll(".option-btn")).map((btn) => {
    btn.classList.add("disabled")
    if (btn.dataset.answer === correctAnswer) {
      btn.classList.add("correct")
    }
  })
}

function getPoints() {
  switch (state.settings.difficulty) {
    case "easy":
      return 0.5
    case "medium":
      return 1
    case "hard":
      return 1.5
    default:
      return 0.5
  }
}

function handleNext() {
  state.currentIndex++

  if (state.currentIndex < state.questions.length) {
    displayQuestion()
  } else {
    showResults()
  }
}

function showResults() {
  elements.progressFill.style.width = "100%"

  const maxScore = state.questions.length * getPoints()
  const percentage = (state.score / maxScore) * 100

  let iconClass, iconSVG, title, message

  if (percentage >= 80) {
    iconClass = "excellent"
    iconSVG =
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>'
    title = "Ajoyib!"
    message = `${state.playerName}, siz haqiqiy bilimdonmissiz! Davom eting!`
  } else if (percentage >= 60) {
    iconClass = "good"
    iconSVG =
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>'
    title = "Yaxshi!"
    message = `${state.playerName}, yaxshi natija! Biroz ko'proq mashq qilsangiz, mukammal bo'lasiz!`
  } else if (percentage >= 40) {
    iconClass = "average"
    iconSVG =
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8"></path><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="9" r="1"></circle></svg>'
    title = "Yomon emas!"
    message = `${state.playerName}, davom eting! Mashq bilan natijangiz yaxshilanadi!`
  } else {
    iconClass = "poor"
    iconSVG =
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
    title = "Ko'proq o'qing!"
    message = `${state.playerName}, xavotir olmang! Bilimlaringizni oshirib, qayta urinib ko'ring!`
  }

  elements.resultIcon.className = `result-icon ${iconClass}`
  elements.resultIcon.innerHTML = iconSVG
  elements.resultTitle.textContent = title
  elements.resultMessage.textContent = message
  elements.finalScore.textContent = state.score

  elements.resultStats.innerHTML = `
        <span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            To'g'ri: ${state.correctCount}
        </span>
        <span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg>
            Noto'g'ri: ${state.questions.length - state.correctCount}
        </span>
    `

  saveToLeaderboard()
  showScreen("result")
}

function saveToLeaderboard() {
  let leaderboard = JSON.parse(localStorage.getItem("quizLeaderboard") || "[]")

  leaderboard.push({
    name: state.playerName,
    score: state.score,
    date: new Date().toISOString(),
  })

  leaderboard.sort((a, b) => b.score - a.score)
  leaderboard = leaderboard.slice(0, 3)

  localStorage.setItem("quizLeaderboard", JSON.stringify(leaderboard))
}

function loadLeaderboard() {
  const leaderboard = JSON.parse(localStorage.getItem("quizLeaderboard") || "[]")

  if (leaderboard.length === 0) {
    elements.leaderboardList.innerHTML = "<p class=\"leaderboard-empty\">Hali natijalar yo'q. Birinchi bo'ling!</p>"
    return
  }

  elements.leaderboardList.innerHTML = leaderboard
    .map(
      (entry, i) =>
        '<div class="leaderboard-item">' +
        '<span class="rank">' +
        (i + 1) +
        "</span>" +
        '<span class="name">' +
        escapeHTML(entry.name) +
        "</span>" +
        '<span class="score">' +
        entry.score +
        "</span>" +
        "</div>",
    )
    .join("")
}

function handleGoHome() {
  loadLeaderboard()
  showScreen("home")
}

function showScreen(screenName) {
  Object.values(screens).map((screen) => {
    screen.classList.add("hidden")
  })
  screens[screenName].classList.remove("hidden")
}

function showLoading(show) {
  elements.loading.classList.toggle("hidden", !show)
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function decodeHTML(html) {
  const txt = document.createElement("textarea")
  txt.innerHTML = html
  return txt.value
}

function escapeHTML(str) {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

init()


