const nav = document.querySelector('.main-nav');
const navToggle = document.querySelector('.main-nav__toggle');
const navList = document.querySelector('.main-nav__list');
const yearEl = document.getElementById('year');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (nav && navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });

  navList.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    });
  });
}

// EntiWord
const wordEditor = document.getElementById('word-editor');
const wordToolbarButtons = document.querySelectorAll('.word-toolbar button[data-command]');
const wordFontSelect = document.querySelector('.word-toolbar select[data-command="fontSize"]');
const wordClearButton = document.getElementById('word-clear');
const wordExportButton = document.getElementById('word-export');
const WORD_STORAGE_KEY = 'entiword-document';

function safeSetItem(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Speichern im lokalen Speicher nicht möglich:', error);
  }
}

function safeGetItem(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Lesen aus dem lokalen Speicher nicht möglich:', error);
    return null;
  }
}

function saveWordContent() {
  if (!wordEditor) return;
  safeSetItem(WORD_STORAGE_KEY, wordEditor.innerHTML);
}

function loadWordContent() {
  if (!wordEditor) return;
  const saved = safeGetItem(WORD_STORAGE_KEY);
  if (saved) {
    wordEditor.innerHTML = saved;
  }
}

function execWordCommand(command, value = null) {
  if (typeof document.execCommand !== 'function') return;
  document.execCommand(command, false, value);
  wordEditor.focus();
  saveWordContent();
}

if (wordEditor) {
  loadWordContent();

  wordToolbarButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      const value = button.dataset.value || null;
      execWordCommand(command, value);
    });
  });

  if (wordFontSelect) {
    wordFontSelect.addEventListener('change', (event) => {
      const value = event.target.value;
      execWordCommand('fontSize', value);
    });
  }

  document.querySelectorAll('.word-toolbar input[type="color"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const target = event.target;
      const command = target.dataset.command;
      execWordCommand(command, target.value);
    });
  });

  wordEditor.addEventListener('input', saveWordContent);

  if (wordClearButton) {
    wordClearButton.addEventListener('click', () => {
      wordEditor.innerHTML = '<p>Neues Dokument. Beginne mit dem Schreiben &hellip;</p>';
      saveWordContent();
    });
  }

  if (wordExportButton) {
    wordExportButton.addEventListener('click', () => {
      const blob = new Blob([
        `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>EntiWord Dokument</title></head><body>${wordEditor.innerHTML}</body></html>`
      ], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'EntiWord-Dokument.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}

// EntiPoint
const pointData = {
  slides: [],
  activeId: null,
};

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSlide({ title = 'Neue Folie', bullets = ['Erste Stichpunkt'], background = '#1d1b4b', notes = '' } = {}) {
  return {
    id: createId(),
    title,
    bullets,
    background,
    notes,
  };
}

function initPoint() {
  const listEl = document.getElementById('point-slide-list');
  const titleEl = document.getElementById('point-title');
  const bulletsEl = document.getElementById('point-bullets');
  const backgroundEl = document.getElementById('point-background');
  const notesEl = document.getElementById('point-notes');
  const previewEl = document.getElementById('point-preview');
  const previewNotesEl = document.getElementById('point-preview-notes');
  const addSlideButton = document.getElementById('point-add-slide');
  const duplicateSlideButton = document.getElementById('point-duplicate-slide');
  const deleteSlideButton = document.getElementById('point-delete-slide');
  const startButton = document.getElementById('point-start');
  const exportButton = document.getElementById('point-export');
  const presenter = document.querySelector('.point-presenter');
  const presenterSlide = presenter?.querySelector('.point-presenter__slide');
  const presenterNotes = presenter?.querySelector('.point-presenter__notes p');
  const presenterControls = presenter?.querySelector('.point-presenter__controls');

  if (!listEl || !titleEl || !bulletsEl || !backgroundEl || !notesEl || !previewEl) {
    return;
  }

  function setActiveSlide(id) {
    pointData.activeId = id;
    render();
  }

  function renderSlides() {
    listEl.innerHTML = '';
    pointData.slides.forEach((slide) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = slide.title;
      button.classList.toggle('is-active', slide.id === pointData.activeId);
      button.addEventListener('click', () => setActiveSlide(slide.id));
      listEl.appendChild(button);
    });
  }

  function renderEditor() {
    const slide = pointData.slides.find((item) => item.id === pointData.activeId);
    if (!slide) return;
    titleEl.value = slide.title;
    bulletsEl.value = slide.bullets.join('\n');
    backgroundEl.value = slide.background;
    notesEl.value = slide.notes;
  }

  function renderPreview() {
    const slide = pointData.slides.find((item) => item.id === pointData.activeId);
    if (!slide) return;

    previewEl.style.background = slide.background;
    previewEl.innerHTML = '';

    const heading = document.createElement('h3');
    heading.textContent = slide.title;
    previewEl.appendChild(heading);

    const list = document.createElement('ul');
    slide.bullets.filter(Boolean).forEach((bullet) => {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    });

    if (list.children.length) {
      previewEl.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'Füge Stichpunkte hinzu, um deine Story zu erzählen.';
      previewEl.appendChild(empty);
    }

    if (previewNotesEl) {
      previewNotesEl.textContent = slide.notes || 'Keine Notizen vorhanden.';
    }
  }

  function render() {
    renderSlides();
    renderEditor();
    renderPreview();
    persistSlides();
  }

  function updateActiveSlide(updater) {
    const slide = pointData.slides.find((item) => item.id === pointData.activeId);
    if (!slide) return;
    updater(slide);
    render();
  }

  function addSlide(slide = createSlide()) {
    pointData.slides.push(slide);
    pointData.activeId = slide.id;
    render();
  }

  function duplicateSlide() {
    const slide = pointData.slides.find((item) => item.id === pointData.activeId);
    if (!slide) return;
    const clone = createSlide({
      title: `${slide.title} (Kopie)`,
      bullets: [...slide.bullets],
      background: slide.background,
      notes: slide.notes,
    });
    const currentIndex = pointData.slides.findIndex((item) => item.id === slide.id);
    pointData.slides.splice(currentIndex + 1, 0, clone);
    pointData.activeId = clone.id;
    render();
  }

  function deleteSlide() {
    if (pointData.slides.length <= 1) return;
    const index = pointData.slides.findIndex((item) => item.id === pointData.activeId);
    if (index === -1) return;
    pointData.slides.splice(index, 1);
    const nextIndex = Math.max(0, index - 1);
    pointData.activeId = pointData.slides[nextIndex]?.id || null;
    render();
  }

  function exportSlides() {
    const exportData = pointData.slides.map((slide) => ({
      title: slide.title,
      bullets: slide.bullets,
      background: slide.background,
      notes: slide.notes,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EntiPoint-Praesentation.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function presentSlides() {
    if (!presenter || !presenterSlide || !presenterNotes) return;
    let currentIndex = pointData.slides.findIndex((slide) => slide.id === pointData.activeId);
    if (currentIndex === -1) currentIndex = 0;

    function renderPresenter(index) {
      const slide = pointData.slides[index];
      if (!slide) return;
      presenterSlide.style.background = slide.background;
      presenterSlide.innerHTML = '';

      const title = document.createElement('h2');
      title.textContent = slide.title;
      presenterSlide.appendChild(title);

      const list = document.createElement('ul');
      slide.bullets.filter(Boolean).forEach((bullet) => {
        const li = document.createElement('li');
        li.textContent = bullet;
        list.appendChild(li);
      });

      if (list.children.length) {
        presenterSlide.appendChild(list);
      }

      presenterNotes.textContent = slide.notes || 'Keine Notizen';
    }

    function closePresenter() {
      presenter.setAttribute('hidden', '');
      presenter.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onKeyDown);
      if (presenterControls) {
        presenterControls.onclick = null;
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closePresenter();
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        currentIndex = Math.min(pointData.slides.length - 1, currentIndex + 1);
        renderPresenter(currentIndex);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        currentIndex = Math.max(0, currentIndex - 1);
        renderPresenter(currentIndex);
      }
    }

    if (presenterControls) {
      presenterControls.onclick = (event) => {
        const target = event.target.closest('button[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (action === 'close') {
          closePresenter();
        } else if (action === 'next') {
          currentIndex = Math.min(pointData.slides.length - 1, currentIndex + 1);
          renderPresenter(currentIndex);
        } else if (action === 'prev') {
          currentIndex = Math.max(0, currentIndex - 1);
          renderPresenter(currentIndex);
        }
      };
    }

    renderPresenter(currentIndex);
    presenter.removeAttribute('hidden');
    presenter.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onKeyDown);
  }

  function persistSlides() {
    const payload = pointData.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      bullets: slide.bullets,
      background: slide.background,
      notes: slide.notes,
    }));
    safeSetItem(
      'entipoint-slides',
      JSON.stringify({
        slides: payload,
        activeId: pointData.activeId,
      })
    );
  }

  function restoreSlides() {
    try {
      const stored = safeGetItem('entipoint-slides');
      if (!stored) return false;
      const data = JSON.parse(stored);
      if (!Array.isArray(data.slides) || !data.slides.length) return false;
      pointData.slides = data.slides.map((slide) => ({
        ...slide,
        id: slide.id || createId(),
      }));
      pointData.activeId = data.activeId && pointData.slides.find((slide) => slide.id === data.activeId) ? data.activeId : pointData.slides[0].id;
      return true;
    } catch (error) {
      console.warn('Konnte EntiPoint Daten nicht laden:', error);
      return false;
    }
  }

  if (!restoreSlides()) {
    addSlide(createSlide({ title: 'Willkommen bei EntiPoint', bullets: ['Plane deine Story', 'Füge Stichpunkte hinzu', 'Präsentiere live'], notes: 'Nutze die Buttons, um Folien zu verwalten.' }));
  } else {
    render();
  }

  addSlideButton?.addEventListener('click', () => addSlide(createSlide({ title: `Folie ${pointData.slides.length + 1}`, bullets: ['Neuer Punkt'], notes: '' })));
  duplicateSlideButton?.addEventListener('click', duplicateSlide);
  deleteSlideButton?.addEventListener('click', deleteSlide);

  titleEl.addEventListener('input', (event) => {
    updateActiveSlide((slide) => {
      slide.title = event.target.value || 'Unbenannte Folie';
    });
  });

  bulletsEl.addEventListener('input', (event) => {
    updateActiveSlide((slide) => {
      slide.bullets = event.target.value.split('\n');
    });
  });

  backgroundEl.addEventListener('input', (event) => {
    updateActiveSlide((slide) => {
      slide.background = event.target.value;
    });
  });

  notesEl.addEventListener('input', (event) => {
    updateActiveSlide((slide) => {
      slide.notes = event.target.value;
    });
  });

  startButton?.addEventListener('click', presentSlides);
  exportButton?.addEventListener('click', exportSlides);

  render();
}

initPoint();

// Switch between apps
const switcherButtons = document.querySelectorAll('.switcher-button');
const apps = document.querySelectorAll('.app');

switcherButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.target;
    if (!targetId) return;

    switcherButtons.forEach((other) => {
      const active = other === button;
      other.classList.toggle('is-active', active);
      other.setAttribute('aria-selected', String(active));
    });

    apps.forEach((app) => {
      const match = app.id === targetId;
      if (match) {
        app.classList.add('app--active');
        app.removeAttribute('hidden');
      } else {
        app.classList.remove('app--active');
        app.setAttribute('hidden', '');
      }
    });
  });
});

// Support form feedback
const supportForm = document.querySelector('.support-form');
const feedback = document.querySelector('.form-feedback');

if (supportForm && feedback) {
  supportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(supportForm);
    const name = formData.get('name');
    const email = formData.get('email');

    if (!name || !email) {
      feedback.textContent = 'Bitte fülle Name und E-Mail aus.';
      return;
    }

    feedback.textContent = 'Vielen Dank! Wir melden uns in Kürze mit Zugangsdaten.';
    supportForm.reset();
  });
}
