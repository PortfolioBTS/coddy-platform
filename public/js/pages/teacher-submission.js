// public/js/pages/teacher-submission.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const submissionId = qs('id');
  if (!submissionId) { window.location.href = '/teacher/courses.html'; return; }

  const content = document.getElementById('content');

  try {
    const data = await api.get(`/api/teacher/submissions/${submissionId}`);
    render(data);
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
  }

  function render({ submission, homework, lesson, student }) {
    document.getElementById('page-title').textContent = `${student.firstName} ${student.lastName} · Классный журнал`;
    const backHref = lesson ? `/teacher/lesson.html?id=${encodeURIComponent(lesson.id)}` : '/teacher/courses.html';
    document.getElementById('back-link').href = backHref;
    document.getElementById('back-link').textContent = `← ${lesson ? lesson.title : 'Урок'}`;

    const fileHtml = (submission.files && submission.files.length) ? `
      <ul class="file-list" style="margin:0 0 10px;">${submission.files.map((f) => `
        <li><a href="/files/${encodeURIComponent(f.filename)}" download="${escapeHtml(f.originalName)}">
          <span>📎 ${escapeHtml(f.originalName)}</span><small>${formatFileSize(f.size)}</small>
        </a></li>`).join('')}</ul>` : '';

    const prevComment = submission.teacherComment ? `
      <div class="comment-block" style="border-color:var(--red-dark);">
        <p class="comment-block__label">Ваш предыдущий комментарий</p>
        <p class="comment-block__text">${escapeHtml(submission.teacherComment)}</p>
      </div>` : '';

    content.innerHTML = `
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Домашняя работа · ${escapeHtml(homework.title)}</p>
          <h1 class="page-head__title">${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h1>
        </div>
        ${statusBadge(submission)}
      </div>

      <div class="comment-block">
        <p class="comment-block__label">Сдано ${formatDateTime(submission.createdAt)}</p>
        ${fileHtml}
        <p class="comment-block__text">${submission.comment ? escapeHtml(submission.comment) : 'Ученик не оставил комментарий.'}</p>
      </div>

      ${prevComment}

      <ul class="error-list" id="form-errors" hidden></ul>
      <form class="form" id="comment-form">
        <div class="field">
          <label class="field__label" for="teacherComment">Комментарий и рекомендации</label>
          <textarea class="textarea" id="teacherComment" name="teacherComment" rows="4">${escapeHtml(submission.teacherComment || '')}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn--red" type="submit">Сохранить и отметить проверенным</button>
        </div>
      </form>
    `;

    const form = document.getElementById('comment-form');
    const errorsBox = document.getElementById('form-errors');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      renderErrors(errorsBox, null);
      try {
        await api.postJson(`/api/teacher/submissions/${submissionId}/comment`, { teacherComment: form.teacherComment.value });
        const data = await api.get(`/api/teacher/submissions/${submissionId}`);
        render(data);
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
      }
    });
  }
})();
