// public/js/pages/teacher-lesson.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const lessonId = qs('id');
  if (!lessonId) { window.location.href = '/teacher/courses.html'; return; }

  const content = document.getElementById('content');
  let state = null;

  await load();

  async function load() {
    try {
      state = await api.get(`/api/teacher/lessons/${lessonId}`);
      document.getElementById('page-title').textContent = `${state.lesson.title} · Классный журнал`;
      document.getElementById('back-link').href = `/teacher/course.html?id=${encodeURIComponent(state.lesson.courseId)}`;
      document.getElementById('back-link').textContent = `← ${state.course ? state.course.title : 'Курс'}`;
      render();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const { lesson, submissionRows } = state;

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
          <p class="page-head__eyebrow">Урок</p>
          <h1 class="page-head__title">${escapeHtml(lesson.title)}</h1>
          ${lesson.description ? `<p class="page-head__desc">${escapeHtml(lesson.description)}</p>` : ''}
        </div>
        <div class="form-actions">
          <a class="btn" href="/teacher/lesson-form.html?id=${encodeURIComponent(lesson.id)}">Редактировать</a>
          <button class="btn btn--danger" type="button" data-modal-open="delete-modal">Удалить</button>
        </div>
      </div>

      <div class="detail-layout">
        <div>
          ${mediaHtml}
          <p class="section-title">Материалы урока</p>
          <div class="detail-content">${lesson.content || '<p class="muted">Текст урока пока не добавлен.</p>'}</div>
        </div>
        <div class="side-panel">
          <div class="side-block">
            <p class="side-block__title">Сведения</p>
            <p style="margin:4px 0; font-size:13px;">Создан: ${formatDate(lesson.createdAt)}</p>
            ${lesson.deadline ? `<p style="margin:4px 0;"><span class="badge ${isDeadlinePassed(lesson.deadline) ? 'badge--overdue' : 'badge--gold'}">Дедлайн: ${formatDate(lesson.deadline)}</span></p>` : ''}
            ${lesson.alfacrmSubjectId ? `<p style="margin:4px 0; font-size:13px;">Тема в CRM: <strong>${escapeHtml(lesson.alfacrmSubjectName || 'ID ' + lesson.alfacrmSubjectId)}</strong></p>` : ''}
          </div>
          ${filesHtml}
        </div>
      </div>

      <hr style="border:none; border-top:2px solid var(--ink); margin:36px 0;">

      <p class="section-title">Домашнее задание</p>

      ${homeworkSectionHtml(submissionRows)}
    `;

    document.getElementById('delete-modal-meta').textContent =
      `Это действие необратимо и удалит все материалы, вложения и сданные работы урока «${lesson.title}».`;

    initModals();
    setupDelete();
  }

  function homeworkSectionHtml(rows) {
    if (!rows.length) {
      return `<div class="empty-state"><p class="empty-state__text">К курсу ещё не подключены ученики — статусы появятся здесь.</p></div>`;
    }

    const tableRows = rows.map((row) => `
      <tr>
        <td class="cell-title">${escapeHtml(row.student.firstName)} ${escapeHtml(row.student.lastName)}</td>
        <td>${statusBadge(row.submission)}</td>
        <td>${row.submission ? formatDateTime(row.submission.createdAt) : '—'}</td>
        <td>${row.submission ? `<a class="btn btn--sm" href="/teacher/submission.html?id=${encodeURIComponent(row.submission.id)}">Открыть</a>` : ''}</td>
      </tr>`).join('');

    return `
      <div class="panel">
        <span class="panel__tab">Статус сдачи</span>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Ученик</th><th>Статус</th><th>Сдано</th><th></th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function setupDelete() {
    const form = document.getElementById('delete-form');
    form.confirmText.value = '';
    renderErrors(form.querySelector('[data-role="delete-errors"]'), null);
    wireDeleteForm(form, async (confirmText) => {
      await api.postJson(`/api/teacher/lessons/${lessonId}/delete`, { confirmText });
      window.location.href = `/teacher/course.html?id=${encodeURIComponent(state.lesson.courseId)}`;
    });
  }
})();
