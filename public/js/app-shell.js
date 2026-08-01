// public/js/app-shell.js

// Проверяет сессию через /api/me. Если не авторизован — уводит на /login.html.
// Если авторизован, но роль не подходит странице — уводит на его собственный раздел.
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

  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
    return null;
  }

  renderNav(user);
  return user;
}

function renderNav(user) {
  const el = document.getElementById('app-nav');
  if (!el) return;

  const path = window.location.pathname;
  const links = user.role === 'teacher'
    ? [
        ['/teacher/courses.html', 'Курсы'],
        ['/teacher/students.html', 'Ученики'],
        ['/teacher/shop.html', 'Магазин'],
        ['/teacher/orders.html', 'Заказы'],
      ]
    : [
        ['/student/courses.html', 'Мои курсы'],
        ['/student/shop.html', 'Магазин'],
      ];

  const linksHtml = links
    .map(([href, label]) => `<a class="app-nav__link ${path === href ? 'is-active' : ''}" href="${href}">${label}</a>`)
    .join('');

  const profileHref = user.role === 'teacher' ? '/teacher/profile.html' : '/student/profile.html';
  const homeHref = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';

  el.innerHTML = `
    <div class="app-nav__inner">
      <a class="app-nav__brand" href="${homeHref}">CODDYWORKS<b>.</b></a>
      <div class="app-nav__links">${linksHtml}</div>
      <div class="app-nav__right">
        <span class="app-nav__role">${user.role === 'teacher' ? 'Учитель' : 'Ученик'}</span>
        <a class="app-nav__user" href="${profileHref}">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</a>
        <button class="app-nav__logout" type="button" id="logout-btn">Выйти</button>
      </div>
    </div>`;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await api.postJson('/api/logout'); } catch (e) { /* всё равно уходим на логин */ }
    window.location.href = '/login.html';
  });
}
