// public/js/pages/teacher-course.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const courseId = qs('id');
  if (!courseId) { window.location.href = '/teacher/courses.html'; return; }

  const content = document.getElementById('content');
  let state = null; // { course, lessons, enrolledStudents, allStudents }

  await load();

  async function load() {
    try {
      state = await api.get(`/api/teacher/courses/${courseId}`);
      document.getElementById('page-title').textContent = `${state.course.title} · Классный журнал`;
      render();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p class="empty-state__text">${escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const { course, lessons, enrolledStudents } = state;

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
        <div class="form-actions">
          <a class="btn" href="/teacher/course-form.html?id=${encodeURIComponent(course.id)}">Редактировать</a>
          <button class="btn btn--danger" type="button" data-modal-open="delete-modal">Удалить</button>
        </div>
      </div>

      <div class="detail-layout">
        <div>
          ${cover}
        </div>

        <div class="side-panel">
          <div class="side-block">
            <div class="side-block__head">
              <p class="side-block__title">Ученики курса (${enrolledStudents.length})</p>
              <button class="btn btn--sm" type="button" data-modal-open="students-modal">Управлять учениками</button>
            </div>
            <div class="side-block__list">
              ${enrolledStudents.length ? enrolledStudents.map(personRowHtml).join('') : '<p class="muted" style="font-size:13px;">Пока никто не подключён.</p>'}
            </div>
          </div>
        </div>
      </div>

      <div class="page-head" style="margin-top:28px;">
        <div>
          <p class="page-head__eyebrow">Уроки (${lessons.length})</p>
        </div>
        <a class="btn btn--red btn--sm" href="/teacher/lesson-form.html?courseId=${encodeURIComponent(course.id)}">+ Добавить урок</a>
      </div>
      ${lessons.length ? `<div class="item-grid">${lessons.map(lessonCardHtml).join('')}</div>` : `
        <div class="empty-state">
          <div class="empty-state__icon">📚</div>
          <div class="empty-state__title">В курсе пока нет уроков</div>
          <p class="empty-state__text">Добавьте первый урок — он сразу станет доступен всем ученикам курса.</p>
        </div>`}
    `;

    document.getElementById('delete-modal-meta').textContent =
      `Это действие необратимо и удалит все уроки, задания и сданные работы курса «${course.title}».`;

    initModals();
    setupDelete();
    setupStudentsModal();
  }

  function lessonCardHtml(lesson) {
    const cover = lesson.coverImage
      ? `<img src="/files/${encodeURIComponent(lesson.coverImage)}" alt="">`
      : `<div class="item-card__cover--placeholder"><span>УРОК</span></div>`;
    return `
      <a class="item-card" href="/teacher/lesson.html?id=${encodeURIComponent(lesson.id)}">
        <div class="item-card__cover">${cover}</div>
        <div class="item-card__body">
          <h3 class="item-card__title">${lesson.orderNumber ? `${lesson.orderNumber}. ` : ''}${escapeHtml(lesson.title)}</h3>
          <p class="item-card__desc">${escapeHtml(lesson.description || 'Без описания')}</p>
          <div class="item-card__meta">
            <span>${formatDate(lesson.createdAt)}</span>
            ${lesson.deadline ? deadlineBadge(lesson.deadline) : '<span>&nbsp;</span>'}
          </div>
        </div>
      </a>`;
  }

  function personRowHtml(s) {
    return `
      <div class="person-row">
        <div class="avatar">${escapeHtml(initials(s))}</div>
        <div>
          <div class="person-row__name">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}</div>
          <div class="person-row__meta">${escapeHtml(s.city)}</div>
        </div>
      </div>`;
  }

  function setupDelete() {
    const form = document.getElementById('delete-form');
    // сбрасываем поле ввода и ошибки при каждом рендере
    form.confirmText.value = '';
    renderErrors(form.querySelector('[data-role="delete-errors"]'), null);
    wireDeleteForm(form, async (confirmText) => {
      await api.postJson(`/api/teacher/courses/${courseId}/delete`, { confirmText });
      window.location.href = '/teacher/courses.html';
    });
  }

  function setupStudentsModal() {
    const grid = document.getElementById('students-checkbox-grid');
    const searchInput = document.getElementById('students-search');
    const enrolledIds = state.enrolledStudents.map((s) => s.id);
    const all = state.allStudents;

    searchInput.value = '';

    if (!all.length) {
      grid.innerHTML = '<span class="checkbox-grid__empty">Пока нет ни одного зарегистрированного ученика.</span>';
    } else {
      grid.innerHTML = all.map((s) => `
        <label class="checkbox-row" data-search="${escapeHtml(`${s.firstName} ${s.lastName} ${s.city}`.toLowerCase())}">
          <input type="checkbox" value="${s.id}" ${enrolledIds.includes(s.id) ? 'checked' : ''}>
          ${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)} <span class="muted">— ${escapeHtml(s.city)}</span>
        </label>`).join('');
    }

    let emptySearchNotice = null;
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      const rows = grid.querySelectorAll('.checkbox-row');
      let visibleCount = 0;
      rows.forEach((row) => {
        const matches = !query || row.dataset.search.includes(query);
        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount += 1;
      });
      if (!emptySearchNotice) {
        emptySearchNotice = document.createElement('span');
        emptySearchNotice.className = 'checkbox-grid__empty';
        emptySearchNotice.textContent = 'Никого не нашли по этому запросу.';
        grid.appendChild(emptySearchNotice);
      }
      emptySearchNotice.hidden = !(all.length && visibleCount === 0);
    };

    const saveBtn = document.getElementById('save-students-btn');
    const errorsBox = document.getElementById('students-errors');
    renderErrors(errorsBox, null);

    saveBtn.onclick = async () => {
      const selected = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked')).map((i) => i.value);
      saveBtn.disabled = true;
      try {
        const fd = new FormData();
        fd.set('title', state.course.title);
        fd.set('description', state.course.description || '');
        fd.set('academicYear', state.course.academicYear || '');
        selected.forEach((id) => fd.append('studentIds', id));
        await api.putForm(`/api/teacher/courses/${courseId}`, fd);
        closeModal('students-modal');
        await load();
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
      } finally {
        saveBtn.disabled = false;
      }
    };
  }
})();
