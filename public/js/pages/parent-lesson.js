// public/js/pages/parent-lesson.js

(async function () {
  const user = await bootPage('parent');
  if (!user) return;

  const childId = qs('childId');
  const lessonId = qs('id');
  if (!childId || !lessonId) { window.location.href = '/parent/courses.html'; return; }

  const content = document.getElementById('content');

  await load();

  async function load() {
    try {
      const state = await api.get(`/api/parent/children/${childId}/lessons/${lessonId}`);
      document.getElementById('page-title').textContent = `${state.lesson.title} · Классный журнал`;
      document.getElementById('back-link').href = `/parent/course.html?childId=${encodeURIComponent(childId)}&id=${encodeURIComponent(state.course.id)}`;
      document.getElementById('back-link').textContent = `← ${state.course.title}`;
      render(state);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }

  function render(state) {
    const { lesson, submission, child } = state;

    let mediaHtml;
    if (lesson.video) {
      mediaHtml = lesson.video.type === 'file'
        ? `<div class="video-frame"><video controls src="/files/${encodeURIComponent(lesson.video.value)}"></video></div>`
        : `<div class="video-frame"><iframe src="${escapeHtml(lesson.video.value)}" allowfullscreen></iframe></div>`;
    } else if (lesson.coverImage) {
      mediaHtml = `<img class="detail-cover" src="/files/${encodeURIComponent(lesson.coverImage)}" alt="">`;
    } else {
      mediaHtml = `<div class="detail-cover detail-cover--placeholder"><span>УРОК</span></div>`;
    }

    const filesHtml = (lesson.attachments && lesson.attachments.length)
      ? `<div class="side-block">
          <p class="side-block__title">Файлы (${lesson.attachments.length})</p>
          <ul class="file-list">${lesson.attachments.map((a) => `
            <li><a href="/files/${encodeURIComponent(a.filename)}" download="${escapeHtml(a.originalName)}">
              <span>${escapeHtml(a.originalName)}</span><small>${formatFileSize(a.size)}</small>
            </a></li>`).join('')}</ul>
        </div>`
      : '';

    content.innerHTML = `
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Урок · ${escapeHtml(child.firstName)} ${escapeHtml(child.lastName)}</p>
          <h1 class="page-head__title">${escapeHtml(lesson.title)}</h1>
          ${lesson.description ? `<p class="page-head__desc">${escapeHtml(lesson.description)}</p>` : ''}
        </div>
        ${lesson.deadline ? deadlineBadge(lesson.deadline, { softClass: 'badge--gold' }) : ''}
      </div>

      <div class="detail-layout">
        <div>
          ${mediaHtml}
          <p class="section-title">Материалы урока</p>
          <div class="detail-content">${lesson.content || '<p class="muted">Учитель пока не добавил текст урока.</p>'}</div>
        </div>
        <div class="side-panel">
          ${filesHtml}
          <div class="side-block">${homeworkBlockHtml(submission)}</div>
        </div>
      </div>

      ${testSectionHtml(state.test, state.testStats)}
    `;
  }

  // Родитель видит статус и содержимое ответа ребёнка — только для чтения,
  // без формы сдачи и кнопки «Изменить ответ».
  function homeworkBlockHtml(submission) {
    const statusLine = submission
      ? `<p style="margin:4px 0 8px;">${statusBadge(submission)}</p>
         <p class="field__hint" style="margin:0 0 12px;">Сдано ${formatDateTime(submission.createdAt)}</p>`
      : `<p class="muted" style="margin:4px 0 14px; font-size:13px;">Ребёнок ещё не отправил ответ на это задание.</p>`;

    const filesList = (submission && submission.files && submission.files.length) ? `
      <ul class="file-list" style="margin-bottom:10px;">${submission.files.map((f) => `
        <li><a href="/files/${encodeURIComponent(f.filename)}" download="${escapeHtml(f.originalName)}">
          <span>${escapeHtml(f.originalName)}</span><small>${formatFileSize(f.size)}</small>
        </a></li>`).join('')}</ul>` : '';

    const commentBlock = (submission && submission.comment) ? `
      <div class="comment-block" style="margin-bottom:10px;">
        <p class="comment-block__label">Ответ ребёнка</p>
        <p class="comment-block__text">${escapeHtml(submission.comment)}</p>
      </div>` : '';

    const teacherFeedback = (submission && submission.teacherComment) ? `
      <div class="comment-block" style="border-color:var(--red-dark);">
        <p class="comment-block__label">Комментарий учителя</p>
        <p class="comment-block__text">${escapeHtml(submission.teacherComment)}</p>
      </div>` : '';

    return `
      <p class="side-block__title">Домашнее задание</p>
      ${statusLine}
      ${filesList}
      ${commentBlock}
      ${teacherFeedback}
    `;
  }

  // Статистика теста в духе учительской таблицы, но только по этому ребёнку —
  // без кнопки «Пройти тест».
  function testSectionHtml(test, testStats) {
    if (!test) return '';

    const row = testStats && testStats.rows && testStats.rows[0];
    const total = testStats ? testStats.totalCount : 0;
    const completed = testStats ? testStats.completedCount : 0;
    const avg = testStats && testStats.averagePercent != null ? `${testStats.averagePercent}%` : '—';

    const best = row && row.best != null
      ? `<span class="${row.best === row.maxScore ? 'badge badge--ok' : 'badge badge--gold'}">${row.best} / ${row.maxScore}</span>`
      : '<span class="badge badge--gray">не проходил(а)</span>';
    const attemptsCount = row ? row.attempts : 0;
    const attemptsText = attemptsCount ? `${attemptsCount} ${plural(attemptsCount, 'попытка', 'попытки', 'попыток')}` : '—';
    const when = row && row.latest ? formatDateTime(row.latest.createdAt) : '—';

    return `
      <hr style="border:none; border-top:2px solid var(--ink); margin:36px 0;">
      <p class="section-title">Тест</p>
      <div class="panel">
        <div class="panel__row">
          <span class="panel__tab">${escapeHtml(test.title)}</span>
        </div>
        ${test.description ? `<p class="muted" style="margin:8px 0;">${escapeHtml(test.description)}</p>` : ''}
        <div class="quiz-summary">
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${test.questionCount}</span>
            <span class="quiz-summary__label">вопросов</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${completed} / ${total}</span>
            <span class="quiz-summary__label">прошёл(а)</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${avg}</span>
            <span class="quiz-summary__label">результат</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${test.attempts === 0 ? '∞' : test.attempts}</span>
            <span class="quiz-summary__label">попыток разрешено</span>
          </div>
        </div>
        <div class="quiz-attempt" style="margin-top:14px;">
          ${best}
          <span>Попыток пройдено: ${attemptsText}</span>
          <span class="muted" style="font-size:12px;">Последняя попытка: ${when}</span>
        </div>
      </div>
    `;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
})();
