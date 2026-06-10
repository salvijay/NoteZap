/* ============================================================
   StudyTrack – script.js
   Features: Add / Edit / Delete / Complete homework, Dashboard
   stats, Progress bar, Search & Filter & Sort, Dark mode,
   Motivational quotes, PWA install prompt, LocalStorage persist
   ============================================================ */

'use strict';

/* ── Motivational Quotes ── */
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
];

/* ── Storage Key ── */
const STORAGE_KEY = 'studytrack_homework';
const THEME_KEY   = 'studytrack_theme';
const STREAK_KEY  = 'studytrack_streak';

/* ── State ── */
let homeworkList = [];
let editingId    = null;
let deferredInstallPrompt = null;
let lastQuoteIndex = -1;

/* ── DOM References ── */
const body            = document.getElementById('app-body');
const darkToggle      = document.getElementById('dark-mode-toggle');
const statTotal       = document.getElementById('stat-total');
const statCompleted   = document.getElementById('stat-completed');
const statPending     = document.getElementById('stat-pending');
const statStreak      = document.getElementById('stat-streak');
const progressFill    = document.getElementById('progress-bar-fill');
const progressPct     = document.getElementById('progress-percentage');
const progressTrack   = progressFill?.closest('[role="progressbar"]');
const inputSubject    = document.getElementById('input-subject');
const inputTitle      = document.getElementById('input-title');
const inputDesc       = document.getElementById('input-description');
const inputDueDate    = document.getElementById('input-due-date');
const inputPriority   = document.getElementById('input-priority');
const btnAdd          = document.getElementById('btn-add-homework');
const btnClear        = document.getElementById('btn-clear-form');
const inputSearch     = document.getElementById('input-search');
const filterSubject   = document.getElementById('filter-subject');
const sortDueDate     = document.getElementById('sort-due-date');
const hwList          = document.getElementById('homework-list');
const listCount       = document.getElementById('list-count');
const emptyState      = document.getElementById('empty-state');
const quoteText       = document.getElementById('quote-text');
const quoteAuthor     = document.getElementById('quote-author');
const btnNewQuote     = document.getElementById('btn-new-quote');
const installSection  = document.getElementById('install-section');
const btnInstall      = document.getElementById('btn-install-app');

/* ============================================================
   INIT
   ============================================================ */
function init() {
  loadHomework();
  loadTheme();
  setMinDueDate();
  renderAll();
  showRandomQuote(true);
  bindEvents();
}

/* ============================================================
   PERSISTENCE
   ============================================================ */
function loadHomework() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    homeworkList = raw ? JSON.parse(raw) : [];
  } catch {
    homeworkList = [];
  }
}

function saveHomework() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(homeworkList));
}

/* ============================================================
   THEME
   ============================================================ */
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  applyTheme(isDark);
}

function applyTheme(dark) {
  body.classList.toggle('dark-mode', dark);
  body.classList.toggle('light-mode', !dark);
  darkToggle.setAttribute('aria-pressed', String(dark));
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(!body.classList.contains('dark-mode'));
}

/* ============================================================
   FORM HELPERS
   ============================================================ */
function setMinDueDate() {
  if (inputDueDate) {
    inputDueDate.min = new Date().toISOString().split('T')[0];
  }
}

function getFormValues() {
  return {
    subject:     inputSubject.value.trim(),
    title:       inputTitle.value.trim(),
    description: inputDesc.value.trim(),
    dueDate:     inputDueDate.value,
    priority:    inputPriority.value,
  };
}

function populateForm(hw) {
  inputSubject.value  = hw.subject;
  inputTitle.value    = hw.title;
  inputDesc.value     = hw.description || '';
  inputDueDate.value  = hw.dueDate;
  inputPriority.value = hw.priority;
}

function clearForm() {
  inputSubject.value  = '';
  inputTitle.value    = '';
  inputDesc.value     = '';
  inputDueDate.value  = '';
  inputPriority.value = '';
  editingId = null;
  btnAdd.textContent  = '➕ Add Homework';
  btnAdd.setAttribute('aria-label', 'Add homework to your list');
  inputSubject.focus();
}

function validateForm(values) {
  if (!values.subject)  { flash(inputSubject,  'Subject is required.');      return false; }
  if (!values.title)    { flash(inputTitle,    'Homework title is required.'); return false; }
  if (!values.dueDate)  { flash(inputDueDate,  'Due date is required.');      return false; }
  if (!values.priority) { flash(inputPriority, 'Please select a priority.');  return false; }
  return true;
}

/* Briefly highlights an invalid field */
function flash(el, message) {
  el.focus();
  el.style.borderColor = 'var(--danger)';
  el.setAttribute('aria-invalid', 'true');
  el.title = message;
  setTimeout(() => {
    el.style.borderColor = '';
    el.removeAttribute('aria-invalid');
    el.title = '';
  }, 2000);
}

/* ============================================================
   CRUD OPERATIONS
   ============================================================ */
function addHomework() {
  const values = getFormValues();
  if (!validateForm(values)) return;

  const hw = {
    id:          crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    subject:     values.subject,
    title:       values.title,
    description: values.description,
    dueDate:     values.dueDate,
    priority:    values.priority,
    completed:   false,
    createdAt:   new Date().toISOString(),
  };

  homeworkList.unshift(hw);
  saveHomework();
  clearForm();
  renderAll();
  scrollToList();
}

function updateHomework() {
  const values = getFormValues();
  if (!validateForm(values)) return;

  const hw = homeworkList.find(h => h.id === editingId);
  if (!hw) return;

  hw.subject     = values.subject;
  hw.title       = values.title;
  hw.description = values.description;
  hw.dueDate     = values.dueDate;
  hw.priority    = values.priority;

  saveHomework();
  clearForm();
  renderAll();
}

function deleteHomework(id) {
  if (!confirm('Delete this homework? This cannot be undone.')) return;
  homeworkList = homeworkList.filter(h => h.id !== id);
  saveHomework();
  renderAll();
}

function toggleComplete(id) {
  const hw = homeworkList.find(h => h.id === id);
  if (!hw) return;
  hw.completed = !hw.completed;
  if (hw.completed) hw.completedAt = new Date().toISOString();
  else delete hw.completedAt;
  saveHomework();
  updateStreak();
  renderAll();
}

function startEdit(id) {
  const hw = homeworkList.find(h => h.id === id);
  if (!hw) return;
  editingId = id;
  populateForm(hw);
  btnAdd.textContent = '💾 Save Changes';
  btnAdd.setAttribute('aria-label', 'Save changes to homework');
  document.getElementById('add-homework').scrollIntoView({ behavior: 'smooth', block: 'start' });
  inputSubject.focus();
}

/* ============================================================
   STREAK LOGIC
   ============================================================ */
function updateStreak() {
  const today = new Date().toDateString();
  let { streak = 0, lastDate = null } = getStreakData();

  const completedToday = homeworkList.some(hw => {
    if (!hw.completedAt) return false;
    return new Date(hw.completedAt).toDateString() === today;
  });

  if (completedToday) {
    if (lastDate === today) {
      // already counted
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      streak = (lastDate === yesterday.toDateString()) ? streak + 1 : 1;
      lastDate = today;
    }
  }

  localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastDate }));
  return streak;
}

function getStreakData() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY)) || {};
  } catch {
    return {};
  }
}

/* ============================================================
   RENDER
   ============================================================ */
function renderAll() {
  updateDashboard();
  updateSubjectFilter();
  renderHomeworkList();
}

function updateDashboard() {
  const total     = homeworkList.length;
  const completed = homeworkList.filter(h => h.completed).length;
  const pending   = total - completed;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);
  const { streak = 0 } = getStreakData();

  statTotal.textContent     = total;
  statCompleted.textContent = completed;
  statPending.textContent   = pending;
  statStreak.textContent    = `${streak} day${streak !== 1 ? 's' : ''}`;

  progressFill.style.width = `${pct}%`;
  progressPct.textContent  = `${pct}%`;
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', pct);
  }
}

function updateSubjectFilter() {
  const subjects   = [...new Set(homeworkList.map(h => h.subject))].sort();
  const current    = filterSubject.value;

  // Remove all options except "All Subjects"
  while (filterSubject.options.length > 1) {
    filterSubject.remove(1);
  }

  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    filterSubject.appendChild(opt);
  });

  // Restore selection if still valid
  if ([...filterSubject.options].some(o => o.value === current)) {
    filterSubject.value = current;
  }
}

function getFilteredSorted() {
  const query   = (inputSearch.value || '').toLowerCase();
  const subject = filterSubject.value;
  const sort    = sortDueDate.value;

  let list = homeworkList.filter(hw => {
    const matchSearch  = !query ||
      hw.title.toLowerCase().includes(query) ||
      hw.subject.toLowerCase().includes(query);
    const matchSubject = subject === 'all' || hw.subject === subject;
    return matchSearch && matchSubject;
  });

  if (sort === 'asc') {
    list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  } else if (sort === 'desc') {
    list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  } else if (sort === 'priority') {
    const ORDER = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => (ORDER[a.priority] ?? 9) - (ORDER[b.priority] ?? 9));
  }

  return list;
}

function renderHomeworkList() {
  const list = getFilteredSorted();

  // Clear existing cards (keep the placeholder removed)
  hwList.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    listCount.textContent = '';
  } else {
    emptyState.classList.add('hidden');
    listCount.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;
    list.forEach(hw => hwList.appendChild(createCard(hw)));
  }
}

/* ── Card Factory ── */
function createCard(hw) {
  const isOverdue  = !hw.completed && new Date(hw.dueDate) < new Date(new Date().toDateString());
  const dueDateStr = formatDate(hw.dueDate);
  const priorityLabel = hw.priority
    ? hw.priority.charAt(0).toUpperCase() + hw.priority.slice(1)
    : '';
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[hw.priority] || '';

  const article = document.createElement('article');
  article.className = `homework-card priority-${hw.priority}${hw.completed ? ' completed' : ''}`;
  article.setAttribute('role', 'listitem');
  article.setAttribute('data-id', hw.id);
  article.setAttribute('aria-label', `${hw.title} – ${hw.subject}`);

  article.innerHTML = `
    <div class="card-header">
      <span class="card-subject badge">${escHtml(hw.subject)}</span>
      <span class="card-priority badge badge--${hw.priority}">${priorityEmoji} ${priorityLabel}</span>
      ${isOverdue ? '<span class="badge badge--high">⚠️ Overdue</span>' : ''}
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(hw.title)}</h3>
      ${hw.description ? `<p class="card-description">${escHtml(hw.description)}</p>` : ''}
    </div>
    <div class="card-footer">
      <time class="card-due-date" datetime="${hw.dueDate}">📅 Due: ${dueDateStr}</time>
      <span class="card-status badge ${hw.completed ? 'badge--done' : 'badge--pending'}">
        ${hw.completed ? '✅ Done' : '⏳ Pending'}
      </span>
    </div>
    <div class="card-actions">
      <button class="btn btn-sm btn-success" data-action="complete" data-id="${hw.id}"
        aria-label="${hw.completed ? 'Mark as pending' : 'Mark as complete'}: ${escHtml(hw.title)}">
        ${hw.completed ? '↩ Undo' : '✔ Complete'}
      </button>
      <button class="btn btn-sm btn-warning" data-action="edit" data-id="${hw.id}"
        aria-label="Edit ${escHtml(hw.title)}">
        ✏️ Edit
      </button>
      <button class="btn btn-sm btn-danger" data-action="delete" data-id="${hw.id}"
        aria-label="Delete ${escHtml(hw.title)}">
        🗑 Delete
      </button>
    </div>
  `;

  return article;
}

/* ── Date Formatter ── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00'); // force local timezone
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── HTML escaper ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Scroll helper ── */
function scrollToList() {
  document.getElementById('homework-list-section')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   QUOTES
   ============================================================ */
function showRandomQuote(skipTransition = false) {
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); }
  while (idx === lastQuoteIndex && QUOTES.length > 1);
  lastQuoteIndex = idx;

  const { text, author } = QUOTES[idx];

  if (skipTransition) {
    quoteText.textContent   = `"${text}"`;
    quoteAuthor.textContent = author;
    return;
  }

  const card = quoteText.closest('.quote-card');
  card.style.opacity    = '0';
  card.style.transform  = 'translateY(6px)';
  card.style.transition = 'opacity .25s ease, transform .25s ease';

  setTimeout(() => {
    quoteText.textContent   = `"${text}"`;
    quoteAuthor.textContent = author;
    card.style.opacity   = '1';
    card.style.transform = 'translateY(0)';
  }, 250);
}

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bindEvents() {
  /* Theme toggle */
  darkToggle?.addEventListener('click', toggleTheme);

  /* Add / Save homework */
  btnAdd?.addEventListener('click', () => {
    if (editingId) updateHomework();
    else addHomework();
  });

  /* Clear form */
  btnClear?.addEventListener('click', clearForm);

  /* Keyboard shortcut: Enter in form fields triggers add */
  [inputSubject, inputTitle, inputDueDate].forEach(el => {
    el?.addEventListener('keydown', e => {
      if (e.key === 'Enter') btnAdd.click();
    });
  });

  /* Homework list actions (event delegation) */
  hwList?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'complete') toggleComplete(id);
    else if (action === 'edit')    startEdit(id);
    else if (action === 'delete')  deleteHomework(id);
  });

  /* Search & Filter & Sort */
  inputSearch?.addEventListener('input',  renderHomeworkList);
  filterSubject?.addEventListener('change', renderHomeworkList);
  sortDueDate?.addEventListener('change', renderHomeworkList);

  /* New quote */
  btnNewQuote?.addEventListener('click', () => showRandomQuote());

  /* PWA Install */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installSection?.classList.remove('hidden');
  });

  btnInstall?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') installSection?.classList.add('hidden');
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    installSection?.classList.add('hidden');
    deferredInstallPrompt = null;
  });
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);