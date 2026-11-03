const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mouseAvailable = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
// A previously cached HTML document can load the new application module.
if (!document.querySelector('link[data-experience-style]')) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./styles.css?v=20261103-motion-1', import.meta.url).href;
  stylesheet.dataset.experienceStyle = '';
  document.head.append(stylesheet);
}
function ensureChrome(id, tag, markup, className = '') {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement(tag);
    element.id = id;
    element.className = className;
    element.innerHTML = markup;
    element.setAttribute('aria-hidden', 'true');
    if (tag === 'button') { element.type = 'button'; element.tabIndex = -1; element.inert = true; }
    document.body.append(element);
  }
  return element;
}
const topButton = ensureChrome('back-to-top', 'button', '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m5 11 7-7 7 7M12 4v16"/></svg>', 'back-to-top');
const cursor = ensureChrome('custom-cursor', 'div', '<span class="cursor-ring"></span><span class="cursor-dot"></span>');
const cursorDot = cursor.querySelector('.cursor-dot');
const cursorRing = cursor.querySelector('.cursor-ring');
let currentLocale = 'ru';
let revealObserver;
let revealSequence = 0;
const trackedReveals = new Set();
const runningReveals = new Map();

const themeLabel = locale => root.dataset.theme === 'dark'
  ? (locale === 'ru' ? 'Включить светлую тему' : 'Switch to light theme')
  : (locale === 'ru' ? 'Включить тёмную тему' : 'Switch to dark theme');

export function themeToggleMarkup(locale) {
  return `<button class="theme-toggle" type="button" data-theme-toggle aria-label="${themeLabel(locale)}" title="${themeLabel(locale)}" aria-pressed="${root.dataset.theme === 'dark'}"><svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M20.2 14.2A8.6 8.6 0 0 1 9.8 3.8a8.6 8.6 0 1 0 10.4 10.4Z"/></svg><svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg></button>`;
}

function applyTheme(theme, persist = false) {
  root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#181a19' : '#f5f0e8';
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
    button.setAttribute('aria-label', themeLabel(currentLocale));
    button.title = themeLabel(currentLocale);
  });
  if (persist) {
    try { localStorage.setItem('unfold.theme.v1', root.dataset.theme); } catch { /* Keep the selected theme for this visit. */ }
  }
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

function updateTopButton() {
  const visible = window.scrollY > 600;
  root.classList.toggle('has-back-to-top', visible);
  topButton.classList.toggle('is-visible', visible);
  topButton.tabIndex = visible ? 0 : -1;
  topButton.inert = !visible;
  topButton.setAttribute('aria-hidden', String(!visible));
}

export function syncExperienceChrome(locale) {
  currentLocale = locale;
  const label = locale === 'ru' ? 'Вернуться наверх' : 'Back to top';
  topButton.setAttribute('aria-label', label);
  topButton.title = label;
  applyTheme(root.dataset.theme);
  updateTopButton();
  cursor.classList.remove('is-link', 'is-pressed');
}

function finishReveals() {
  revealObserver?.disconnect();
  for (const [element, animation] of runningReveals) {
    element.classList.remove('reveal-waiting');
    animation.cancel();
  }
  runningReveals.clear();
  for (const element of trackedReveals) element.classList.remove('reveal-waiting');
  trackedReveals.clear();
}

function reveal(element) {
  revealObserver?.unobserve(element);
  if (!element.isConnected || reducedMotion.matches) {
    element.classList.remove('reveal-waiting');
    return;
  }
  const base = getComputedStyle(element).transform;
  const transform = base === 'none' ? '' : base;
  const direction = element.dataset.revealDirection === 'right' ? 1 : -1;
  const animation = element.animate([
    { opacity: 0, transform: `translate3d(${direction * 105}vw, 0, 0) ${transform}` },
    { opacity: 1, transform: `translate3d(0, 0, 0) ${transform}` }
  ], {
    duration: innerWidth <= 700 ? 680 : 900,
    delay: Number(element.dataset.revealDelay || 0),
    easing: 'cubic-bezier(.16, 1, .3, 1)',
    fill: 'both'
  });
  runningReveals.set(element, animation);
  const finish = () => {
    element.classList.remove('reveal-waiting');
    if (runningReveals.get(element) === animation) runningReveals.delete(element);
    animation.cancel();
  };
  animation.finished.then(finish, () => element.classList.remove('reveal-waiting'));
}

const revealSelector = [
  '.hero .eyebrow', '.hero h1', '.hero-description', '.hero-cta', '.hero-art', '.hero-note',
  '.section-kicker', '.featured-grid > article', '.breadcrumbs', '.page-heading', '.catalog-heading',
  '.filter-tabs', '.ex-card', '.artist-card', '.search-controls', '.result-count', '.work-card',
  '.list-end', '.exhibition-intro', '.exhibition-banner', '.section-heading', '.artwork-heading',
  '.artwork-full', '.artwork-info', '.related-works > h2', '.more-artists > h2', '.more-artists > div',
  '.artist-detail-heading', '.idea-copy', '.about-collage', '.how-to > h2', '.how-to-grid > article',
  '.sources > h2', '.sources > div', '.about-cta > h2', '.about-cta > a', '.empty-state', '.footer'
].join(',');

export function prepareContentReveal(container, { dynamic = false } = {}) {
  if (!dynamic) {
    finishReveals();
    revealSequence = 0;
  }
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  if (!dynamic || !revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.06, rootMargin: '0px 0px -16px 0px' });
  }
  for (const element of trackedReveals) {
    if (!element.isConnected) {
      revealObserver.unobserve(element);
      trackedReveals.delete(element);
    }
  }
  container.querySelectorAll(revealSelector).forEach(element => {
    if (trackedReveals.has(element) || element.parentElement.closest(revealSelector)) return;
    trackedReveals.add(element);
    const box = element.getBoundingClientRect();
    if (dynamic && box.top < innerHeight && box.bottom > 0) return;
    let direction = revealSequence++ % 2 === 0 ? 'left' : 'right';
    if (element.matches('.hero .eyebrow, .hero h1, .hero-description, .hero-cta, .idea-copy, .artwork-full')) direction = 'left';
    if (element.matches('.hero-art, .hero-note, .about-collage, .artwork-info')) direction = 'right';
    element.dataset.revealDirection = direction;
    element.dataset.revealDelay = String((revealSequence % 3) * 65);
    element.classList.add('reveal-waiting');
    if (box.height === 0 && box.top < innerHeight) reveal(element);
    else revealObserver.observe(element);
  });
}

let pointerFrame = 0;
let pointerX = 0, pointerY = 0;
function hideCursor() {
  root.classList.remove('cursor-visible');
  cursor.classList.remove('is-link', 'is-pressed');
}
document.addEventListener('pointermove', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!mouseAvailable.matches || event.pointerType !== 'mouse' || !target || target.closest('input, textarea, select, [contenteditable="true"], dialog')) {
    hideCursor();
    return;
  }
  pointerX = event.clientX;
  pointerY = event.clientY;
  cursor.classList.toggle('is-link', !!target.closest('a, button, summary, [role="button"]'));
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    cursorRing.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    root.classList.add('cursor-visible');
    pointerFrame = 0;
  });
}, { passive: true });
document.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'), { passive: true });
document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'), { passive: true });
document.addEventListener('pointercancel', hideCursor);
document.addEventListener('pointerout', event => { if (!event.relatedTarget) hideCursor(); });
window.addEventListener('blur', hideCursor);
document.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key === 'Escape') hideCursor(); });
mouseAvailable.addEventListener('change', hideCursor);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishReveals(); });
document.addEventListener('click', event => {
  if (event.target.closest('[data-menu]')) hideCursor();
  if (event.target.closest('[data-theme-toggle]')) applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  if (event.target.closest('#back-to-top')) scrollToTop();
});
let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { updateTopButton(); scrollFrame = 0; });
}, { passive: true });
window.addEventListener('storage', event => {
  if (event.key === 'unfold.theme.v1') applyTheme(event.newValue);
});
let initialTheme = root.dataset.theme;
if (!initialTheme) { try { initialTheme = localStorage.getItem('unfold.theme.v1'); } catch { /* Default to light. */ } }
applyTheme(initialTheme);
requestAnimationFrame(() => root.classList.add('theme-ready'));
