(function (global) {
  'use strict';

  function isNil(value) {
    return value === null || value === undefined;
  }

  function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isString(value) {
    return typeof value === 'string';
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toInteger(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toPositiveNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    return parsed;
  }

  function clampNumber(value, min = 0, max = 1) {
    const numeric = toNumber(value, min);
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
  }

  function between(value, min, max) {
    const numeric = toNumber(value, min);
    return numeric >= min && numeric <= max;
  }

  function sanitizeWhitespace(value) {
    if (!isString(value)) return '';
    return value.replace(/\s+/g, ' ').trim();
  }

  function trimAndCollapse(value) {
    if (!isString(value)) return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  function toLowerSafe(value) {
    return isString(value) ? value.toLowerCase() : '';
  }

  function toUpperSafe(value) {
    return isString(value) ? value.toUpperCase() : '';
  }

  function removeDiacritics(value) {
    if (!isString(value)) return '';
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function includesIgnoreCase(source, query) {
    const normalizedSource = removeDiacritics(toLowerSafe(source));
    const normalizedQuery = removeDiacritics(toLowerSafe(query));
    if (!normalizedQuery) return true;
    return normalizedSource.includes(normalizedQuery);
  }

  function startsWithIgnoreCase(source, query) {
    const normalizedSource = removeDiacritics(toLowerSafe(source));
    const normalizedQuery = removeDiacritics(toLowerSafe(query));
    if (!normalizedQuery) return true;
    return normalizedSource.startsWith(normalizedQuery);
  }

  function endsWithIgnoreCase(source, query) {
    const normalizedSource = removeDiacritics(toLowerSafe(source));
    const normalizedQuery = removeDiacritics(toLowerSafe(query));
    if (!normalizedQuery) return true;
    return normalizedSource.endsWith(normalizedQuery);
  }

  function slugifyText(value) {
    const normalized = removeDiacritics(toLowerSafe(value));
    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function clampString(value, maxLength = 120) {
    if (!isString(value)) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}…`;
  }

  function fallbackText(value, fallback = '') {
    return isNonEmptyString(value) ? value : fallback;
  }

  function highlightTerm(text, term) {
    if (!term) return text;
    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function countWords(value) {
    if (!isString(value)) return 0;
    const matches = value.trim().match(/\b\w+\b/g);
    return matches ? matches.length : 0;
  }

  function splitLines(value) {
    if (!isString(value)) return [];
    return value.split(/\r?\n/).map((line) => line.trim());
  }

  function parseCsvLine(value) {
    if (!isString(value)) return [];
    return value.split(',').map((segment) => segment.trim());
  }

  function joinWithComma(list) {
    if (!Array.isArray(list)) return '';
    return list.filter(Boolean).join(', ');
  }

  function formatList(list, conjunction = 'und') {
    if (!Array.isArray(list) || list.length === 0) return '';
    if (list.length === 1) return list[0];
    const copy = list.slice();
    const last = copy.pop();
    return `${copy.join(', ')} ${conjunction} ${last}`;
  }

  function compareStrings(a, b) {
    return removeDiacritics(toLowerSafe(a)).localeCompare(removeDiacritics(toLowerSafe(b)), 'de');
  }

  function naturalCompare(a, b) {
    return removeDiacritics(toLowerSafe(a)).localeCompare(removeDiacritics(toLowerSafe(b)), 'de', {
      numeric: true,
    });
  }

  function encodeQuery(value) {
    return encodeURIComponent(sanitizeWhitespace(value));
  }

  function isArray(value) {
    return Array.isArray(value);
  }

  function arrayHasItems(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function ensureArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function arraySum(list) {
    return ensureArray(list).reduce((total, entry) => total + toNumber(entry, 0), 0);
  }

  function arrayAverage(list) {
    const items = ensureArray(list);
    if (!items.length) return 0;
    return arraySum(items) / items.length;
  }

  function arrayMin(list) {
    return Math.min(...ensureArray(list).map((value) => toNumber(value, Infinity)));
  }

  function arrayMax(list) {
    return Math.max(...ensureArray(list).map((value) => toNumber(value, -Infinity)));
  }

  function sortByNumberAsc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => toNumber(accessor(a), 0) - toNumber(accessor(b), 0));
    return copy;
  }

  function sortByNumberDesc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => toNumber(accessor(b), 0) - toNumber(accessor(a), 0));
    return copy;
  }

  function sortByStringAsc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => compareStrings(accessor(a), accessor(b)));
    return copy;
  }

  function sortByStringDesc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => compareStrings(accessor(b), accessor(a)));
    return copy;
  }

  function uniqueValues(list) {
    return Array.from(new Set(ensureArray(list)));
  }

  function chunkArray(list, size = 2) {
    const items = ensureArray(list);
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function flattenArray(list) {
    return ensureArray(list).reduce((all, entry) => all.concat(entry), []);
  }

  function takeFirst(list, count = 1) {
    return ensureArray(list).slice(0, count);
  }

  function takeLast(list, count = 1) {
    const items = ensureArray(list);
    return items.slice(Math.max(0, items.length - count));
  }

  function insertAt(list, index, value) {
    const copy = ensureArray(list).slice();
    copy.splice(index, 0, value);
    return copy;
  }

  function removeAt(list, index) {
    const copy = ensureArray(list).slice();
    copy.splice(index, 1);
    return copy;
  }

  function replaceAt(list, index, value) {
    const copy = ensureArray(list).slice();
    copy[index] = value;
    return copy;
  }

  function findById(list, id) {
    return ensureArray(list).find((entry) => entry?.id === id) || null;
  }

  function updateById(list, id, updater) {
    return ensureArray(list).map((entry) => {
      if (entry?.id === id) {
        return typeof updater === 'function' ? updater(entry) : updater;
      }
      return entry;
    });
  }

  function pluck(list, key) {
    return ensureArray(list).map((entry) => entry?.[key]);
  }

  function sumBy(list, accessor) {
    return ensureArray(list).reduce((total, entry) => total + toNumber(accessor(entry), 0), 0);
  }

  function groupBy(list, accessor) {
    return ensureArray(list).reduce((groups, entry) => {
      const key = accessor(entry);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
      return groups;
    }, {});
  }

  function countBy(list, accessor) {
    return ensureArray(list).reduce((counts, entry) => {
      const key = accessor(entry);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function partition(list, predicate) {
    const truthy = [];
    const falsy = [];
    ensureArray(list).forEach((entry) => {
      if (predicate(entry)) {
        truthy.push(entry);
      } else {
        falsy.push(entry);
      }
    });
    return [truthy, falsy];
  }

  function filterByQuery(list, query, extractor) {
    const normalizedQuery = removeDiacritics(toLowerSafe(query));
    if (!normalizedQuery) return ensureArray(list);
    return ensureArray(list).filter((entry) => {
      const target = removeDiacritics(toLowerSafe(extractor(entry)));
      return target.includes(normalizedQuery);
    });
  }

  function filterByTimer(list, min, max) {
    return ensureArray(list).filter((question) => {
      const timer = toNumber(question.timer, 0);
      return timer >= min && timer <= max;
    });
  }

  function mapWithIndex(list, mapper) {
    return ensureArray(list).map((entry, index) => mapper(entry, index));
  }

  function mergeArrays(...arrays) {
    return arrays.reduce((all, current) => all.concat(ensureArray(current)), []);
  }

  function diffArrays(base, compare) {
    const other = new Set(ensureArray(compare));
    return ensureArray(base).filter((entry) => !other.has(entry));
  }

  function sortByDateDesc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => new Date(accessor(b)).getTime() - new Date(accessor(a)).getTime());
    return copy;
  }

  function sortByDateAsc(list, accessor) {
    const copy = ensureArray(list).slice();
    copy.sort((a, b) => new Date(accessor(a)).getTime() - new Date(accessor(b)).getTime());
    return copy;
  }

  function stableSort(list, compare) {
    return ensureArray(list)
      .map((value, index) => ({ value, index }))
      .sort((a, b) => {
        const result = compare(a.value, b.value);
        if (result !== 0) return result;
        return a.index - b.index;
      })
      .map((entry) => entry.value);
  }

  function toggleItem(list, value) {
    const items = ensureArray(list).slice();
    const index = items.indexOf(value);
    if (index === -1) {
      items.push(value);
    } else {
      items.splice(index, 1);
    }
    return items;
  }

  function dedupeObjectsByKey(list, key) {
    const seen = new Set();
    return ensureArray(list).filter((entry) => {
      const value = entry?.[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function roundTo(value, precision = 0) {
    const factor = 10 ** precision;
    return Math.round(toNumber(value, 0) * factor) / factor;
  }

  function secondsToMinutes(seconds) {
    return toNumber(seconds, 0) / 60;
  }

  function minutesToSeconds(minutes) {
    return toNumber(minutes, 0) * 60;
  }

  function formatSeconds(seconds) {
    const numeric = Math.max(0, Math.round(toNumber(seconds, 0)));
    const minutes = Math.floor(numeric / 60);
    const remainder = numeric % 60;
    if (!minutes) return `${remainder}s`;
    return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
  }

  function percentOf(value, total) {
    if (!total) return 0;
    return (toNumber(value, 0) / toNumber(total, 1)) * 100;
  }

  function timerProgress(total, elapsed) {
    if (!total) return 0;
    return clampNumber((toNumber(elapsed, 0) / toNumber(total, 1)) * 100, 0, 100);
  }

  function totalTimer(questions) {
    return sumBy(questions, (question) => question.timer || 0);
  }

  function averageTimer(questions) {
    const timers = ensureArray(questions).map((question) => question.timer || 0);
    return arrayAverage(timers);
  }

  function computeMedian(list) {
    const items = ensureArray(list).map((value) => toNumber(value, 0)).sort((a, b) => a - b);
    if (!items.length) return 0;
    const middle = Math.floor(items.length / 2);
    if (items.length % 2 === 0) {
      return (items[middle - 1] + items[middle]) / 2;
    }
    return items[middle];
  }

  function computeMode(list) {
    const counts = countBy(list, (value) => value);
    let bestValue = null;
    let bestCount = 0;
    Object.entries(counts).forEach(([value, count]) => {
      if (count > bestCount) {
        bestValue = value;
        bestCount = count;
      }
    });
    return bestValue;
  }

  function calculateRange(list) {
    const items = ensureArray(list).map((value) => toNumber(value, 0));
    if (!items.length) return 0;
    return Math.max(...items) - Math.min(...items);
  }

  function randomInt(min, max) {
    const lower = Math.ceil(min);
    const upper = Math.floor(max);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }

  function randomItem(list) {
    const items = ensureArray(list);
    if (!items.length) return undefined;
    return items[randomInt(0, items.length - 1)];
  }

  function normalizePercentage(value) {
    return clampNumber(value, 0, 100);
  }

  function distributePoints(players, points) {
    const total = Math.max(1, ensureArray(players).length);
    const share = Math.floor(points / total);
    return ensureArray(players).map((player) => ({ ...player, share }));
  }

  function cloneQuiz(quiz) {
    return JSON.parse(JSON.stringify(quiz));
  }

  function cloneQuestion(question) {
    return JSON.parse(JSON.stringify(question));
  }

  function normalizeQuiz(quiz) {
    return {
      id: quiz?.id ?? null,
      title: sanitizeWhitespace(quiz?.title ?? ''),
      description: sanitizeWhitespace(quiz?.description ?? ''),
      questions: ensureArray(quiz?.questions).map(normalizeQuestion),
      createdAt: quiz?.createdAt || new Date().toISOString(),
    };
  }

  function normalizeQuestion(question) {
    return {
      id: question?.id ?? null,
      text: sanitizeWhitespace(question?.text ?? ''),
      answers: ensureArray(question?.answers).map((answer) => sanitizeWhitespace(answer || '')),
      correctIndex: toInteger(question?.correctIndex, 0),
      timer: toPositiveNumber(question?.timer, 20),
    };
  }

  function isValidQuiz(quiz) {
    if (!quiz) return false;
    return isNonEmptyString(quiz.title) && ensureArray(quiz.questions).length > 0;
  }

  function isValidQuestion(question) {
    if (!question) return false;
    const answers = ensureArray(question.answers).filter(Boolean);
    return isNonEmptyString(question.text) && answers.length >= 2;
  }

  function enrichQuizWithStats(quiz) {
    const normalized = normalizeQuiz(quiz);
    return {
      ...normalized,
      totalQuestions: normalized.questions.length,
      totalTimer: totalTimer(normalized.questions),
      averageTimer: averageTimer(normalized.questions),
    };
  }

  function createQuizSummary(quizzes) {
    const list = ensureArray(quizzes);
    const total = list.length;
    const totalQuestions = sumBy(list, (quiz) => ensureArray(quiz.questions).length);
    const timers = flattenArray(list.map((quiz) => ensureArray(quiz.questions).map((question) => question.timer || 0)));
    const averageQuestionTimer = timers.length ? Math.round(arrayAverage(timers)) : 0;
    const lastUpdated = total ? sortByDateDesc(list, (quiz) => quiz.createdAt)[0].createdAt : null;
    return {
      total,
      totalQuestions,
      averageQuestionTimer,
      lastUpdated,
    };
  }

  function buildQuizMap(quizzes) {
    return ensureArray(quizzes).reduce((map, quiz) => {
      if (quiz?.id) {
        map[quiz.id] = quiz;
      }
      return map;
    }, {});
  }

  function mapQuizToOption(quiz) {
    return {
      value: quiz.id,
      label: `${quiz.title} (${ensureArray(quiz.questions).length} Fragen)`,
    };
  }

  function formatQuizMeta(quiz) {
    const totalQuestions = ensureArray(quiz?.questions).length;
    const created = quiz?.createdAt ? formatDate(quiz.createdAt) : 'unbekannt';
    return `${totalQuestions} Fragen · ${created}`;
  }

  function formatQuestionPreview(question, limit = 80) {
    return clampString(question?.text || '', limit);
  }

  function createScoreEntry(name, score = 0) {
    return {
      id: ensureId(),
      name: normalizePlayerName(name),
      score: toNumber(score, 0),
    };
  }

  function sortPlayersByScore(players) {
    return sortByNumberDesc(players, (player) => player.score);
  }

  function normalizePlayerName(name) {
    const cleaned = sanitizeWhitespace(name || '');
    return cleaned || 'Unbenannt';
  }

  function computeLeaderboard(players) {
    return sortPlayersByScore(players).map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }

  function serializePlayers(players) {
    return JSON.stringify(ensureArray(players));
  }

  function deserializePlayers(serialized) {
    try {
      const parsed = JSON.parse(serialized);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function exportScoresBlob(payload) {
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  function buildHistoryEntry(questionLabel, questionSnippet, winners) {
    return {
      id: ensureId(),
      questionLabel,
      questionSnippet,
      winners: ensureArray(winners),
    };
  }

  function truncateText(text, limit = 120) {
    return clampString(text, limit);
  }

  function safeText(text) {
    return sanitizeWhitespace(text || '');
  }

  function createElementFrom(tag, className, textContent) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  function createButton(label, className, type = 'button') {
    const button = document.createElement('button');
    button.type = type;
    button.textContent = label;
    if (className) {
      button.className = className;
    }
    return button;
  }

  function setText(element, text) {
    if (!element) return;
    element.textContent = text;
  }

  function setDisabled(element, disabled) {
    if (!element) return;
    element.disabled = Boolean(disabled);
  }

  function toggleClassName(element, className, force) {
    if (!element) return;
    element.classList.toggle(className, force);
  }

  function addClassName(element, className) {
    if (!element) return;
    element.classList.add(className);
  }

  function removeClassName(element, className) {
    if (!element) return;
    element.classList.remove(className);
  }

  function focusElement(element) {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  function scrollIntoViewIfNeeded(element) {
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function createFragment(children) {
    const fragment = document.createDocumentFragment();
    ensureArray(children).forEach((child) => {
      fragment.appendChild(child);
    });
    return fragment;
  }

  function createListItem(text, className) {
    const item = document.createElement('li');
    if (className) {
      item.className = className;
    }
    item.textContent = text;
    return item;
  }

  function createBadge(label) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = label;
    return badge;
  }

  function createSummaryRow(label, value) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const strong = document.createElement('strong');
    strong.textContent = label;
    const span = document.createElement('span');
    span.textContent = value;
    row.append(strong, span);
    return row;
  }

  function createSortButton(label, sortKey) {
    const button = createButton(label, 'button button--ghost');
    button.dataset.savedSort = sortKey;
    return button;
  }

  function createPodiumOption(player) {
    const option = document.createElement('option');
    option.value = player.id;
    option.textContent = player.name;
    return option;
  }

  function formatScore(value) {
    return `${toNumber(value, 0)} Punkte`;
  }

  function sortScores(players) {
    return sortByNumberDesc(players, (player) => player.score);
  }

  function renderEmptyState(list, text) {
    const item = document.createElement('li');
    item.className = 'muted';
    item.textContent = text;
    list.appendChild(item);
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleDateString('de-DE');
    } catch (error) {
      return '';
    }
  }

  function formatDateTime(value) {
    try {
      return new Date(value).toLocaleString('de-DE');
    } catch (error) {
      return '';
    }
  }

  function getNow() {
    return new Date();
  }

  function daysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  function minutesBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60));
  }

  function secondsBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / 1000);
  }

  function toIsoString(value) {
    return new Date(value).toISOString();
  }

  function ensureId(prefix = 'id') {
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  function parseJSON(payload, fallback = null) {
    try {
      return JSON.parse(payload);
    } catch (error) {
      return fallback;
    }
  }

  function safeParseInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function boolFromString(value) {
    if (!isString(value)) return false;
    return ['1', 'true', 'yes', 'ja'].includes(value.trim().toLowerCase());
  }

  function boolToText(value) {
    return value ? 'Ja' : 'Nein';
  }

  function wrapTryCatch(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      return typeof fallback === 'function' ? fallback(error) : fallback;
    }
  }

  function memoize(fn) {
    const cache = new Map();
    return function memoized(key) {
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(key);
      cache.set(key, result);
      return result;
    };
  }

  function throttle(fn, wait = 100) {
    let last = 0;
    let timeout;
    return function throttled(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          last = Date.now();
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

  function debounce(fn, wait = 200) {
    let timeout;
    return function debounced(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function once(fn) {
    let called = false;
    let value;
    return function onceWrapper(...args) {
      if (!called) {
        called = true;
        value = fn.apply(this, args);
      }
      return value;
    };
  }

  function selectText(element) {
    if (!element) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function formatTimerLabel(timer) {
    return `${timer}s Timer`;
  }

  function describeQuizDifficulty(quiz) {
    const average = averageTimer(quiz?.questions || []);
    if (average >= 40) return 'Entspannt';
    if (average >= 25) return 'Ausgewogen';
    return 'Schnell';
  }

  function deriveQuestionComplexity(question) {
    const textLength = question?.text?.length || 0;
    if (textLength > 140) return 'hoch';
    if (textLength > 80) return 'mittel';
    return 'kurz';
  }

  function summarizePlayer(player) {
    return `${player.name} · ${player.score} Punkte`;
  }

  function createCsvRow(values) {
    return ensureArray(values)
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',');
  }

  function parseNumberList(value) {
    return splitLines(value)
      .map((line) => line.split(',').map((segment) => toNumber(segment.trim(), 0)))
      .flat();
  }

  function flattenQuestions(quizzes) {
    return flattenArray(ensureArray(quizzes).map((quiz) => ensureArray(quiz.questions)));
  }

  function quizContainsTerm(quiz, term) {
    const normalized = removeDiacritics(toLowerSafe(term));
    if (!normalized) return true;
    const haystack = [quiz.title, quiz.description, ...ensureArray(quiz.questions).map((question) => question.text)]
      .map((value) => removeDiacritics(toLowerSafe(value)))
      .join(' ');
    return haystack.includes(normalized);
  }

  function questionContainsTerm(question, term) {
    const normalized = removeDiacritics(toLowerSafe(term));
    if (!normalized) return true;
    const haystack = [question.text, ...ensureArray(question.answers)]
      .map((value) => removeDiacritics(toLowerSafe(value)))
      .join(' ');
    return haystack.includes(normalized);
  }

  function createSearchTokens(value) {
    return removeDiacritics(toLowerSafe(value)).split(/\s+/).filter(Boolean);
  }

  const helperEntries = [
    isNil,
    isNumber,
    isFiniteNumber,
    isString,
    isNonEmptyString,
    toNumber,
    toInteger,
    toPositiveNumber,
    clampNumber,
    between,
    sanitizeWhitespace,
    trimAndCollapse,
    toLowerSafe,
    toUpperSafe,
    removeDiacritics,
    includesIgnoreCase,
    startsWithIgnoreCase,
    endsWithIgnoreCase,
    slugifyText,
    clampString,
    fallbackText,
    highlightTerm,
    countWords,
    splitLines,
    parseCsvLine,
    joinWithComma,
    formatList,
    compareStrings,
    naturalCompare,
    encodeQuery,
    isArray,
    arrayHasItems,
    ensureArray,
    arraySum,
    arrayAverage,
    arrayMin,
    arrayMax,
    sortByNumberAsc,
    sortByNumberDesc,
    sortByStringAsc,
    sortByStringDesc,
    uniqueValues,
    chunkArray,
    flattenArray,
    takeFirst,
    takeLast,
    insertAt,
    removeAt,
    replaceAt,
    findById,
    updateById,
    pluck,
    sumBy,
    groupBy,
    countBy,
    partition,
    filterByQuery,
    filterByTimer,
    mapWithIndex,
    mergeArrays,
    diffArrays,
    sortByDateDesc,
    sortByDateAsc,
    stableSort,
    toggleItem,
    dedupeObjectsByKey,
    roundTo,
    secondsToMinutes,
    minutesToSeconds,
    formatSeconds,
    percentOf,
    timerProgress,
    totalTimer,
    averageTimer,
    computeMedian,
    computeMode,
    calculateRange,
    randomInt,
    randomItem,
    normalizePercentage,
    distributePoints,
    cloneQuiz,
    cloneQuestion,
    normalizeQuiz,
    normalizeQuestion,
    isValidQuiz,
    isValidQuestion,
    enrichQuizWithStats,
    createQuizSummary,
    buildQuizMap,
    mapQuizToOption,
    formatQuizMeta,
    formatQuestionPreview,
    createScoreEntry,
    sortPlayersByScore,
    normalizePlayerName,
    computeLeaderboard,
    serializePlayers,
    deserializePlayers,
    exportScoresBlob,
    buildHistoryEntry,
    truncateText,
    safeText,
    createElementFrom,
    createButton,
    setText,
    setDisabled,
    toggleClassName,
    addClassName,
    removeClassName,
    focusElement,
    scrollIntoViewIfNeeded,
    createFragment,
    createListItem,
    createBadge,
    createSummaryRow,
    createSortButton,
    createPodiumOption,
    formatScore,
    sortScores,
    renderEmptyState,
    formatDate,
    formatDateTime,
    getNow,
    daysBetween,
    minutesBetween,
    secondsBetween,
    toIsoString,
    ensureId,
    parseJSON,
    safeParseInt,
    boolFromString,
    boolToText,
    wrapTryCatch,
    memoize,
    throttle,
    debounce,
    once,
    selectText,
    copyToClipboard,
    formatTimerLabel,
    describeQuizDifficulty,
    deriveQuestionComplexity,
    summarizePlayer,
    createCsvRow,
    parseNumberList,
    flattenQuestions,
    quizContainsTerm,
    questionContainsTerm,
    createSearchTokens,
  ];

  const helpers = helperEntries.reduce((acc, fn) => {
    acc[fn.name] = fn;
    return acc;
  }, {});

  function listHelpers() {
    return Object.keys(helpers);
  }

  function countHelpers() {
    return listHelpers().length;
  }

  function getHelper(name) {
    return helpers[name];
  }

  global.EntiUtils = Object.freeze({
    ...helpers,
    listHelpers,
    countHelpers,
    getHelper,
  });
})(window);
