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
  setupTestForm();
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

      ${renderTestSection()}
    `;

    renderHomeworkBlock(submission);
  }

  function renderTestSection() {
    const test = state.test;
    const attempts = state.attempts || [];

    if (!test) return '';

    const done = attempts.length;
    const maxAttempts = test.attempts === 0 ? Infinity : Math.max(1, test.attempts);
    const remaining = maxAttempts - done;

    let statusHtml;
    if (done >= maxAttempts) {
      statusHtml = `<p class="muted" style="margin:4px 0 12px; font-size:13px;">Вы использовали все попытки прохождения теста.</p>`;
    } else if (done > 0) {
      statusHtml = `<p class="muted" style="margin:4px 0 12px; font-size:13px;">Пройдено раз: ${done}. Осталось попыток: ${maxAttempts === Infinity ? 'не ограничено' : remaining}.</p>`;
    } else {
      statusHtml = `<p class="muted" style="margin:4px 0 12px; font-size:13px;">Проверьте свои знания по материалам урока.</p>`;
    }

    const last = attempts[attempts.length - 1];
    const resultsHtml = attempts.length
      ? `
        <p class="section-title" style="margin-top:24px;">Ваши результаты</p>
        <div class="panel">
          ${attempts.map((a) => {
            const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0;
            return `
              <div class="quiz-attempt">
                <span class="badge ${pct >= 70 ? 'badge--ok' : pct >= 40 ? 'badge--gold' : 'badge--overdue'}">${a.score} / ${a.maxScore}</span>
                <span>Попытка ${a.attemptNumber}</span>
                <span class="muted" style="font-size:12px;">${formatDateTime(a.submittedAt)}</span>
                ${a.review ? `<button class="btn btn--sm" type="button" data-review="${a.id}">Разбор</button>` : ''}
              </div>`;
          }).join('')}
        </div>
        ${last && test.showResults && last.review ? `
          <div class="panel" style="margin-top:14px;" id="test-review-${last.id}"></div>` : ''}
      `
      : '';

    const btnDisabled = remaining <= 0;
    return `
      <hr style="border:none; border-top:2px solid var(--ink); margin:36px 0;">
      <p class="section-title">Тест</p>
      <div class="panel">
        <div class="panel__row">
          <span class="panel__tab">${escapeHtml(test.title)}</span>
          ${test.attempts === 0 ? '<span class="badge badge--gray">без ограничений</span>' : `<span class="badge badge--gray">${test.attempts} ${plural(test.attempts, 'попытка', 'попытки', 'попыток')}</span>`}
        </div>
        ${test.description ? `<p class="muted" style="margin:8px 0;">${escapeHtml(test.description)}</p>` : ''}
        ${statusHtml}
        <button class="btn btn--red" type="button" id="open-test-btn" ${btnDisabled ? 'disabled' : ''}>${done > 0 ? 'Пройти ещё раз' : 'Пройти тест'}</button>
      </div>
      ${resultsHtml}
    `;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  // ---------- Модалка прохождения теста ----------

  function renderTestQuestions() {
    const test = state.test;
    const box = document.getElementById('test-questions');
    document.getElementById('test-modal-title').textContent = test.title;
    document.getElementById('test-modal-meta').textContent = `${test.questions.length} ${plural(test.questions.length, 'вопрос', 'вопроса', 'вопросов')}`;

    box.innerHTML = test.questions.map((q, qi) => `
      <div class="quiz-question quiz-question--student" data-qid="${q.id}">
        <p class="quiz-question__text">${qi + 1}. ${escapeHtml(q.text)}</p>
        <div class="quiz-options quiz-options--student">
          ${q.options.map((o) => `
            <label class="quiz-option quiz-option--student">
              <input type="${q.type === 'multiple' ? 'checkbox' : 'radio'}" name="q_${q.id}" value="${o.id}">
              <span>${escapeHtml(o.text)}</span>
            </label>`).join('')}
        </div>
      </div>`).join('');
  }

  function collectTestAnswers() {
    const answers = [];
    document.querySelectorAll('.quiz-question--student').forEach((q) => {
      const qid = q.dataset.qid;
      const optionIds = [...q.querySelectorAll('input:checked')].map((i) => i.value);
      answers.push({ questionId: qid, optionIds });
    });
    return answers;
  }

  function showTestResult(attempt, remaining) {
    document.getElementById('test-form').hidden = true;
    const result = document.getElementById('test-result');
    const pct = attempt.maxScore ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
    result.hidden = false;
    result.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result__score">${attempt.score} / ${attempt.maxScore}</div>
        <div class="quiz-result__pct">${pct}%</div>
        <p class="muted">${remaining === -1 ? 'Попытки не ограничены.' : remaining > 0 ? `Осталось попыток: ${remaining}.` : 'Все попытки использованы.'}</p>
      </div>
      ${attempt.review ? `
        <p class="section-title" style="margin-top:20px;">Разбор ответов</p>
        ${attempt.review.map((r, i) => {
          const q = state.test.questions.find((qq) => qq.id === r.questionId);
          if (!q) return '';
          return `
            <div class="quiz-review">
              <p class="quiz-review__q">${i + 1}. ${escapeHtml(q.text)}</p>
              <p class="quiz-review__answer ${r.isCorrect ? 'is-correct' : 'is-wrong'}">
                ${r.isCorrect ? '✓ Правильно' : '✗ Неверно'}
              </p>
              ${!r.isCorrect ? `<p class="quiz-review__correct">Правильный ответ: ${r.correct.map((id) => { const o = q.options.find((oo) => oo.id === id); return o ? escapeHtml(o.text) : ''; }).filter(Boolean).join(', ')}</p>` : ''}
            </div>`;
        }).join('')}` : ''}
    `;
  }

  function setupTestForm() {
    const form = document.getElementById('test-form');
    const openBtn = document.getElementById('open-test-btn');
    if (!form) return;

    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'open-test-btn') {
        renderTestQuestions();
        document.getElementById('test-result').hidden = true;
        document.getElementById('test-result').innerHTML = '';
        document.getElementById('test-form').hidden = false;
        renderErrors(document.getElementById('test-errors'), null);
        openModal('test-modal');
      }
      if (e.target && e.target.dataset && e.target.dataset.review) {
        const attemptId = e.target.dataset.review;
        const a = (state.attempts || []).find((x) => x.id === attemptId);
        if (a && a.review) {
          const target = document.getElementById(`test-review-${attemptId}`);
          if (target) {
            target.innerHTML = a.review.map((r, i) => {
              const q = state.test.questions.find((qq) => qq.id === r.questionId);
              if (!q) return '';
              return `
                <div class="quiz-review">
                  <p class="quiz-review__q">${i + 1}. ${escapeHtml(q.text)}</p>
                  <p class="quiz-review__answer ${r.isCorrect ? 'is-correct' : 'is-wrong'}">${r.isCorrect ? '✓ Правильно' : '✗ Неверно'}</p>
                  ${!r.isCorrect ? `<p class="quiz-review__correct">Правильный ответ: ${r.correct.map((id) => { const o = q.options.find((oo) => oo.id === id); return o ? escapeHtml(o.text) : ''; }).filter(Boolean).join(', ')}</p>` : ''}
                </div>`;
            }).join('');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errors = [];

      // Каждый вопрос должен быть отвечен.
      document.querySelectorAll('.quiz-question--student').forEach((q) => {
        if (!q.querySelector('input:checked')) {
          const idx = [...document.querySelectorAll('.quiz-question--student')].indexOf(q);
          errors.push(`Ответьте на вопрос ${idx + 1}.`);
        }
      });
      renderErrors(document.getElementById('test-errors'), errors);
      if (errors.length) {
        scrollToErrors();
        return;
      }

      const submitBtn = document.getElementById('test-submit-btn');
      submitBtn.disabled = true;
      try {
        const res = await api.postJson(`/api/student/lessons/${lessonId}/test/submit`, {
          answers: collectTestAnswers(),
        });
        showTestResult(res.attempt, res.remainingAttempts);
        await load();
      } catch (err) {
        renderErrors(document.getElementById('test-errors'), err.errors || [err.message]);
        scrollToErrors();
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Ошибки теста показываются внизу модалки, под кнопками. Подскролливаем к ним,
  // чтобы они были видны даже если вопросов много.
  function scrollToErrors() {
    const box = document.getElementById('test-errors');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
