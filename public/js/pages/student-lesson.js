// public/js/pages/student-lesson.js

(async function () {
  const user = await bootPage('student');
  if (!user) return;

  const lessonId = qs('id');
  if (!lessonId) { window.location.href = '/student/courses.html'; return; }

  const content = document.getElementById('content');
  const answerForm = document.getElementById('answer-form');
  const answerErrors = document.getElementById('answer-errors');
  const answerComment = document.getElementById('answer-comment');
  const answerFiles = document.getElementById('answer-files');
  const answerSubmitBtn = document.getElementById('answer-submit-btn');

  let state = null;

  setupAnswerForm();
  await load();

  async function load() {
    try {
      state = await api.get(`/api/student/lessons/${lessonId}`);
      document.getElementById('page-title').textContent = `${state.lesson.title} · Классный журнал`;
      document.getElementById('back-link').href = `/student/course.html?id=${encodeURIComponent(state.course.id)}`;
      document.getElementById('back-link').textContent = `← ${state.course.title}`;
      render();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const { lesson, submission } = state;

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
          <div class="side-block" id="homework-block"></div>
        </div>
      </div>
    `;

    renderHomeworkBlock(submission);
  }

  // Домашнее задание сдаётся прямо в уроке — кнопка стоит в правой колонке,
  // сразу под блоком «Файлы», и открывает модалку с формой ответа.
  function renderHomeworkBlock(submission) {
    const block = document.getElementById('homework-block');

    const statusLine = submission
      ? `<p style="margin:4px 0 8px;">${statusBadge(submission)}</p>
         <p class="field__hint" style="margin:0 0 12px;">Сдано ${formatDateTime(submission.createdAt)}</p>`
      : `<p class="muted" style="margin:4px 0 14px; font-size:13px;">Вы ещё не отправили ответ на это задание.</p>`;

    const filesList = (submission && submission.files && submission.files.length) ? `
      <ul class="file-list" style="margin-bottom:10px;">${submission.files.map((f) => `
        <li><a href="/files/${encodeURIComponent(f.filename)}" download="${escapeHtml(f.originalName)}">
          <span>${escapeHtml(f.originalName)}</span><small>${formatFileSize(f.size)}</small>
        </a></li>`).join('')}</ul>` : '';

    const commentBlock = (submission && submission.comment) ? `
      <div class="comment-block" style="margin-bottom:10px;">
        <p class="comment-block__label">Ваш ответ</p>
        <p class="comment-block__text">${escapeHtml(submission.comment)}</p>
      </div>` : '';

    const teacherFeedback = (submission && submission.teacherComment) ? `
      <div class="comment-block" style="border-color:var(--red-dark); margin-bottom:10px;">
        <p class="comment-block__label">Комментарий учителя</p>
        <p class="comment-block__text">${escapeHtml(submission.teacherComment)}</p>
      </div>` : '';

    block.innerHTML = `
      <p class="side-block__title">Домашнее задание</p>
      ${statusLine}
      ${filesList}
      ${commentBlock}
      ${teacherFeedback}
      <button class="btn btn--red" type="button" id="open-answer-btn" style="width:100%;">${submission ? 'Изменить ответ' : 'Добавить ответ'}</button>
    `;

    document.getElementById('open-answer-btn').addEventListener('click', () => {
      renderErrors(answerErrors, null);
      answerComment.value = submission ? (submission.comment || '') : '';
      answerFiles.value = '';
      openModal('answer-modal');
    });
  }

  // Форма внутри модалки статична (лежит в HTML один раз), поэтому обработчик
  // сабмита вешаем один раз при загрузке страницы, а не при каждом render().
  function setupAnswerForm() {
    answerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      renderErrors(answerErrors, null);

      if (answerFiles.files.length > 5) {
        renderErrors(answerErrors, ['Можно прикрепить не больше 5 файлов.']);
        return;
      }

      const fd = new FormData(answerForm);
      answerSubmitBtn.disabled = true;
      try {
        await api.postForm(`/api/student/lessons/${lessonId}/homework/submit`, fd);
        closeModal('answer-modal');
        await load();
      } catch (err) {
        renderErrors(answerErrors, err.errors || [err.message]);
      } finally {
        answerSubmitBtn.disabled = false;
      }
    });
  }
})();
