// public/js/pages/teacher-courses.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const content = document.getElementById('content');

  try {
    const { courses } = await api.get('/api/teacher/courses');
    render(courses);
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
  }

  function render(courses) {
    if (!courses.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📚</div>
          <div class="empty-state__title">Курсов пока нет</div>
          <p class="empty-state__text">Создайте первый курс — добавьте учеников и начните публиковать уроки.</p>
          <a class="btn btn--red" href="/teacher/course-form.html">+ Создать курс</a>
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
      <a class="item-card" href="/teacher/course.html?id=${encodeURIComponent(c.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${escapeHtml(c.title)}</h3>
          <p class="item-card__desc">${escapeHtml(c.description || 'Без описания')}</p>
          <div class="item-card__meta">
            <span>${c.lessonCount} ${lessonWord(c.lessonCount)}</span>
            <span>${c.studentCount} уч.</span>
            ${c.academicYear ? `<span>${escapeHtml(c.academicYear)}</span>` : ''}
          </div>
        </div>
      </a>`;
  }

  function lessonWord(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'урок';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'урока';
    return 'уроков';
  }
})();
