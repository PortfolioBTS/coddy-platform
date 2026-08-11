// public/js/pages/parent-courses.js

(async function () {
  const user = await bootPage('parent');
  if (!user) return;

  const switchBox = document.getElementById('child-switch');
  const content = document.getElementById('content');

  let children = [];
  let activeChildId = qs('childId');

  try {
    const data = await api.get('/api/parent/children');
    children = data.children || [];
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    return;
  }

  if (!children.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👪</div>
        <div class="empty-state__title">К аккаунту пока не привязан ни один ребёнок</div>
        <p class="empty-state__text">Обратитесь к учителю или в администрацию школы, чтобы привязать логин ребёнка к вашему аккаунту.</p>
      </div>`;
    return;
  }

  if (!activeChildId || !children.some((c) => c.id === activeChildId)) {
    activeChildId = children[0].id;
  }

  renderSwitch();
  await loadCourses();

  function renderSwitch() {
    if (children.length < 2) { switchBox.innerHTML = ''; return; }
    switchBox.innerHTML = `
      <div class="tab-row">
        ${children.map((c) => `
          <button class="tab-chip ${c.id === activeChildId ? 'is-active' : ''}" type="button" data-child="${c.id}">
            ${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}
          </button>`).join('')}
      </div>`;
    switchBox.querySelectorAll('[data-child]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeChildId = btn.dataset.child;
        renderSwitch();
        await loadCourses();
      });
    });
  }

  async function loadCourses() {
    content.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const { courses } = await api.get(`/api/parent/children/${activeChildId}/courses`);
      render(courses);
    } catch (err) {
      content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    }
  }

  function render(courses) {
    if (!courses.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <div class="empty-state__title">Пока нет доступных курсов</div>
          <p class="empty-state__text">Как только учитель подключит ребёнка к курсу, он появится здесь.</p>
        </div>`;
      return;
    }
    content.innerHTML = `<div class="item-grid">${courses.map(cardHtml).join('')}</div>`;
  }

  function cardHtml(c) {
    const cover = c.coverImage
      ? `<img src="/files/${encodeURIComponent(c.coverImage)}" alt="">`
      : `<div class="item-card__cover--placeholder"><span>КУРС</span></div>`;
    return `
      <a class="item-card" href="/parent/course.html?childId=${encodeURIComponent(activeChildId)}&id=${encodeURIComponent(c.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${escapeHtml(c.title)}</h3>
          <p class="item-card__desc">${escapeHtml(c.description || 'Без описания')}</p>
          <div class="item-card__meta"><span>${c.lessonCount} уроков</span>${c.academicYear ? `<span>${escapeHtml(c.academicYear)}</span>` : ''}</div>
        </div>
      </a>`;
  }
})();
