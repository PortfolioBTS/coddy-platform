// public/js/pages/student-courses.js

(async function () {
  const user = await bootPage('student');
  if (!user) return;

  const content = document.getElementById('content');

  try {
    const { courses } = await api.get('/api/student/courses');
    render(courses);
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
  }

  function render(courses) {
    if (!courses.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <div class="empty-state__title">Пока нет доступных курсов</div>
          <p class="empty-state__text">Как только учитель подключит вас к курсу, он появится здесь.</p>
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
      <a class="item-card" href="/student/course.html?id=${encodeURIComponent(c.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${escapeHtml(c.title)}</h3>
          <p class="item-card__desc">${escapeHtml(c.description || 'Без описания')}</p>
          <div class="item-card__meta"><span>${c.lessonCount} уроков</span>${c.academicYear ? `<span>${escapeHtml(c.academicYear)}</span>` : ''}</div>
        </div>
      </a>`;
  }
})();
