// public/js/pages/student-course.js

(async function () {
  const user = await bootPage('student');
  if (!user) return;

  const courseId = qs('id');
  if (!courseId) { window.location.href = '/student/courses.html'; return; }

  const content = document.getElementById('content');

  try {
    const { course, lessons } = await api.get(`/api/student/courses/${courseId}`);
    document.getElementById('page-title').textContent = `${course.title} · Классный журнал`;
    render(course, lessons);
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
  }

  function render(course, lessons) {
    const cover = course.coverImage
      ? `<img class="detail-cover" src="/files/${encodeURIComponent(course.coverImage)}" alt="">`
      : `<div class="detail-cover detail-cover--placeholder"><span>КУРС</span></div>`;

    content.innerHTML = `
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Курс${course.academicYear ? ` · ${escapeHtml(course.academicYear)}` : ''}</p>
          <h1 class="page-head__title">${escapeHtml(course.title)}</h1>
          ${course.description ? `<p class="page-head__desc">${escapeHtml(course.description)}</p>` : ''}
        </div>
      </div>
      ${cover}
      <p class="section-title" style="margin-top:22px;">Уроки (${lessons.length})</p>
      ${lessons.length ? `<div class="item-grid">${lessons.map(lessonCardHtml).join('')}</div>` : `
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <div class="empty-state__title">Уроков пока нет</div>
          <p class="empty-state__text">Учитель ещё не опубликовал уроки в этом курсе.</p>
        </div>`}
    `;
  }

  function lessonCardHtml(lesson) {
    const cover = lesson.coverImage
      ? `<img src="/files/${encodeURIComponent(lesson.coverImage)}" alt="">`
      : `<div class="item-card__cover--placeholder"><span>УРОК</span></div>`;
    return `
      <a class="item-card" href="/student/lesson.html?id=${encodeURIComponent(lesson.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${lesson.orderNumber ? `${lesson.orderNumber}. ` : ''}${escapeHtml(lesson.title)}</h3>
          <p class="item-card__desc">${escapeHtml(lesson.description || 'Без описания')}</p>
          <div class="item-card__meta">${lesson.deadline ? deadlineBadge(lesson.deadline) : '<span>&nbsp;</span>'}</div>
        </div>
      </a>`;
  }
})();
