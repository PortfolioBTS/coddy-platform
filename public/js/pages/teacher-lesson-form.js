// public/js/pages/teacher-lesson-form.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const lessonId = qs('id');
  let courseId = qs('courseId');
  const mode = lessonId ? 'edit' : 'create';

  if (mode === 'create' && !courseId) {
    window.location.href = '/teacher/courses.html';
    return;
  }

  const form = document.getElementById('lesson-form');
  const errorsBox = document.getElementById('form-errors');
  let currentLesson = null;

<<<<<<< HEAD
  // Предвыбор теста перед созданием урока (только для нового урока):
  // pendingCopyTest — готовый тест для копирования, pendingCreateNew — открыть форму нового теста.
  let pendingCopyTest = null;
  let pendingCreateNew = false;

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  if (mode === 'edit') {
    try {
      const data = await api.get(`/api/teacher/lessons/${lessonId}`);
      currentLesson = data.lesson;
      courseId = currentLesson.courseId;
      fillForm(currentLesson);
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    }
  }

  const backHref = mode === 'edit'
    ? `/teacher/lesson.html?id=${encodeURIComponent(lessonId)}`
    : `/teacher/course.html?id=${encodeURIComponent(courseId)}`;
  document.getElementById('back-link').href = backHref;
  document.getElementById('cancel-link').href = backHref;

  if (mode === 'edit') {
    document.getElementById('page-title').textContent = `Редактировать: ${currentLesson.title} · Классный журнал`;
    document.getElementById('eyebrow').textContent = 'Редактирование урока';
    document.getElementById('heading').textContent = currentLesson.title;
    document.getElementById('submit-btn').textContent = 'Сохранить изменения';
  }

  // --- alfaCRM: загружаем темы ---
  let subjects = [];
  try {
    const data = await api.get('/api/teacher/alfacrm/subjects');
    subjects = data.subjects || [];
  } catch (_) {}
  if (subjects.length) {
    const field = document.getElementById('alfacrm-field');
    field.hidden = false;
    const select = document.getElementById('alfacrmSubject');
    subjects.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      const idx = select.selectedIndex;
      document.getElementById('alfacrmSubjectId').value = select.value;
      document.getElementById('alfacrmSubjectName').value = idx > 0 ? select.options[idx].textContent : '';
    });
  }

  function fillForm(lesson) {
    form.title.value = lesson.title;
    form.description.value = lesson.description || '';
    document.getElementById('content-hidden').value = lesson.content || '';
    const editorContent = document.querySelector('.editor-content');
    if (editorContent) editorContent.innerHTML = lesson.content || '';
    form.deadline.value = (lesson.deadline || '').slice(0, 10);
    if (subjects.length && lesson.alfacrmSubjectId) {
      document.getElementById('alfacrmSubject').value = lesson.alfacrmSubjectId;
      document.getElementById('alfacrmSubjectId').value = lesson.alfacrmSubjectId;
      document.getElementById('alfacrmSubjectName').value = lesson.alfacrmSubjectName || '';
    }

    if (lesson.coverImage) {
      const box = document.getElementById('current-cover');
      box.hidden = false;
      box.innerHTML = `
        <img src="/files/${encodeURIComponent(lesson.coverImage)}" alt="" style="width:60px;height:40px;object-fit:cover;border:1px solid var(--ink);">
        <label class="checkbox-row"><input type="checkbox" name="removeCover" value="1"> Удалить текущую обложку</label>`;
    }

    if (lesson.video) {
      const box = document.getElementById('current-video');
      box.hidden = false;
      const label = lesson.video.type === 'file' ? (lesson.video.originalName || 'видеофайл') : lesson.video.value;
      box.innerHTML = `
        <span>Сейчас: ${escapeHtml(label)}</span>
        <label class="checkbox-row"><input type="checkbox" name="removeVideo" value="1"> Удалить видео</label>`;
    }

    const attList = document.getElementById('current-attachments');
    if (lesson.attachments && lesson.attachments.length) {
      attList.innerHTML = lesson.attachments.map((a) => `
        <li style="border:1px solid #cfc6ae; background:var(--paper-2); padding:9px 10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <span>${escapeHtml(a.originalName)} <small class="muted">(${formatFileSize(a.size)})</small></span>
          <label class="checkbox-row"><input type="checkbox" name="removeAttachments" value="${a.filename}"> удалить</label>
        </li>`).join('');
    }
  }

<<<<<<< HEAD
  // --- Предвыбор теста для нового урока ---
  const testActions = document.getElementById('test-actions');
  const testPlanPanel = document.getElementById('test-plan-panel');
  const testPlanText = document.getElementById('test-plan-text');
  const newTestBtn = document.getElementById('new-test-btn');
  const chooseTestBtn = document.getElementById('choose-test-btn');

  function renderTestPlan() {
    if (pendingCopyTest) {
      testPlanPanel.hidden = false;
      testPlanText.textContent = `Будет скопирован тест «${pendingCopyTest.title}» (из урока «${pendingCopyTest.lessonTitle}» курса «${pendingCopyTest.courseTitle}»)`;
    } else if (pendingCreateNew) {
      testPlanPanel.hidden = false;
      testPlanText.textContent = 'После сохранения урока откроется форма создания нового теста';
    } else {
      testPlanPanel.hidden = true;
    }
  }

  if (mode === 'create') {
    testActions.hidden = false;
    renderTestPlan();

    newTestBtn.addEventListener('click', () => {
      pendingCopyTest = null;
      pendingCreateNew = !pendingCreateNew;
      renderTestPlan();
    });

    chooseTestBtn.addEventListener('click', () => {
      pendingCreateNew = false;
      openChooseTestModal();
    });

    document.getElementById('test-plan-clear').addEventListener('click', () => {
      pendingCopyTest = null;
      pendingCreateNew = false;
      renderTestPlan();
    });
  }

  // Модалка «Из своих тестов»: курс → тест.
  function openChooseTestModal() {
    const list = document.getElementById('choose-test-list');
    const errorsBox2 = document.getElementById('choose-test-errors');
    const searchInput = document.getElementById('choose-test-search');
    const backBtn = document.getElementById('choose-test-back');
    const titleEl = document.getElementById('choose-test-title');
    const metaEl = document.getElementById('choose-test-meta');

    let groups = [];
    let selectedCourseId = null;

    renderErrors(errorsBox2, null);
    searchInput.value = '';
    selectedCourseId = null;
    titleEl.textContent = 'Из своих тестов';
    metaEl.textContent = 'Выберите тест — после сохранения урока он будет скопирован на него';
    backBtn.hidden = true;
    list.innerHTML = '<span class="checkbox-grid__empty">Загрузка…</span>';
    openModal('choose-test-modal');

    (async () => {
      try {
        const data = await api.get('/api/teacher/tests');
        const byCourse = new Map();
        data.tests.forEach((t) => {
          if (!byCourse.has(t.courseId)) {
            byCourse.set(t.courseId, { courseId: t.courseId, courseTitle: t.courseTitle, tests: [] });
          }
          byCourse.get(t.courseId).tests.push(t);
        });
        groups = Array.from(byCourse.values());

        if (!groups.length) {
          list.innerHTML = '<span class="checkbox-grid__empty">Пока нет тестов для копирования. Создайте тест в любом уроке — его можно будет перенести сюда.</span>';
          return;
        }
        renderCourses('');
      } catch (err) {
        list.innerHTML = '';
        renderErrors(errorsBox2, err.errors || [err.message]);
      }
    })();

    function renderCourses(query) {
      titleEl.textContent = 'Из своих тестов';
      metaEl.textContent = 'Выберите курс, из которого хотите скопировать тест';
      backBtn.hidden = true;
      searchInput.placeholder = 'Поиск курса…';

      const q = query.trim().toLowerCase();
      const filtered = groups.filter((g) => !q || g.courseTitle.toLowerCase().includes(q));
      if (!filtered.length) {
        list.innerHTML = `<span class="checkbox-grid__empty">${q ? 'Ничего не найдено по запросу.' : 'Пока нет курсов с тестами для копирования.'}</span>`;
        return;
      }
      list.innerHTML = filtered.map((g) => `
        <div class="person-row" style="justify-content: space-between; cursor: pointer;" data-choose-course="${g.courseId}">
          <div>
            <div class="person-row__name">${escapeHtml(g.courseTitle)}</div>
            <div class="person-row__meta">${pluralize(g.tests.length, 'тест', 'теста', 'тестов')}</div>
          </div>
          <span class="muted">→</span>
        </div>`).join('');
    }

    function renderTests(query) {
      const group = groups.find((g) => g.courseId === selectedCourseId);
      if (!group) { renderCourses(query); return; }

      titleEl.textContent = group.courseTitle;
      metaEl.textContent = 'Выберите тест — после сохранения урока он будет скопирован на него';
      backBtn.hidden = false;
      searchInput.placeholder = 'Поиск теста…';

      const q = query.trim().toLowerCase();
      const filtered = group.tests.filter((t) => {
        if (!q) return true;
        return t.title.toLowerCase().includes(q) || t.lessonTitle.toLowerCase().includes(q);
      });
      if (!filtered.length) {
        list.innerHTML = `<span class="checkbox-grid__empty">${q ? 'Ничего не найдено по запросу.' : 'В этом курсе пока нет тестов.'}</span>`;
        return;
      }
      list.innerHTML = filtered.map((t) => `
        <div class="person-row" style="justify-content: space-between; cursor: pointer;" data-pick-test="${t.id}">
          <div>
            <div class="person-row__name">${escapeHtml(t.title)}</div>
            <div class="person-row__meta">Урок: ${escapeHtml(t.lessonTitle)} · ${t.questions.length} ${pluralize(t.questions.length, 'вопрос', 'вопроса', 'вопросов')}</div>
          </div>
          <button class="btn btn--sm" type="button">Выбрать</button>
        </div>`).join('');
    }

    function applySearch() {
      if (selectedCourseId) renderTests(searchInput.value);
      else renderCourses(searchInput.value);
    }

    searchInput.addEventListener('input', applySearch);

    list.addEventListener('click', (e) => {
      const courseRow = e.target.closest('[data-choose-course]');
      if (courseRow) {
        selectedCourseId = courseRow.dataset.chooseCourse;
        searchInput.value = '';
        renderTests('');
        return;
      }
      const pickRow = e.target.closest('[data-pick-test]');
      if (pickRow) {
        const group = groups.find((g) => g.courseId === selectedCourseId);
        const test = group ? group.tests.find((t) => t.id === pickRow.dataset.pickTest) : null;
        if (!test) return;
        pendingCopyTest = test;
        renderTestPlan();
        closeModal('choose-test-modal');
      }
    });

    backBtn.addEventListener('click', () => {
      selectedCourseId = null;
      searchInput.value = '';
      renderCourses('');
    });
  }

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    renderErrors(errorsBox, null);
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;

    const fd = new FormData(form);

    try {
      if (mode === 'edit') {
        await api.putForm(`/api/teacher/lessons/${lessonId}`, fd);
        window.location.href = `/teacher/lesson.html?id=${encodeURIComponent(lessonId)}`;
      } else {
        const result = await api.postForm(`/api/teacher/courses/${courseId}/lessons`, fd);
<<<<<<< HEAD
        const newLessonId = result.lesson.id;
        if (pendingCopyTest) {
          await api.postJson(`/api/teacher/lessons/${newLessonId}/test/copy`, { testId: pendingCopyTest.id });
        }
        if (pendingCreateNew) {
          window.location.href = `/teacher/test-form.html?lessonId=${encodeURIComponent(newLessonId)}`;
        } else {
          window.location.href = `/teacher/lesson.html?id=${encodeURIComponent(newLessonId)}`;
        }
=======
        window.location.href = `/teacher/lesson.html?id=${encodeURIComponent(result.lesson.id)}`;
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
      }
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
      submitBtn.disabled = false;
    }
  });
})();
