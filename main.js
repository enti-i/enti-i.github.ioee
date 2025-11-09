const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');
const yearEl = document.getElementById('year');

if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navList.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.tagName === 'A') {
      navList.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
