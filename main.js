const U = window.EntiUtils || {};
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
  const savedStats = document.querySelector('[data-quiz-stats]');
  const savedSearchInput = document.querySelector('[data-saved-search]');
  const savedSortButtons = document.querySelectorAll('[data-saved-sort]');
  const importButton = document.querySelector('[data-import-quizzes]');
  const importInput = document.querySelector('[data-import-input]');

  if (!quizForm || !questionForm || !questionList || !savedList) return;

  let currentQuiz = createEmptyQuiz();
  const savedFilters = { query: '', sort: 'date' };
  const handleSavedSearch = U.debounce
    ? U.debounce((value) => {
        savedFilters.query = value;
        renderSavedQuizzes();
      }, 180)
    : (value) => {
        savedFilters.query = value;
        renderSavedQuizzes();
      };

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
      currentQuiz.title = U.sanitizeWhitespace ? U.sanitizeWhitespace(target.value) : target.value;
    }
    if (target.name === 'description') {
      currentQuiz.description = U.sanitizeWhitespace ? U.sanitizeWhitespace(target.value) : target.value;
    }
    updateSaveState();
  });

  questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(questionForm);
    const rawQuestion = (data.get('question') || '').toString();
    const text = U.sanitizeWhitespace ? U.sanitizeWhitespace(rawQuestion) : rawQuestion.trim();
    const timer = Number(data.get('timer')) || 20;
    const answers = Array.from(questionForm.querySelectorAll('input[name="answer"]')).map((input) =>
      U.sanitizeWhitespace ? U.sanitizeWhitespace(input.value) : input.value.trim()
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

  function matchesSavedQuery(quiz) {
    if (!savedFilters.query) return true;
    if (U.quizContainsTerm) {
      return U.quizContainsTerm(quiz, savedFilters.query);
    }
    const normalized = savedFilters.query.toLowerCase();
    const haystack = [quiz.title, quiz.description, ...quiz.questions.map((question) => question.text)]
      .map((value) => (value || '').toLowerCase())
      .join(' ');
    return haystack.includes(normalized);
  }

  function sortSavedQuizzes(quizzes) {
    const copy = quizzes.slice();
    if (savedFilters.sort === 'title') {
      copy.sort((a, b) =>
        U.compareStrings ? U.compareStrings(a.title, b.title) : a.title.localeCompare(b.title, 'de-DE')
      );
      return copy;
    }
    if (savedFilters.sort === 'questions') {
      copy.sort((a, b) => b.questions.length - a.questions.length);
      return copy;
    }
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }

  function applySavedFilters(quizzes) {
    const filtered = quizzes.filter(matchesSavedQuery);
    return sortSavedQuizzes(filtered);
  }

  function renderHighlightedText(element, text, term) {
    const safeValue = text || '';
    element.textContent = '';
    if (!term) {
      element.textContent = safeValue;
      return;
    }
    const matcher = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'gi');
    let lastIndex = 0;
    let match;
    while ((match = matcher.exec(safeValue)) !== null) {
      if (match.index > lastIndex) {
        element.appendChild(document.createTextNode(safeValue.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = safeValue.slice(match.index, matcher.lastIndex);
      element.appendChild(mark);
      lastIndex = matcher.lastIndex;
    }
    if (lastIndex === 0) {
      element.textContent = safeValue;
      return;
    }
    if (lastIndex < safeValue.length) {
      element.appendChild(document.createTextNode(safeValue.slice(lastIndex)));
    }
  }

  function createStatChip(value, label) {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    chip.append(strong, span);
    return chip;
  }

  function renderStatsPanel(quizzes) {
    if (!savedStats) return;
    savedStats.innerHTML = '';
    if (!isStorageAllowed()) {
      savedStats.appendChild(createStatChip('0', 'Speichern deaktiviert'));
      return;
    }
    const summary = U.createQuizSummary ? U.createQuizSummary(quizzes) : { total: quizzes.length };
    savedStats.appendChild(createStatChip(String(summary.total || 0), 'Gespeicherte Quizze'));
    if (summary.totalQuestions !== undefined) {
      savedStats.appendChild(createStatChip(String(summary.totalQuestions), 'Fragen insgesamt'));
    }
    if (summary.averageQuestionTimer !== undefined) {
      savedStats.appendChild(createStatChip(`${summary.averageQuestionTimer || 0}s`, 'Ø Timer'));
    }
    if (summary.lastUpdated) {
      const formatted = U.formatDate ? U.formatDate(summary.lastUpdated) : new Date(summary.lastUpdated).toLocaleDateString('de-DE');
      savedStats.appendChild(createStatChip(formatted, 'Zuletzt aktualisiert'));
    }
  }

  function renderSavedQuizzes() {
    savedList.innerHTML = '';
    const quizzes = getStoredQuizzes();
    renderStatsPanel(quizzes);

    if (!isStorageAllowed()) {
      const info = document.createElement('li');
      info.className = 'muted';
      info.textContent = 'Aktiviere Cookies/Local Storage, um Quizze dauerhaft zu speichern.';
      savedList.appendChild(info);
      if (exportButton) exportButton.disabled = true;
      return;
    }

    const hasQuizzes = quizzes.length > 0;
    if (exportButton) exportButton.disabled = !hasQuizzes;

    if (!hasQuizzes) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'Noch keine Quizze gespeichert.';
      savedList.appendChild(empty);
      return;
    }

    const filtered = applySavedFilters(quizzes);
    if (!filtered.length) {
      const info = document.createElement('li');
      info.className = 'muted';
      info.textContent = `Kein Quiz passt zu "${savedFilters.query}".`;
      savedList.appendChild(info);
      return;
    }

    filtered.forEach((quiz) => {
      const item = document.createElement('li');
      item.className = 'saved-item';
      item.dataset.id = quiz.id;

      const meta = document.createElement('div');
      meta.className = 'saved-item__meta';
      const title = document.createElement('h3');
      renderHighlightedText(title, U.safeText ? U.safeText(quiz.title) : quiz.title, savedFilters.query);
      const description = document.createElement('p');
      const created = U.formatDate ? U.formatDate(quiz.createdAt) : new Date(quiz.createdAt).toLocaleDateString('de-DE');
      description.textContent = `${quiz.questions.length} Fragen · ${created}`;
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = U.describeQuizDifficulty ? U.describeQuizDifficulty(quiz) : 'Timer';
      meta.append(title, description, badge);

      const actions = document.createElement('div');
      actions.className = 'saved-item__actions';

      const loadButton = document.createElement('button');
      loadButton.textContent = 'Laden';
      loadButton.dataset.action = 'load';
      const playButton = document.createElement('button');
      playButton.textContent = "Let's Start";
      playButton.dataset.action = 'play';
      const duplicateButton = document.createElement('button');
      duplicateButton.textContent = 'Duplizieren';
      duplicateButton.dataset.action = 'duplicate';
      const shareButton = document.createElement('button');
      shareButton.textContent = 'Kopieren';
      shareButton.dataset.action = 'share';
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'L&ouml;schen';
      deleteButton.dataset.action = 'delete';

      actions.append(loadButton, playButton, duplicateButton, shareButton, deleteButton);
      item.append(meta, actions);
      savedList.appendChild(item);
    });
  }

  function updateSortButtons() {
    savedSortButtons.forEach((button) => {
      const key = button.dataset.savedSort || 'date';
      button.classList.toggle('is-active', key === savedFilters.sort);
    });
  }

  function duplicateQuiz(quiz) {
    const clone = JSON.parse(JSON.stringify(quiz));
    clone.id = createId();
    clone.createdAt = new Date().toISOString();
    clone.title = `${quiz.title} (Kopie)`;
    const quizzes = getStoredQuizzes();
    quizzes.push(clone);
    saveQuizzes(quizzes);
    renderSavedQuizzes();
  }

  function shareQuiz(quiz) {
    const payload = JSON.stringify(quiz, null, 2);
    const copier = U.copyToClipboard ? U.copyToClipboard(payload) : Promise.resolve();
    copier
      .then(() => alert(`Quiz "${quiz.title}" wurde in die Zwischenablage kopiert.`))
      .catch(() => alert('Konnte das Quiz nicht kopieren.'));
  }

  function mergeQuizCollections(existing, incoming) {
    const map = new Map(existing.map((quiz) => [quiz.id, quiz]));
    incoming.forEach((quiz) => {
      const normalized = U.normalizeQuiz ? U.normalizeQuiz(quiz) : quiz;
      const id = normalized.id || createId();
      map.set(id, { ...normalized, id });
    });
    return Array.from(map.values());
  }

  function handleImportPayload(payload) {
    const incoming = Array.isArray(payload) ? payload : [payload];
    const valid = incoming.filter((quiz) => (U.isValidQuiz ? U.isValidQuiz(quiz) : quiz?.questions?.length));
    if (!valid.length) {
      alert('Keine g&uuml;ltigen Quizze in der Datei gefunden.');
      return;
    }
    const merged = mergeQuizCollections(getStoredQuizzes(), valid);
    saveQuizzes(merged);
    renderSavedQuizzes();
    alert(`${valid.length} Quizze importiert.`);
  }

  function importQuizzesFromFile(file) {
    if (!file) return;
    if (!isStorageAllowed()) {
      alert('Bitte erlaube Local Storage, bevor du Quizze importierst.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result?.toString() || '';
      const parsed = U.parseJSON ? U.parseJSON(text, null) : (() => {
          try {
            return JSON.parse(text);
          } catch (error) {
            return null;
          }
        })();
      if (!parsed) {
        alert('Datei konnte nicht gelesen werden.');
        return;
      }
      handleImportPayload(parsed);
    };
    reader.readAsText(file);
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

    if (action === 'duplicate' && selected) {
      duplicateQuiz(selected);
    }

    if (action === 'share' && selected) {
      shareQuiz(selected);
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

  if (savedSearchInput) {
    savedSearchInput.addEventListener('input', (event) => {
      handleSavedSearch(event.target.value);
    });
  }

  savedSortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      savedFilters.sort = button.dataset.savedSort || 'date';
      updateSortButtons();
      renderSavedQuizzes();
    });
  });

  if (importButton && importInput) {
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) {
        importQuizzesFromFile(file);
      }
      importInput.value = '';
    });
  }

  document.addEventListener('consentchange', renderSavedQuizzes);

  renderQuestionList();
  updateSortButtons();
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
  const questionJumpInput = document.querySelector('[data-question-jump]');
  const shuffleButton = document.querySelector('[data-shuffle-questions]');
  const playerSearchInput = document.querySelector('[data-player-search]');
  const scoreSummary = document.querySelector('[data-score-summary]');
  const autoSortButton = document.querySelector('[data-score-autosort]');
  const exportScoresButton = document.querySelector('[data-export-scores]');
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
    questionOrder: [],
    shuffleQuestions: false,
    autoSortScores: true,
    playerSearch: '',
  };

  const handlePlayerSearch = U.debounce
    ? U.debounce((value) => {
        hostState.playerSearch = value;
        renderPlayers();
      }, 150)
    : (value) => {
        hostState.playerSearch = value;
        renderPlayers();
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

  function updateTimerLabel(value) {
    if (!timerDisplay) return;
    const label = U.formatSeconds ? U.formatSeconds(value) : `${value}s`;
    timerDisplay.textContent = label;
  }

  function updateRevealState() {
    if (revealButton) {
      revealButton.disabled = !hostState.quiz;
      revealButton.textContent = hostState.showAnswers ? 'Antwort verbergen' : 'Antwort anzeigen';
    }

    if (!answerList) return;
    const question = hostState.quiz?.questions?.[getActiveQuestionIndex()];
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

  function getActiveQuestionIndex(index = hostState.index) {
    if (!hostState.questionOrder.length) {
      return index;
    }
    return hostState.questionOrder[index] ?? index;
  }

  function createQuestionOrder(total) {
    if (!hostState.shuffleQuestions) return [];
    const order = Array.from({ length: total }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function updateShuffleButton() {
    if (!shuffleButton) return;
    shuffleButton.textContent = hostState.shuffleQuestions ? 'Shuffle aktiv' : 'Shuffle deaktiviert';
    shuffleButton.classList.toggle('is-active', hostState.shuffleQuestions);
  }

  function syncQuestionJumpInput() {
    if (!questionJumpInput) return;
    if (!hostState.quiz) {
      questionJumpInput.value = '';
      questionJumpInput.setAttribute('disabled', 'true');
      return;
    }
    questionJumpInput.removeAttribute('disabled');
    questionJumpInput.value = String(hostState.index + 1);
    questionJumpInput.setAttribute('max', String(hostState.quiz.questions.length));
  }

  function updateAutoSortButton() {
    if (!autoSortButton) return;
    autoSortButton.textContent = hostState.autoSortScores ? 'Auto-Sort aktiv' : 'Auto-Sort aus';
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
      questionJumpInput?.setAttribute('disabled', 'true');
      resetReveal();
      return;
    }

    const { questions, title } = hostState.quiz;
    const total = questions.length;
    const activeIndex = getActiveQuestionIndex();
    const currentQuestion = questions[activeIndex];
    if (!currentQuestion) return;

    questionText.textContent = currentQuestion.text;
    const detailParts = [title, U.formatTimerLabel ? U.formatTimerLabel(currentQuestion.timer) : `Timer: ${currentQuestion.timer}s`];
    if (hostState.shuffleQuestions) {
      detailParts.push(`Original #${activeIndex + 1}`);
    }
    questionDesc.textContent = detailParts.join(' · ');
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
    syncQuestionJumpInput();
    clearTimer();
    hostState.remaining = currentQuestion.timer;
    updateTimerLabel(hostState.remaining);
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
    hostState.questionOrder = createQuestionOrder(selected.questions.length);
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
      updateTimerLabel(hostState.remaining);
    }, 1000);
  }

  function resetTimer() {
    clearTimer();
    if (!hostState.quiz) return;
    const question = hostState.quiz.questions[getActiveQuestionIndex()];
    hostState.remaining = question.timer;
    updateTimerLabel(hostState.remaining);
  }

  function renderPlayerName(element, text, term) {
    const safeValue = text || '';
    element.textContent = '';
    if (!term) {
      element.textContent = safeValue;
      return;
    }
    const matcher = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'gi');
    let lastIndex = 0;
    let match;
    while ((match = matcher.exec(safeValue)) !== null) {
      if (match.index > lastIndex) {
        element.appendChild(document.createTextNode(safeValue.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = safeValue.slice(match.index, matcher.lastIndex);
      element.appendChild(mark);
      lastIndex = matcher.lastIndex;
    }
    if (lastIndex === 0) {
      element.textContent = safeValue;
      return;
    }
    if (lastIndex < safeValue.length) {
      element.appendChild(document.createTextNode(safeValue.slice(lastIndex)));
    }
  }

  function getPlayersForDisplay() {
    let players = hostState.players.slice();
    if (hostState.autoSortScores) {
      players.sort((a, b) => b.score - a.score);
    }
    if (hostState.playerSearch) {
      const normalized = U.removeDiacritics
        ? U.removeDiacritics(hostState.playerSearch.toLowerCase())
        : hostState.playerSearch.toLowerCase();
      players = players.filter((player) => {
        const value = U.removeDiacritics ? U.removeDiacritics(player.name.toLowerCase()) : player.name.toLowerCase();
        return value.includes(normalized);
      });
    }
    return players;
  }

  function updateScoreSummary(allPlayers, visiblePlayers) {
    if (!scoreSummary) return;
    if (!allPlayers.length) {
      scoreSummary.textContent = 'Noch keine Teams eingetragen.';
      return;
    }
    const totalPoints = allPlayers.reduce((sum, player) => sum + (player.score || 0), 0);
    const topScore = Math.max(...allPlayers.map((player) => player.score || 0));
    const label = visiblePlayers.length === allPlayers.length
      ? `${allPlayers.length} Teams`
      : `${visiblePlayers.length}/${allPlayers.length} Teams`;
    scoreSummary.textContent = `${label} · Gesamtpunkte ${totalPoints} · Highscore ${topScore}`;
  }

  function renderPlayers() {
    if (!scoreList) return;
    scoreList.innerHTML = '';
    const visiblePlayers = getPlayersForDisplay();
    if (!hostState.players.length) {
      const info = document.createElement('li');
      info.className = 'scoreboard__empty';
      info.textContent = 'Noch keine Spieler:innen.';
      scoreList.appendChild(info);
      updateScoreSummary(hostState.players, visiblePlayers);
      populatePodiumSelects();
      return;
    }

    if (!visiblePlayers.length) {
      const info = document.createElement('li');
      info.className = 'scoreboard__empty';
      info.textContent = `Keine Treffer f&uuml;r "${hostState.playerSearch}".`;
      scoreList.appendChild(info);
      updateScoreSummary(hostState.players, visiblePlayers);
      populatePodiumSelects();
      return;
    }

    visiblePlayers.forEach((player, index) => {
      const item = document.createElement('li');
      if (hostState.autoSortScores && index === 0 && !hostState.playerSearch) {
        item.classList.add('scoreboard__item--leader');
      }
      const meta = document.createElement('div');
      const name = document.createElement('p');
      name.className = 'scoreboard__name';
      if (hostState.playerSearch) {
        renderPlayerName(name, player.name, hostState.playerSearch);
      } else {
        name.textContent = player.name;
      }
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

    updateScoreSummary(hostState.players, visiblePlayers);
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
    const question = hostState.quiz?.questions?.[getActiveQuestionIndex()];
    const label = question ? `Frage ${hostState.index + 1}` : 'Freie Punkte';
    const snippet = question
      ? U.truncateText
        ? U.truncateText(question.text, 80)
        : `${question.text.slice(0, 80)}…`
      : 'Manuelle Punktevergabe';
    const entry = U.buildHistoryEntry ? U.buildHistoryEntry(label, snippet, winners) : { questionLabel: label, questionSnippet: snippet, winners };
    hostState.roundHistory.unshift(entry);
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

  function clampQuestionTarget(value) {
    const total = hostState.quiz?.questions.length || 1;
    const numeric = Number(value) || 1;
    return Math.min(total, Math.max(1, numeric));
  }

  function exportScores() {
    if (!hostState.players.length) {
      alert('Keine Spieler:innen zum Exportieren.');
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      quizId: hostState.quiz?.id || null,
      quizTitle: hostState.quiz?.title || '',
      players: hostState.players,
    };
    const blob = U.exportScoresBlob
      ? U.exportScoresBlob(payload)
      : new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entiquiz-scoreboard-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (playerForm) {
    playerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(playerForm);
      const rawName = (data.get('player') || '').toString();
      const name = U.normalizePlayerName ? U.normalizePlayerName(rawName) : rawName.trim();
      if (!name) return;
      hostState.players.push(U.createScoreEntry ? U.createScoreEntry(name, 0) : { id: createId(), name, score: 0 });
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
  questionJumpInput?.addEventListener('change', (event) => {
    if (!hostState.quiz) return;
    const target = clampQuestionTarget(event.target.value);
    hostState.index = target - 1;
    renderQuestion();
  });
  shuffleButton?.addEventListener('click', () => {
    hostState.shuffleQuestions = !hostState.shuffleQuestions;
    updateShuffleButton();
    if (hostState.quiz) {
      hostState.questionOrder = createQuestionOrder(hostState.quiz.questions.length);
      hostState.index = 0;
      renderQuestion();
    }
  });
  playerSearchInput?.addEventListener('input', (event) => {
    handlePlayerSearch(event.target.value);
  });
  autoSortButton?.addEventListener('click', () => {
    hostState.autoSortScores = !hostState.autoSortScores;
    updateAutoSortButton();
    renderPlayers();
  });
  exportScoresButton?.addEventListener('click', exportScores);

  document.addEventListener('consentchange', populateSelect);

  populateSelect();
  syncStartButton();
  renderQuestion();
  renderPlayers();
  renderRoundHistory();
  updateRevealState();
  updateShuffleButton();
  updateAutoSortButton();
  updateScoreSummary([], []);
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
