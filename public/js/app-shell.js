// public/js/app-shell.js

// Проверяет сессию через /api/me. Если не авторизован — уводит на /login.html.
// Если авторизован, но роль не подходит странице — уводит на его собственный раздел
// (директор имеет полный доступ ко всем разделам).
// При успехе отрисовывает навигацию и возвращает текущего пользователя.
async function bootPage(requiredRole) {
  let user;
  try {
    const data = await api.get('/api/me');
    user = data.user;
  } catch (e) {
    window.location.href = '/login.html';
    return null;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'director') {
    window.location.href = homeHrefForRole(user.role);
    return null;
  }

  renderNav(user);
  return user;
}

function homeHrefForRole(role) {
  if (role === 'student') return '/student/courses.html';
  if (role === 'parent') return '/parent/courses.html';
  return '/teacher/courses.html';
}

function roleLabel(user) {
  if (user.role === 'director') return 'Директор';
  if (user.role === 'teacher') return 'Учитель';
  if (user.role === 'parent') return 'Родитель';
  return 'Ученик';
}

function renderNav(user) {
  const el = document.getElementById('app-nav');
  if (!el) return;

  const path = window.location.pathname;

  const links = user.role === 'director'
    ? [
        ['/teacher/courses.html', 'Курсы'],
        ['/teacher/students.html', 'Ученики'],
        ['/director/certificates.html', 'Сертификаты'],
        ['/director/teachers.html', 'Педагоги'],
        ['/director/notifications.html', 'Оповещения'],
        ['/teacher/shop.html', 'Магазин'],
        ['/teacher/orders.html', 'Заказы'],
        ['/teacher/feedback.html', 'Обратная связь'],
        ['/instructions.html', 'Инструкции'],
      ]
    : user.role === 'teacher'
      ? [
          ['/teacher/courses.html', 'Курсы'],
          ['/teacher/students.html', 'Ученики'],
          ['/teacher/shop.html', 'Магазин'],
          ['/teacher/orders.html', 'Заказы'],
          ['/teacher/feedback.html', 'Обратная связь'],
          ['/instructions.html', 'Инструкции'],
        ]
      : user.role === 'parent'
        ? [
            ['/parent/courses.html', 'Курсы детей'],
            ['/instructions.html', 'Инструкции'],
            ['/parent/feedback.html', 'Обратная связь'],
          ]
        : [
            ['/student/courses.html', 'Мои курсы'],
            ['/student/shop.html', 'Магазин'],
            ['/instructions.html', 'Инструкции'],
          ];

  const linksHtml = links
    .map(([href, label]) => `<a class="app-nav__link ${path === href ? 'is-active' : ''}" href="${href}">${label}</a>`)
    .join('');

  const profileHref = user.role === 'director'
    ? '/director/profile.html'
    : user.role === 'teacher' ? '/teacher/profile.html' : user.role === 'parent' ? '/parent/profile.html' : '/student/profile.html';
  const homeHref = homeHrefForRole(user.role);

  el.innerHTML = `
    <div class="app-nav__inner">
      <a class="app-nav__brand" href="${homeHref}">CODDYWORKS<b>.</b></a>
      <div class="app-nav__links">${linksHtml}</div>
      <div class="app-nav__right">
        <button class="app-nav__burger" type="button" id="nav-burger" aria-label="Открыть меню" aria-expanded="false">☰</button>
        <span class="app-nav__role">${roleLabel(user)}</span>
        <button class="app-nav__bell" type="button" id="notif-bell" aria-label="Уведомления">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="app-nav__bell-badge" id="notif-bell-badge" hidden></span>
        </button>
        <a class="app-nav__user" href="${profileHref}">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</a>
        <button class="app-nav__logout" type="button" id="logout-btn">Выйти</button>
      </div>
    </div>`;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await api.postJson('/api/logout'); } catch (e) { /* всё равно уходим на логин */ }
    window.location.href = '/login.html';
  });

  // Мобильное гамбургер-меню: разворачивает/сворачивает ссылки, закрывается
  // по выбору пункта или клику вне меню.
  const burger = document.getElementById('nav-burger');
  if (burger) {
    const setOpen = (open) => {
      el.classList.toggle('app-nav--open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!el.classList.contains('app-nav--open'));
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('.app-nav__link')) setOpen(false);
    });
    document.addEventListener('click', (e) => {
      if (!el.contains(e.target)) setOpen(false);
    });
  }

  initNotifications(user);
}

// ---------- Уведомления: колокольчик, всплывающее окно, список ----------

let notifState = { list: [], unreadCount: 0 };
let toastQueue = [];
let toastShown = false;

function ensureNotifContainers() {
  if (!document.getElementById('notif-panel')) {
    const p = document.createElement('div');
    p.id = 'notif-panel';
    p.className = 'notif-panel';
    document.body.appendChild(p);
  }
  if (!document.getElementById('notif-toast')) {
    const t = document.createElement('div');
    t.id = 'notif-toast';
    t.className = 'notif-toast';
    document.body.appendChild(t);
  }
}

function initNotifications(user) {
  const bell = document.getElementById('notif-bell');
  if (!bell) return;

  ensureNotifContainers();

  loadNotifications();

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    if (bell.contains(e.target)) {
      panel.classList.toggle('notif-panel--open');
      return;
    }
    if (panel && !panel.contains(e.target)) {
      panel.classList.remove('notif-panel--open');
    }
  });

  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'notif-clear-all') {
      try { await api.postJson('/api/notifications/clear'); } catch (_) {}
      await loadNotifications();
    }
  });

  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'notif-toast-close') {
      const toast = e.target.closest('.notif-toast');
      const id = toast && toast.dataset.id;
      if (id) {
        try { await api.postJson(`/api/notifications/${id}/read`); } catch (_) {}
      }
      dismissCurrentToast();
    }
  });

  // Раз в минуту подтягиваем свежие уведомления.
  setInterval(loadNotifications, 60000);
}

async function loadNotifications() {
  try {
    const data = await api.get('/api/notifications');
    notifState.list = data.notifications || [];
    notifState.unreadCount = data.unreadCount || 0;
  } catch (_) {
    notifState.list = [];
    notifState.unreadCount = 0;
  }
  renderBadge();
  renderPanel();
  maybeShowToast();
}

function renderBadge() {
  const badge = document.getElementById('notif-bell-badge');
  if (!badge) return;
  const n = notifState.unreadCount;
  badge.hidden = n <= 0;
  badge.textContent = n > 99 ? '99+' : String(n);
}

function renderPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const list = notifState.list;

  panel.innerHTML = list.length
    ? `
      <div class="notif-panel__head">
        <span>Уведомления</span>
        <button class="btn btn--sm" type="button" id="notif-clear-all">Удалить все</button>
      </div>
      ${list.map((n) => `
        <div class="notif-item">
          <p class="notif-item__title">${escapeHtml(n.title)}</p>
          <p class="notif-item__text">${escapeHtml(n.message)}</p>
          <p class="notif-item__date">${formatDateTime(n.createdAt)}</p>
        </div>`).join('')}`
    : `<div class="notif-panel__empty">Уведомлений нет.</div>`;
}

// Показываем непрочитанные уведомления по одному, справа-снизу.
function maybeShowToast() {
  toastQueue = notifState.list.filter((n) => !n.read && !n.removed);
  if (!toastShown) showNextToast();
}

function showNextToast() {
  const toast = document.getElementById('notif-toast');
  if (!toast) return;
  if (!toastQueue.length) { toastShown = false; return; }

  const n = toastQueue.shift();
  toastShown = true;
  toast.dataset.id = n.id;
  toast.innerHTML = `
    <div class="notif-toast__body">
      <p class="notif-toast__title">${escapeHtml(n.title)}</p>
      <p class="notif-toast__text">${escapeHtml(n.message)}</p>
    </div>
    <button class="notif-toast__close" type="button" id="notif-toast-close" aria-label="Закрыть">✕</button>`;
  toast.classList.add('notif-toast--visible');
}

function dismissCurrentToast() {
  const toast = document.getElementById('notif-toast');
  if (!toast) return;
  toast.classList.remove('notif-toast--visible');

  const id = toast.dataset.id;
  const item = notifState.list.find((x) => x.id === id);
  if (item) item.read = true;
  notifState.unreadCount = Math.max(0, notifState.unreadCount - 1);
  renderBadge();
  renderPanel();

  setTimeout(showNextToast, 300);
}
