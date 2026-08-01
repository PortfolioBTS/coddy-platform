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
        window.location.href = `/teacher/lesson.html?id=${encodeURIComponent(result.lesson.id)}`;
      }
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
      submitBtn.disabled = false;
    }
  });
})();
