// public/js/pages/parent-feedback.js

(async function () {
  const user = await bootPage('parent');
  if (!user) return;

  const childSwitch = document.getElementById('child-switch');
  const courseSwitch = document.getElementById('course-switch');
  const monthSwitch = document.getElementById('month-switch');
  const content = document.getElementById('content');

  let children = [];
  let courses = [];
  let entries = [];
  let teachers = {};
  let activeChildId = qs('childId');
  let activeCourseId = qs('courseId');
  let activeMonth = null;

  try {
    const data = await api.get('/api/parent/children');
    children = data.children || [];
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    return;
  }

  if (!children.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👪</div>
        <div class="empty-state__title">К аккаунту пока не привязан ни один ребёнок</div>
        <p class="empty-state__text">Обратитесь к учителю или в администрацию школы, чтобы привязать логин ребёнка к вашему аккаунту.</p>
      </div>`;
    return;
  }

  if (!activeChildId || !children.some((c) => c.id === activeChildId)) {
    activeChildId = children[0].id;
  }

  renderChildSwitch();
  await loadCourses();

  function renderChildSwitch() {
    if (children.length < 2) { childSwitch.innerHTML = ''; return; }
    childSwitch.innerHTML = `
      <div class="tab-row">
        ${children.map((c) => `
          <button class="tab-chip ${c.id === activeChildId ? 'is-active' : ''}" type="button" data-child="${c.id}">
            ${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}
          </button>`).join('')}
      </div>`;
    childSwitch.querySelectorAll('[data-child]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeChildId = btn.dataset.child;
        activeCourseId = null;
        renderChildSwitch();
        await loadCourses();
      });
    });
  }

  async function loadCourses() {
    courseSwitch.innerHTML = '';
    monthSwitch.innerHTML = '';
    content.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const data = await api.get(`/api/parent/children/${activeChildId}/courses`);
      courses = data.courses || [];
    } catch (err) {
      content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
      return;
    }

    if (!courses.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📖</div>
          <div class="empty-state__title">У ребёнка пока нет курсов</div>
          <p class="empty-state__text">Как только учитель подключит ребёнка к курсу, здесь появится обратная связь по нему.</p>
        </div>`;
      return;
    }

    if (!activeCourseId || !courses.some((c) => c.id === activeCourseId)) {
      activeCourseId = courses[0].id;
    }

    renderCourseSwitch();
    await loadFeedback();
  }

  function renderCourseSwitch() {
    if (courses.length < 2) { courseSwitch.innerHTML = ''; return; }
    courseSwitch.innerHTML = `
      <div class="tab-row">
        ${courses.map((c) => `
          <button class="tab-chip ${c.id === activeCourseId ? 'is-active' : ''}" type="button" data-course="${c.id}">${escapeHtml(c.title)}</button>
        `).join('')}
      </div>`;
    courseSwitch.querySelectorAll('[data-course]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeCourseId = btn.dataset.course;
        renderCourseSwitch();
        await loadFeedback();
      });
    });
  }

  async function loadFeedback() {
    monthSwitch.innerHTML = '';
    content.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const data = await api.get(`/api/parent/feedback/children/${activeChildId}/courses/${activeCourseId}`);
      entries = data.entries || [];
      teachers = data.teachers || {};
    } catch (err) {
      content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
      return;
    }

    if (!entries.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">💬</div>
          <div class="empty-state__title">Отзывов по этому курсу пока нет</div>
          <p class="empty-state__text">Учитель ещё не оставил обратную связь за этот курс — она появится здесь, как только будет готова.</p>
        </div>`;
      return;
    }

    activeMonth = entries[0].month;
    renderMonthSwitch();
    renderEntry();
  }

  function renderMonthSwitch() {
    monthSwitch.innerHTML = `
      <div class="tab-row">
        ${entries.map((e) => `
          <button class="tab-chip ${e.month === activeMonth ? 'is-active' : ''}" type="button" data-month="${e.month}">${formatMonthLabel(e.month)}</button>
        `).join('')}
      </div>`;
    monthSwitch.querySelectorAll('[data-month]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeMonth = btn.dataset.month;
        renderMonthSwitch();
        renderEntry();
      });
    });
  }

  function renderEntry() {
    const entry = entries.find((e) => e.month === activeMonth);
    if (!entry) { content.innerHTML = ''; return; }

    const teacher = teachers[entry.teacherId];
    const chart = renderFeedbackChart({
      homeworkPercent: entry.homeworkPercent,
      communicationScore: entry.communicationScore,
      progressScore: entry.progressScore,
    });

    const notesItems = (entry.focusNotes || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const notesHtml = notesItems.length
      ? `<ul class="feedback-notes-list">${notesItems.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
      : '<p class="muted" style="font-size:13px;">Учитель не оставил отдельных заметок за этот месяц.</p>';

    const gallery = renderGallery(entry.projectFiles || []);

    content.innerHTML = `
      ${teacher ? `<p class="field__hint" style="margin:0 0 10px;">Отзыв учителя: ${escapeHtml(teacher.firstName)} ${escapeHtml(teacher.lastName)}</p>` : ''}
      <div class="feedback-layout">
        <div class="feedback-block feedback-block--chart">
          <p class="feedback-block__title">График</p>
          ${chart}
          <div class="feedback-chart-stats">
            <div class="feedback-chart-stat"><span>% выполненных дз</span><b>${entry.homeworkPercent}%</b></div>
            <div class="feedback-chart-stat"><span>Коммуникация в группе</span><b>${entry.communicationScore}%</b></div>
            <div class="feedback-chart-stat"><span>Успеваемость на уроке</span><b>${entry.progressScore}%</b></div>
          </div>
        </div>
        <div class="feedback-block feedback-block--text">
          <p class="feedback-block__title">Комментарий преподавателя</p>
          <p style="font-size:14px; line-height:1.6; white-space:pre-wrap; margin:0;">${entry.teacherText ? escapeHtml(entry.teacherText) : '<span class="muted">Комментарий пока не оставлен.</span>'}</p>
        </div>
        <div class="feedback-block feedback-block--notes">
          <p class="feedback-block__title">Основные моменты по работе с ребёнком</p>
          ${notesHtml}
        </div>
        <div class="feedback-block feedback-block--project">
          <p class="feedback-block__title">Проект ребёнка</p>
          ${gallery}
        </div>
      </div>
    `;
  }

  function renderGallery(files) {
    if (!files.length) return '<p class="muted" style="font-size:13px;">Файлов пока нет.</p>';
    return `<div class="feedback-gallery">${files.map((f) => {
      const isImg = /\.(png|jpe?g|gif|webp)$/i.test(f.originalName || '');
      return isImg
        ? `<a class="feedback-gallery__item" href="/files/${encodeURIComponent(f.filename)}" target="_blank" rel="noopener">
             <img class="feedback-gallery__thumb" src="/files/${encodeURIComponent(f.filename)}" alt=""></a>`
        : `<a class="feedback-gallery__item feedback-gallery__file" href="/files/${encodeURIComponent(f.filename)}" download="${escapeHtml(f.originalName)}">${escapeHtml(f.originalName)}</a>`;
    }).join('')}</div>`;
  }
})();
