// public/js/pages/teacher-feedback.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const content = document.getElementById('content');
  const courseId = qs('courseId');

  let currentStudent = null;
  let currentEntries = [];
  let removeFileIds = [];

  const monthInput = document.getElementById('feedback-month');
  const errorsBox = document.getElementById('feedback-errors');

  setupModal();

  if (!courseId) {
    await loadCourseList();
  } else {
    await loadCourseChildren(courseId);
  }

  // ---------- Список курсов ----------

  async function loadCourseList() {
    content.innerHTML = `
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Раздел · Обратная связь</p>
          <h1 class="page-head__title">Обратная связь</h1>
          <p class="page-head__desc">Выберите курс, чтобы увидеть прикреплённых детей и заполнить отзыв.</p>
        </div>
      </div>
      <p class="muted">Загрузка…</p>`;
    try {
      const { courses } = await api.get('/api/teacher/feedback/courses');
      renderCourseList(courses);
    } catch (err) {
      content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    }
  }

  function renderCourseList(courses) {
    const head = `
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Раздел · Обратная связь</p>
          <h1 class="page-head__title">Обратная связь</h1>
          <p class="page-head__desc">Выберите курс, чтобы увидеть прикреплённых детей и заполнить отзыв.</p>
        </div>
      </div>`;

    if (!courses.length) {
      content.innerHTML = `${head}
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <div class="empty-state__title">Пока нет курсов</div>
          <p class="empty-state__text">Создайте курс и подключите к нему учеников, чтобы оставлять для них отзывы.</p>
        </div>`;
      return;
    }

    content.innerHTML = `${head}<div class="item-grid">${courses.map(courseCardHtml).join('')}</div>`;
  }

  function courseCardHtml(c) {
    const cover = c.coverImage
      ? `<img src="/files/${encodeURIComponent(c.coverImage)}" alt="">`
      : `<div class="item-card__cover--placeholder"><span>КУРС</span></div>`;
    return `
      <a class="item-card" href="/teacher/feedback.html?courseId=${encodeURIComponent(c.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${escapeHtml(c.title)}</h3>
          <p class="item-card__desc">${escapeHtml(c.description || 'Без описания')}</p>
          <div class="item-card__meta"><span>${c.studentCount} ${plural(c.studentCount, 'ученик', 'ученика', 'учеников')}</span></div>
        </div>
      </a>`;
  }

  // ---------- Дети курса ----------

  async function loadCourseChildren(id) {
    content.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const data = await api.get(`/api/teacher/feedback/courses/${id}`);
      renderChildren(data.course, data.students);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderChildren(course, students) {
    content.innerHTML = `
      <a class="back-link" href="/teacher/feedback.html">← Все курсы</a>
      <div class="page-head">
        <div>
          <p class="page-head__eyebrow">Обратная связь</p>
          <h1 class="page-head__title">${escapeHtml(course.title)}</h1>
          <p class="page-head__desc">Выберите ученика, чтобы заполнить или посмотреть отзыв по месяцам.</p>
        </div>
      </div>
      ${students.length ? `<div class="panel">${students.map(studentRowHtml).join('')}</div>` : `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <div class="empty-state__title">К курсу пока не подключены ученики</div>
        </div>`}
    `;

    content.querySelectorAll('[data-student-row]').forEach((row) => {
      row.addEventListener('click', () => {
        const student = students.find((s) => s.id === row.dataset.studentRow);
        if (student) openFeedbackModal(course.id, student);
      });
    });
  }

  function studentRowHtml(s) {
    const parentLabel = s.parents && s.parents.length
      ? s.parents.map((p) => `${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}`).join(', ')
      : 'родитель не привязан';
    return `
      <div class="person-row" style="padding:12px 15px; justify-content:space-between; cursor:pointer;" data-student-row="${s.id}">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar">${initials(s)}</div>
          <div>
            <p class="person-row__name">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}</p>
            <p class="person-row__meta">Родитель: ${parentLabel}</p>
          </div>
        </div>
        <span class="badge badge--gray">Обратная связь →</span>
      </div>`;
  }

  // ---------- Модалка обратной связи ----------

  async function openFeedbackModal(activeCourseId, student) {
    currentStudent = student;
    currentStudent.courseId = activeCourseId;
    removeFileIds = [];
    renderErrors(errorsBox, null);
    document.getElementById('feedback-modal-title').textContent = `Обратная связь · ${student.firstName} ${student.lastName}`;
    document.getElementById('feedback-history').innerHTML = '<span class="muted" style="font-size:12px;">Загрузка истории…</span>';
    document.getElementById('feedback-save-status').textContent = '';
    openModal('feedback-modal');

    try {
      const data = await api.get(`/api/teacher/feedback/courses/${activeCourseId}/students/${student.id}`);
      currentEntries = data.entries || [];
      monthInput.value = currentEntries.length ? currentEntries[0].month : currentMonthValue();
      renderHistoryChips();
      syncFormToMonth();
    } catch (err) {
      renderErrors(errorsBox, [err.message]);
    }
  }

  function renderHistoryChips() {
    const box = document.getElementById('feedback-history');
    if (!currentEntries.length) {
      box.innerHTML = '<span class="muted" style="font-size:12px;">Отзывов пока нет — заполните первый ниже.</span>';
      return;
    }
    box.innerHTML = `<div class="tab-row" style="margin-bottom:0;">${currentEntries.map((e) => `
      <button type="button" class="tab-chip ${e.month === monthInput.value ? 'is-active' : ''}" data-month="${e.month}">${formatMonthLabel(e.month)}</button>
    `).join('')}</div>`;
    box.querySelectorAll('[data-month]').forEach((btn) => {
      btn.addEventListener('click', () => {
        monthInput.value = btn.dataset.month;
        syncFormToMonth();
        renderHistoryChips();
      });
    });
  }

  function findEntryForMonth(month) {
    return currentEntries.find((e) => e.month === month) || null;
  }

  function syncFormToMonth() {
    const month = monthInput.value;
    const entry = findEntryForMonth(month);
    removeFileIds = [];

    setRange('feedback-hw', entry ? entry.homeworkPercent : 0);
    setRange('feedback-comm', entry ? entry.communicationScore : 0);
    setRange('feedback-progress', entry ? entry.progressScore : 0);
    document.getElementById('feedback-text').value = entry ? entry.teacherText : '';
    document.getElementById('feedback-notes').value = entry ? entry.focusNotes : '';
    document.getElementById('feedback-project-files').value = '';
    renderExistingFiles(entry ? entry.projectFiles : []);
    updateChartPreview();

    const delBtn = document.getElementById('feedback-delete-btn');
    delBtn.hidden = !entry;
    delBtn.dataset.id = entry ? entry.id : '';
  }

  function setRange(id, value) {
    document.getElementById(id).value = value;
    document.getElementById(`${id}-val`).textContent = value;
  }

  function updateChartPreview() {
    const scores = {
      homeworkPercent: Number(document.getElementById('feedback-hw').value),
      communicationScore: Number(document.getElementById('feedback-comm').value),
      progressScore: Number(document.getElementById('feedback-progress').value),
    };
    document.getElementById('feedback-chart-preview').innerHTML = renderFeedbackChart(scores);
  }

  function renderExistingFiles(files) {
    const box = document.getElementById('feedback-existing-files');
    if (!files || !files.length) {
      box.innerHTML = '<p class="muted" style="font-size:12px; margin:0;">Файлов пока нет.</p>';
      return;
    }
    box.innerHTML = files.map(fileTileHtml).join('');
    box.querySelectorAll('[data-remove-file]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeFileIds.push(btn.dataset.removeFile);
        btn.closest('.feedback-gallery__item').remove();
        if (!box.querySelector('.feedback-gallery__item')) {
          box.innerHTML = '<p class="muted" style="font-size:12px; margin:0;">Файлов пока нет.</p>';
        }
      });
    });
  }

  function fileTileHtml(f) {
    const isImg = /\.(png|jpe?g|gif|webp)$/i.test(f.originalName || '');
    return `
      <div class="feedback-gallery__item">
        ${isImg
          ? `<img class="feedback-gallery__thumb" src="/files/${encodeURIComponent(f.filename)}" alt="">`
          : `<a class="feedback-gallery__file" href="/files/${encodeURIComponent(f.filename)}" download="${escapeHtml(f.originalName)}">${escapeHtml(f.originalName)}</a>`}
        <button type="button" class="item-card__remove" data-remove-file="${f.filename}" title="Удалить">✕</button>
      </div>`;
  }

  function setupModal() {
    ['feedback-hw', 'feedback-comm', 'feedback-progress'].forEach((id) => {
      document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`${id}-val`).textContent = e.target.value;
        updateChartPreview();
      });
    });

    monthInput.addEventListener('change', () => {
      if (!monthInput.value) return;
      syncFormToMonth();
      renderHistoryChips();
    });

    document.querySelectorAll('#feedback-quick-notes [data-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ta = document.getElementById('feedback-notes');
        const line = btn.dataset.note;
        ta.value = ta.value ? `${ta.value.replace(/\n+$/, '')}\n${line}` : line;
        ta.focus();
      });
    });

    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      renderErrors(errorsBox, null);

      if (!monthInput.value) {
        renderErrors(errorsBox, ['Укажите месяц.']);
        return;
      }

      const fd = new FormData();
      fd.append('month', monthInput.value);
      fd.append('homeworkPercent', document.getElementById('feedback-hw').value);
      fd.append('communicationScore', document.getElementById('feedback-comm').value);
      fd.append('progressScore', document.getElementById('feedback-progress').value);
      fd.append('teacherText', document.getElementById('feedback-text').value);
      fd.append('focusNotes', document.getElementById('feedback-notes').value);
      removeFileIds.forEach((f) => fd.append('removeProjectFiles', f));
      Array.from(document.getElementById('feedback-project-files').files || []).forEach((f) => fd.append('projectFiles', f));

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const { entry } = await api.postForm(`/api/teacher/feedback/courses/${currentStudent.courseId}/students/${currentStudent.id}`, fd);
        const idx = currentEntries.findIndex((x) => x.month === entry.month);
        if (idx >= 0) currentEntries[idx] = entry; else currentEntries.push(entry);
        currentEntries.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
        renderHistoryChips();
        syncFormToMonth();
        const status = document.getElementById('feedback-save-status');
        status.textContent = '✓ Сохранено';
        setTimeout(() => { status.textContent = ''; }, 2500);
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('feedback-delete-btn').addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      if (!confirm('Удалить отзыв за этот месяц? Это действие необратимо.')) return;
      try {
        await api.postJson(`/api/teacher/feedback/${id}/delete`);
        currentEntries = currentEntries.filter((x) => x.id !== id);
        renderHistoryChips();
        syncFormToMonth();
      } catch (err) {
        renderErrors(errorsBox, [err.message]);
      }
    });
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
})();
