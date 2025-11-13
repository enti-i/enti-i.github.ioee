const QUIZ_STORAGE_KEY = 'entiquiz.collection';
const LEGACY_STORAGE_KEYS = ['enti.quiz.collection'];
const CONSENT_KEY = 'entiquiz.consent';

function safeGet(key) {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch (error) {
    console.warn('LocalStorage lesen nicht m&ouml;glich', error);
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch (error) {
    console.warn('LocalStorage schreiben nicht m&ouml;glich', error);
  }
}

let consentState = safeGet(CONSENT_KEY) || 'unknown';

function isStorageAllowed() {
  return consentState === 'accepted';
}

function dispatchConsentChange() {
  document.dispatchEvent(new CustomEvent('consentchange', { detail: consentState }));
}

function updateYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

function updateCookieBanner() {
  document.querySelectorAll('[data-cookie-banner]').forEach((banner) => {
    if (consentState === 'unknown') {
      banner.classList.add('cookie-banner--visible');
    } else {
      banner.classList.remove('cookie-banner--visible');
    }
  });
}

function initCookieBanner() {
  updateCookieBanner();
  document.querySelectorAll('[data-cookie-accept]').forEach((button) => {
    button.addEventListener('click', () => {
      consentState = 'accepted';
      safeSet(CONSENT_KEY, consentState);
      updateCookieBanner();
      dispatchConsentChange();
    });
  });

  document.querySelectorAll('[data-cookie-decline]').forEach((button) => {
    button.addEventListener('click', () => {
      consentState = 'declined';
      safeSet(CONSENT_KEY, consentState);
      updateCookieBanner();
      dispatchConsentChange();
    });
  });
}

function getStoredQuizzes() {
  if (!isStorageAllowed()) {
    return [];
  }

  let raw = safeGet(QUIZ_STORAGE_KEY);
  if (!raw) {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacy = safeGet(legacyKey);
      if (legacy) {
        raw = legacy;
        safeSet(QUIZ_STORAGE_KEY, legacy);
        break;
      }
    }
  }

  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn('Quizdaten konnten nicht gelesen werden', error);
    return [];
  }
}

function saveQuizzes(quizzes) {
  if (!isStorageAllowed()) return false;
  safeSet(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
  return true;
}

function removeQuiz(id) {
  if (!isStorageAllowed()) return;
  const quizzes = getStoredQuizzes().filter((quiz) => quiz.id !== id);
  saveQuizzes(quizzes);
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyQuiz() {
  return {
    id: null,
    title: '',
    description: '',
    questions: [],
    createdAt: null,
  };
}

function initQuizBuilder() {
  const quizForm = document.querySelector('[data-quiz-form]');
  const questionForm = document.querySelector('[data-question-form]');
  const questionList = document.querySelector('[data-question-list]');
  const saveButton = document.querySelector('[data-save-quiz]');
  const resetButton = document.querySelector('[data-reset-current]');
  const savedList = document.querySelector('[data-saved-quizzes]');
  const exportButton = document.querySelector('[data-export-quizzes]');

  if (!quizForm || !questionForm || !questionList || !savedList) return;

  let currentQuiz = createEmptyQuiz();

  function renderQuestionList() {
    questionList.innerHTML = '';
    if (!currentQuiz.questions.length) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'Noch keine Fragen im aktuellen Quiz.';
      questionList.appendChild(empty);
      return;
    }

    currentQuiz.questions.forEach((question, index) => {
      const item = document.createElement('li');
      const meta = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `Frage ${index + 1}: `;
      const text = document.createElement('span');
      text.textContent = question.text;
      const details = document.createElement('small');
      details.className = 'muted';
      details.textContent = `Timer: ${question.timer}s`;
      meta.append(title, text, details);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Entfernen';
      button.addEventListener('click', () => {
        currentQuiz.questions.splice(index, 1);
        renderQuestionList();
        updateSaveState();
      });
      item.append(meta, button);
      questionList.appendChild(item);
    });
  }

  function updateSaveState() {
    if (!saveButton) return;
    const titleFilled = currentQuiz.title.trim().length > 2;
    const hasQuestions = currentQuiz.questions.length > 0;
    saveButton.disabled = !(titleFilled && hasQuestions);
    saveButton.textContent = currentQuiz.id ? 'Quiz aktualisieren' : 'Quiz sichern';
  }

  quizForm.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.name === 'title') {
      currentQuiz.title = target.value;
    }
    if (target.name === 'description') {
      currentQuiz.description = target.value;
    }
    updateSaveState();
  });

  questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(questionForm);
    const text = (data.get('question') || '').toString().trim();
    const timer = Number(data.get('timer')) || 20;
    const answers = Array.from(questionForm.querySelectorAll('input[name="answer"]')).map((input) =>
      input.value.trim()
    );

    if (!text) {
      alert('Bitte gib eine Frage ein.');
      return;
    }

    if (answers.some((answer) => !answer)) {
      alert('Alle Antwortfelder m&uuml;ssen ausgef&uuml;llt sein.');
      return;
    }

    const correctIndex = Number(data.get('correct'));
    currentQuiz.questions.push({
      id: createId(),
      text,
      answers,
      correctIndex,
      timer,
    });

    questionForm.reset();
    const timerInput = questionForm.querySelector('input[name="timer"]');
    if (timerInput) timerInput.value = '20';
    renderQuestionList();
    updateSaveState();
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm('Aktuelles Quiz wirklich verwerfen?')) {
        currentQuiz = createEmptyQuiz();
        quizForm.reset();
        questionForm.reset();
        renderQuestionList();
        updateSaveState();
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      if (!isStorageAllowed()) {
        alert('Bitte erlaube Local Storage im Cookie-Hinweis, um Quizze zu speichern.');
        return;
      }

      if (!currentQuiz.questions.length) {
        alert('F&uuml;ge mindestens eine Frage hinzu.');
        return;
      }

      if (currentQuiz.title.trim().length < 3) {
        alert('Der Quizname ist zu kurz.');
        return;
      }

      const quizzes = getStoredQuizzes();
      const quizToSave = {
        ...currentQuiz,
        id: currentQuiz.id || createId(),
        createdAt: currentQuiz.createdAt || new Date().toISOString(),
      };

      const index = quizzes.findIndex((quiz) => quiz.id === quizToSave.id);
      if (index >= 0) {
        quizzes[index] = quizToSave;
      } else {
        quizzes.push(quizToSave);
      }

      saveQuizzes(quizzes);
      currentQuiz = createEmptyQuiz();
      quizForm.reset();
      questionForm.reset();
      renderQuestionList();
      renderSavedQuizzes();
      updateSaveState();
    });
  }

  function renderSavedQuizzes() {
    savedList.innerHTML = '';
    const quizzes = getStoredQuizzes();

    if (!isStorageAllowed()) {
      const info = document.createElement('li');
      info.className = 'muted';
      info.textContent = 'Aktiviere Cookies/Local Storage, um Quizze dauerhaft zu speichern.';
      savedList.appendChild(info);
      if (exportButton) exportButton.disabled = true;
      return;
    }

    if (!quizzes.length) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'Noch keine Quizze gespeichert.';
      savedList.appendChild(empty);
      if (exportButton) exportButton.disabled = true;
      return;
    }

    if (exportButton) exportButton.disabled = false;

    quizzes
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((quiz) => {
        const item = document.createElement('li');
        item.className = 'saved-item';
        item.dataset.id = quiz.id;

        const meta = document.createElement('div');
        meta.className = 'saved-item__meta';
        const title = document.createElement('h3');
        title.textContent = quiz.title;
        const description = document.createElement('p');
        description.textContent = `${quiz.questions.length} Fragen · ${new Date(quiz.createdAt).toLocaleDateString('de-DE')}`;
        meta.append(title, description);

        const actions = document.createElement('div');
        actions.className = 'saved-item__actions';

        const loadButton = document.createElement('button');
        loadButton.textContent = 'Laden';
        loadButton.dataset.action = 'load';
        const playButton = document.createElement('button');
        playButton.textContent = "Let's Start";
        playButton.dataset.action = 'play';
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'L&ouml;schen';
        deleteButton.dataset.action = 'delete';

        actions.append(loadButton, playButton, deleteButton);
        item.append(meta, actions);
        savedList.appendChild(item);
      });
  }

  savedList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const parent = button.closest('.saved-item');
    if (!parent) return;
    const id = parent.dataset.id;
    const quizzes = getStoredQuizzes();
    const selected = quizzes.find((quiz) => quiz.id === id);

    if (action === 'load' && selected) {
      currentQuiz = JSON.parse(JSON.stringify(selected));
      quizForm.title.value = currentQuiz.title;
      quizForm.description.value = currentQuiz.description || '';
      questionForm.reset();
      renderQuestionList();
      updateSaveState();
      window.scrollTo({ top: quizForm.offsetTop - 30, behavior: 'smooth' });
    }

    if (action === 'play' && selected) {
      window.location.href = `/LetsStart/?quiz=${encodeURIComponent(selected.id)}`;
    }

    if (action === 'delete' && selected) {
      if (confirm(`Quiz "${selected.title}" l&ouml;schen?`)) {
        removeQuiz(selected.id);
        renderSavedQuizzes();
      }
    }
  });

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const quizzes = getStoredQuizzes();
      if (!quizzes.length) return;
      const blob = new Blob([JSON.stringify(quizzes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'entiquiz.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  document.addEventListener('consentchange', renderSavedQuizzes);

  renderQuestionList();
  renderSavedQuizzes();
  updateSaveState();
}

function initHost() {
  const select = document.querySelector('[data-quiz-select]');
  const startButton = document.querySelector('[data-host-start]');
  const questionText = document.querySelector('[data-question-text]');
  const questionDesc = document.querySelector('[data-question-desc]');
  const answerList = document.querySelector('[data-answer-list]');
  const indexEl = document.querySelector('[data-question-index]');
  const totalEl = document.querySelector('[data-question-total]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const timerDisplay = document.querySelector('[data-timer]');
  const timerStart = document.querySelector('[data-timer-start]');
  const timerReset = document.querySelector('[data-timer-reset]');
  const playerForm = document.querySelector('[data-player-form]');
  const scoreList = document.querySelector('[data-score-list]');
  const revealButton = document.querySelector('[data-reveal-answer]');
  const podiumForm = document.querySelector('[data-podium-form]');
  const podiumHistory = document.querySelector('[data-round-history]');
  const podiumSelects = podiumForm ? Array.from(podiumForm.querySelectorAll('[data-podium-select]')) : [];
  const podiumResetButton = podiumForm?.querySelector('[data-reset-podium]');

  if (!select || !startButton || !questionText || !answerList || !indexEl || !totalEl) return;

  const PODIUM_SLOTS = [
    { key: 'first', label: '1. Platz', points: 1000 },
    { key: 'second', label: '2. Platz', points: 700 },
    { key: 'third', label: '3. Platz', points: 500 },
  ];
  const MAX_HISTORY = 6;

  const hostState = {
    quiz: null,
    index: 0,
    timerId: null,
    remaining: 0,
    players: [],
    showAnswers: false,
    roundHistory: [],
  };

  function populateSelect() {
    if (!isStorageAllowed()) {
      select.innerHTML = '<option value="">Bitte Zustimmung f&uuml;r Local Storage geben</option>';
      select.disabled = true;
      startButton.disabled = true;
      return;
    }

    select.disabled = false;
    const quizzes = getStoredQuizzes();
    select.innerHTML = '<option value="">Bitte w&auml;hlen</option>';
    quizzes.forEach((quiz) => {
      const option = document.createElement('option');
      option.value = quiz.id;
      option.textContent = `${quiz.title} (${quiz.questions.length} Fragen)`;
      select.appendChild(option);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const preselect = urlParams.get('quiz');
    if (preselect && quizzes.some((quiz) => quiz.id === preselect)) {
      select.value = preselect;
    }

    syncStartButton();
  }

  function syncStartButton() {
    startButton.disabled = select.disabled || !select.value;
  }

  function clearTimer() {
    if (hostState.timerId) {
      clearInterval(hostState.timerId);
    }
    hostState.timerId = null;
  }

  function updateRevealState() {
    if (revealButton) {
      revealButton.disabled = !hostState.quiz;
      revealButton.textContent = hostState.showAnswers ? 'Antwort verbergen' : 'Antwort anzeigen';
    }

    if (!answerList) return;
    const question = hostState.quiz?.questions?.[hostState.index];
    const items = answerList.querySelectorAll('li');
    items.forEach((item, index) => {
      const isCorrect = Boolean(question && index === question.correctIndex);
      const reveal = hostState.showAnswers && Boolean(question);
      item.classList.toggle('is-revealed', reveal);
      item.classList.toggle('is-correct', reveal && isCorrect);
    });
  }

  function resetReveal() {
    hostState.showAnswers = false;
    updateRevealState();
  }

  function renderQuestion() {
    if (!hostState.quiz) {
      questionText.textContent = 'Bitte w&auml;hle zuerst ein Quiz aus.';
      questionDesc.textContent = '';
      answerList.innerHTML = '';
      indexEl.textContent = '0';
      totalEl.textContent = '0';
      prevButton?.setAttribute('disabled', 'true');
      nextButton?.setAttribute('disabled', 'true');
      timerStart?.setAttribute('disabled', 'true');
      timerReset?.setAttribute('disabled', 'true');
      resetReveal();
      return;
    }

    const { questions, title } = hostState.quiz;
    const total = questions.length;
    const currentQuestion = questions[hostState.index];
    if (!currentQuestion) return;

    questionText.textContent = currentQuestion.text;
    questionDesc.textContent = `${title} · Timer-Limit: ${currentQuestion.timer}s`;
    indexEl.textContent = String(hostState.index + 1);
    totalEl.textContent = String(total);

    answerList.innerHTML = '';
    currentQuestion.answers.forEach((answer, index) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = answer;
      const meta = document.createElement('small');
      meta.textContent = index === currentQuestion.correctIndex ? '✅ richtig' : 'Option';
      item.append(label, meta);
      answerList.appendChild(item);
    });

    prevButton?.toggleAttribute('disabled', hostState.index === 0);
    nextButton?.toggleAttribute('disabled', hostState.index === total - 1);

    timerStart?.removeAttribute('disabled');
    timerReset?.removeAttribute('disabled');
    clearTimer();
    hostState.remaining = currentQuestion.timer;
    timerDisplay.textContent = `${hostState.remaining}s`;
    resetReveal();
    updateRevealState();
  }

  function startSession() {
    if (!isStorageAllowed()) {
      alert('Bitte erlaube Local Storage im Cookie-Hinweis.');
      return;
    }

    const quizzes = getStoredQuizzes();
    const selected = quizzes.find((quiz) => quiz.id === select.value);
    if (!selected) {
      alert('W&auml;hle ein Quiz aus.');
      return;
    }

    hostState.quiz = selected;
    hostState.index = 0;
    hostState.roundHistory = [];
    resetPodiumForm();
    renderQuestion();
    renderRoundHistory();
  }

  function startTimer() {
    if (!hostState.quiz) return;
    clearTimer();
    hostState.timerId = setInterval(() => {
      hostState.remaining -= 1;
      if (hostState.remaining <= 0) {
        hostState.remaining = 0;
        clearTimer();
      }
      timerDisplay.textContent = `${hostState.remaining}s`;
    }, 1000);
  }

  function resetTimer() {
    clearTimer();
    if (!hostState.quiz) return;
    const question = hostState.quiz.questions[hostState.index];
    hostState.remaining = question.timer;
    timerDisplay.textContent = `${hostState.remaining}s`;
  }

  function renderPlayers() {
    if (!scoreList) return;
    scoreList.innerHTML = '';
    if (!hostState.players.length) {
      const info = document.createElement('li');
      info.className = 'muted';
      info.textContent = 'Noch keine Spieler:innen.';
      scoreList.appendChild(info);
      populatePodiumSelects();
      return;
    }

    hostState.players
      .slice()
      .sort((a, b) => b.score - a.score)
      .forEach((player) => {
        const item = document.createElement('li');
        const meta = document.createElement('div');
        const name = document.createElement('p');
        name.className = 'scoreboard__name';
        name.textContent = player.name;
        const score = document.createElement('small');
        score.className = 'muted';
        score.textContent = `${player.score} Punkte`;
        meta.append(name, score);

        const actions = document.createElement('div');
        actions.className = 'scoreboard__actions';
        const input = document.createElement('input');
        input.type = 'number';
        input.placeholder = '+100';
        input.value = '50';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '+';
        button.dataset.id = player.id;
        button.addEventListener('click', () => {
          const delta = Number(input.value) || 0;
          player.score += delta;
          renderPlayers();
        });
        actions.append(input, button);
        item.append(meta, actions);
        scoreList.appendChild(item);
      });

    populatePodiumSelects();
  }

  function populatePodiumSelects() {
    if (!podiumForm) return;
    const hasPlayers = hostState.players.length > 0;
    podiumSelects.forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">---</option>';
      hostState.players.forEach((player) => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        select.appendChild(option);
      });

      if (hasPlayers && hostState.players.some((player) => player.id === currentValue)) {
        select.value = currentValue;
      } else {
        select.value = '';
      }
      select.disabled = !hasPlayers;
    });

    const awardButton = podiumForm.querySelector('[data-award-round]');
    const resetButton = podiumForm.querySelector('[data-reset-podium]');
    if (awardButton) awardButton.disabled = !hasPlayers;
    if (resetButton) resetButton.disabled = !hasPlayers;
  }

  function resetPodiumForm() {
    if (!podiumForm) return;
    podiumForm.reset();
    populatePodiumSelects();
  }

  function truncate(text, limit = 80) {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}…`;
  }

  function renderRoundHistory() {
    if (!podiumHistory) return;
    podiumHistory.innerHTML = '';
    if (!hostState.roundHistory.length) {
      const info = document.createElement('li');
      info.className = 'muted';
      info.textContent = 'Noch keine abgeschlossenen Runden.';
      podiumHistory.appendChild(info);
      return;
    }

    hostState.roundHistory.forEach((entry) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = entry.questionLabel;
      const snippet = document.createElement('p');
      snippet.textContent = entry.questionSnippet;
      const winners = document.createElement('p');
      winners.className = 'round-history__winners';
      winners.textContent = entry.winners.map((winner) => `${winner.label}: ${winner.name} (+${winner.points})`).join(' · ');
      item.append(title, snippet, winners);
      podiumHistory.appendChild(item);
    });
  }

  function recordRound(winners) {
    const question = hostState.quiz?.questions?.[hostState.index];
    const questionLabel = question ? `Frage ${hostState.index + 1}` : 'Freie Punkte';
    const questionSnippet = question ? truncate(question.text) : 'Manuelle Punktevergabe';
    hostState.roundHistory.unshift({ questionLabel, questionSnippet, winners });
    if (hostState.roundHistory.length > MAX_HISTORY) {
      hostState.roundHistory.pop();
    }
    renderRoundHistory();
  }

  function handleAwardRound(event) {
    event.preventDefault();
    if (!podiumForm) return;
    if (!hostState.quiz) {
      alert('Starte zuerst eine Session, um Antworten auszuwerten.');
      return;
    }
    if (!hostState.players.length) {
      alert('F&uuml;ge zuerst Spieler:innen hinzu.');
      return;
    }

    const data = new FormData(podiumForm);
    const used = new Set();
    const awarded = [];
    for (const slot of PODIUM_SLOTS) {
      const raw = data.get(slot.key);
      const playerId = raw ? raw.toString() : '';
      if (!playerId) continue;
      if (used.has(playerId)) {
        alert('Jedes Team darf nur eine Platzierung pro Runde erhalten.');
        return;
      }
      const player = hostState.players.find((entry) => entry.id === playerId);
      if (!player) continue;
      used.add(playerId);
      player.score += slot.points;
      awarded.push({ label: slot.label, name: player.name, points: slot.points });
    }

    if (!awarded.length) {
      alert('W&auml;hle mindestens eine Platzierung aus.');
      return;
    }

    renderPlayers();
    recordRound(awarded);
    resetPodiumForm();
  }

  if (playerForm) {
    playerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(playerForm);
      const name = (data.get('player') || '').toString().trim();
      if (!name) return;
      hostState.players.push({ id: createId(), name, score: 0 });
      playerForm.reset();
      renderPlayers();
    });
  }

  select.addEventListener('change', () => {
    if (hostState.quiz && hostState.quiz.id !== select.value) {
      hostState.quiz = null;
      hostState.roundHistory = [];
      renderQuestion();
      renderRoundHistory();
      resetPodiumForm();
    }
    syncStartButton();
  });

  startButton.addEventListener('click', startSession);
  prevButton?.addEventListener('click', () => {
    if (!hostState.quiz || hostState.index === 0) return;
    hostState.index -= 1;
    renderQuestion();
  });
  nextButton?.addEventListener('click', () => {
    if (!hostState.quiz) return;
    const lastIndex = hostState.quiz.questions.length - 1;
    if (hostState.index >= lastIndex) return;
    hostState.index += 1;
    renderQuestion();
  });
  timerStart?.addEventListener('click', startTimer);
  timerReset?.addEventListener('click', resetTimer);
  revealButton?.addEventListener('click', () => {
    if (!hostState.quiz) return;
    hostState.showAnswers = !hostState.showAnswers;
    updateRevealState();
  });
  podiumForm?.addEventListener('submit', handleAwardRound);
  podiumResetButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetPodiumForm();
  });

  document.addEventListener('consentchange', populateSelect);

  populateSelect();
  syncStartButton();
  renderQuestion();
  renderPlayers();
  renderRoundHistory();
  updateRevealState();
}

function init() {
  updateYear();
  initCookieBanner();
  const page = document.body.dataset.page;
  if (page === 'quiz') {
    initQuizBuilder();
  }
  if (page === 'host') {
    initHost();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
