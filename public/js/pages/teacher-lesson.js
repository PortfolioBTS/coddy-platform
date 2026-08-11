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
<<<<<<< HEAD
    const { lesson, submissionRows, test, testStats } = state;
=======
    const { lesson, submissionRows } = state;
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3

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

<<<<<<< HEAD
    // Если в уроке есть только тест (нет текста, видео, файлов, описания;
    // обложка — это не материал), сдавать нечего — таблицу «Статус сдачи» не показываем.
    const hasLessonMaterial = !!(
      (lesson.content && lesson.content.trim()) ||
      lesson.video ||
      (lesson.attachments && lesson.attachments.length) ||
      (lesson.description && lesson.description.trim())
    );
    const onlyTest = !!test && !hasLessonMaterial;

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
      ${onlyTest ? '' : `
        <p class="section-title">Домашнее задание</p>

        ${homeworkSectionHtml(submissionRows)}

        <hr style="border:none; border-top:2px solid var(--ink); margin:36px 0;">
      `}

      <p class="section-title">Тест</p>
      ${testSectionHtml(test, testStats)}
=======
      <p class="section-title">Домашнее задание</p>

      ${homeworkSectionHtml(submissionRows)}
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    `;

    document.getElementById('delete-modal-meta').textContent =
      `Это действие необратимо и удалит все материалы, вложения и сданные работы урока «${lesson.title}».`;

    initModals();
    setupDelete();
<<<<<<< HEAD
    setupTestDelete();
    setupCopyTest();
  }

  function testSectionHtml(test, testStats) {
    if (!test) {
      return `
        <div class="panel">
          <div class="empty-state">
            <p class="empty-state__text">К этому уроку ещё нет теста. Создайте его, чтобы ученики могли проверить знания.</p>
            <div class="form-actions" style="justify-content:center; margin-top:6px;">
              <a class="btn btn--red" href="/teacher/test-form.html?lessonId=${encodeURIComponent(lessonId)}">Создать тест</a>
              <button class="btn" type="button" id="copy-test-into-btn">Скопировать тест</button>
            </div>
          </div>
        </div>`;
    }

    const total = testStats ? testStats.totalCount : 0;
    const completed = testStats ? testStats.completedCount : 0;
    const avg = testStats && testStats.averagePercent != null ? `${testStats.averagePercent}%` : '—';

    const rowsHtml = testStats && testStats.rows.length
      ? testStats.rows.map((r) => {
          const best = r.best != null
            ? `<span class="${r.best === r.maxScore ? 'badge badge--ok' : 'badge badge--gold'}">${r.best} / ${r.maxScore}</span>`
            : '<span class="badge badge--gray">не прошёл</span>';
          const attempts = r.attempts
            ? `${r.attempts} ${plural(r.attempts, 'попытка', 'попытки', 'попыток')}`
            : '—';
          const when = r.latest ? formatDateTime(r.latest.createdAt) : '—';
          return `
            <tr>
              <td class="cell-title">${escapeHtml(r.student.firstName)} ${escapeHtml(r.student.lastName)}</td>
              <td>${best}</td>
              <td>${attempts}</td>
              <td>${when}</td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="4" class="muted" style="text-align:center; padding:18px;">К курсу пока не подключены ученики.</td></tr>`;

    return `
      <div class="panel">
        <div class="panel__row">
          <span class="panel__tab">${escapeHtml(test.title)}</span>
          <div class="form-actions">
            <button class="btn btn--sm" type="button" id="copy-test-out-btn">Скопировать в другой урок</button>
            <a class="btn btn--sm" href="/teacher/test-form.html?testId=${encodeURIComponent(test.id)}">Редактировать</a>
            <button class="btn btn--sm btn--danger" type="button" data-modal-open="test-delete-modal">Удалить</button>
          </div>
        </div>
        <div class="quiz-summary">
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${test.questions.length}</span>
            <span class="quiz-summary__label">вопросов</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${completed} / ${total}</span>
            <span class="quiz-summary__label">прошли</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${avg}</span>
            <span class="quiz-summary__label">средний результат</span>
          </div>
          <div class="quiz-summary__item">
            <span class="quiz-summary__value">${test.attempts === 0 ? '∞' : test.attempts}</span>
            <span class="quiz-summary__label">попыток</span>
          </div>
        </div>
        ${test.description ? `<p class="muted" style="margin:10px 0;">${escapeHtml(test.description)}</p>` : ''}
        <div class="table-scroll" style="margin-top:14px;">
          <table class="table">
            <thead><tr><th>Ученик</th><th>Лучший результат</th><th>Попытки</th><th>Последняя попытка</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>`;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD

  function setupTestDelete() {
    const form = document.getElementById('test-delete-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.confirmText.value = '';
    renderErrors(form.querySelector('[data-role="test-delete-errors"]'), null);
    wireDeleteForm(form, async (confirmText) => {
      await api.postJson(`/api/teacher/tests/${state.test.id}/delete`, { confirmText });
      await load();
    });
  }

  // Копирование теста: если у урока теста нет — можно принести его с другого
  // урока/курса; если тест есть — скопировать его на другой урок.
  function setupCopyTest() {
    const intoBtn = document.getElementById('copy-test-into-btn'); // "Скопировать тест" (на этот урок)
    const outBtn = document.getElementById('copy-test-out-btn');   // "Скопировать в другой урок"

    const list = document.getElementById('copy-test-list');
    const errorsBox = document.getElementById('copy-test-errors');
    const searchInput = document.getElementById('copy-test-search');
    const backBtn = document.getElementById('copy-test-back');
    const titleEl = document.getElementById('copy-test-title');
    const metaEl = document.getElementById('copy-test-meta');

    let mode = 'into'; // 'into' — выбрать тест, 'out' — выбрать целевой урок
    let data = []; // тесты (into) или уроки (out)
    let groups = []; // сгруппированы по курсам
    let selectedCourseId = null;

    const copyBtn = (btn, onClick) => {
      if (!btn) return;
      btn.addEventListener('click', onClick);
    };

    function openInto() {
      mode = 'into';
      titleEl.textContent = 'Скопировать тест';
      metaEl.textContent = 'Выберите тест, чтобы скопировать его на этот урок';
    }

    function openOut() {
      mode = 'out';
      titleEl.textContent = 'Скопировать в другой урок';
      metaEl.textContent = 'Выберите урок, на который будет скопирован тест «' + (state.test ? state.test.title : '') + '»';
    }

    function groupByCourse(items, courseIdKey, courseTitleKey) {
      const map = new Map();
      items.forEach((item) => {
        const cid = item[courseIdKey];
        if (!map.has(cid)) map.set(cid, { courseId: cid, courseTitle: item[courseTitleKey], items: [] });
        map.get(cid).items.push(item);
      });
      return Array.from(map.values());
    }

    async function open() {
      renderErrors(errorsBox, null);
      searchInput.value = '';
      selectedCourseId = null;
      backBtn.hidden = true;
      list.innerHTML = '<span class="checkbox-grid__empty">Загрузка…</span>';
      openModal('copy-test-modal');

      try {
        if (mode === 'into') {
          const res = await api.get('/api/teacher/tests');
          data = res.tests;
        } else {
          const res = await api.get('/api/teacher/lessons');
          // исключаем текущий урок
          data = res.lessons.filter((l) => l.id !== lessonId);
        }
        groups = groupByCourse(data, mode === 'into' ? 'courseId' : 'courseId', mode === 'into' ? 'courseTitle' : 'courseTitle');
        renderCourses(searchInput.value);
      } catch (err) {
        list.innerHTML = '';
        renderErrors(errorsBox, err.errors || [err.message]);
      }
    }

    function renderCourses(query) {
      titleEl.textContent = mode === 'into' ? 'Скопировать тест' : 'Скопировать в другой урок';
      metaEl.textContent = mode === 'into'
        ? 'Выберите курс, из которого хотите скопировать тест'
        : 'Выберите курс, в который хотите скопировать тест';
      backBtn.hidden = true;
      searchInput.placeholder = 'Поиск курса…';

      const q = query.trim().toLowerCase();
      const filtered = groups.filter((g) => !q || g.courseTitle.toLowerCase().includes(q));

      if (!filtered.length) {
        list.innerHTML = `<span class="checkbox-grid__empty">${q ? 'Ничего не найдено по запросу.' : mode === 'into' ? 'Пока нет тестов для копирования.' : 'Пока нет других уроков для копирования.'}</span>`;
        return;
      }

      list.innerHTML = filtered.map((g) => `
        <div class="person-row" style="justify-content: space-between; cursor: pointer;" data-course="${g.courseId}">
          <div>
            <div class="person-row__name">${escapeHtml(g.courseTitle)}</div>
            <div class="person-row__meta">${g.items.length} ${plural(g.items.length, 'элемент', 'элемента', 'элементов')}</div>
          </div>
          <span class="muted">→</span>
        </div>`).join('');
    }

    function renderItems(query) {
      const group = groups.find((g) => g.courseId === selectedCourseId);
      if (!group) { renderCourses(query); return; }

      titleEl.textContent = group.courseTitle;
      metaEl.textContent = mode === 'into'
        ? 'Выберите тест, чтобы скопировать его на этот урок'
        : 'Выберите урок, на который будет скопирован тест';
      backBtn.hidden = false;
      searchInput.placeholder = mode === 'into' ? 'Поиск теста…' : 'Поиск урока…';

      const q = query.trim().toLowerCase();
      const filtered = group.items.filter((item) => {
        if (!q) return true;
        if (mode === 'into') return item.title.toLowerCase().includes(q);
        return item.title.toLowerCase().includes(q);
      });

      if (!filtered.length) {
        list.innerHTML = `<span class="checkbox-grid__empty">${q ? 'Ничего не найдено по запросу.' : mode === 'into' ? 'В этом курсе нет тестов.' : 'В этом курсе нет других уроков.'}</span>`;
        return;
      }

      list.innerHTML = filtered.map((item) => {
        if (mode === 'into') {
          return `
            <div class="person-row" style="justify-content: space-between; cursor: pointer;" data-pick-id="${item.id}">
              <div>
                <div class="person-row__name">${escapeHtml(item.title)}</div>
                <div class="person-row__meta">Урок: ${escapeHtml(item.lessonTitle)} · ${item.questions.length} ${plural(item.questions.length, 'вопрос', 'вопроса', 'вопросов')}</div>
              </div>
              <button class="btn btn--sm" type="button">Скопировать</button>
            </div>`;
        }
        return `
          <div class="person-row" style="justify-content: space-between; cursor: pointer;" data-pick-id="${item.id}">
            <div>
              <div class="person-row__name">${item.orderNumber ? `${item.orderNumber}. ` : ''}${escapeHtml(item.title)}</div>
              <div class="person-row__meta">${item.hasTest ? 'Уже есть тест' : 'Без теста'}</div>
            </div>
            <button class="btn btn--sm" type="button">Скопировать</button>
          </div>`;
      }).join('');
    }

    function applySearch() {
      if (selectedCourseId) renderItems(searchInput.value);
      else renderCourses(searchInput.value);
    }

    searchInput.addEventListener('input', applySearch);

    list.addEventListener('click', (e) => {
      const courseRow = e.target.closest('[data-course]');
      if (courseRow) {
        selectedCourseId = courseRow.dataset.course;
        searchInput.value = '';
        renderItems('');
        return;
      }
    });

    backBtn.addEventListener('click', () => {
      selectedCourseId = null;
      searchInput.value = '';
      renderCourses('');
    });

    document.addEventListener('click', async (e) => {
      const pick = e.target.closest('[data-pick-id]');
      if (!pick) return;
      const btn = pick.querySelector('button');
      if (btn) btn.disabled = true;

      const target = pick.dataset.pickId;
      const payload = mode === 'into' ? { testId: target } : { testId: state.test.id };
      try {
        await api.postJson(`/api/teacher/lessons/${mode === 'into' ? lessonId : target}/test/copy`, payload);
        closeModal('copy-test-modal');
        await load();
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
        if (btn) btn.disabled = false;
      }
    });

    copyBtn(intoBtn, () => { openInto(); open(); });
    copyBtn(outBtn, () => { openOut(); open(); });
  }
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
})();
