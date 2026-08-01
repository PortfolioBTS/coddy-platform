// public/js/pages/teacher-course-form.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const courseId = qs('id');
  const mode = courseId ? 'edit' : 'create';

  const form = document.getElementById('course-form');
  const errorsBox = document.getElementById('form-errors');
  const studentsGrid = document.getElementById('students-grid');
  const currentCoverBox = document.getElementById('current-cover');

  // Поле «Учебный год» — только цифры и тире (формат 2026-2027), остальное отбрасываем на лету.
  form.academicYear.addEventListener('input', () => {
    const cleaned = form.academicYear.value.replace(/[^\d-]/g, '');
    if (cleaned !== form.academicYear.value) form.academicYear.value = cleaned;
  });

  let enrolledIds = [];
  let currentCourse = null;

  if (mode === 'edit') {
    document.getElementById('page-title').textContent = 'Редактирование курса · Классный журнал';
    document.getElementById('eyebrow').textContent = 'Редактирование курса';
    document.getElementById('submit-btn').textContent = 'Сохранить изменения';
    document.getElementById('back-link').href = `/teacher/course.html?id=${encodeURIComponent(courseId)}`;
    document.getElementById('cancel-link').href = `/teacher/course.html?id=${encodeURIComponent(courseId)}`;

    try {
      const data = await api.get(`/api/teacher/courses/${courseId}`);
      currentCourse = data.course;
      document.getElementById('heading').textContent = currentCourse.title;
      form.title.value = currentCourse.title;
      form.description.value = currentCourse.description || '';
      form.academicYear.value = currentCourse.academicYear || '';
      enrolledIds = data.enrolledStudents.map((s) => s.id);

      if (currentCourse.coverImage) {
        currentCoverBox.hidden = false;
        currentCoverBox.innerHTML = `
          <img src="/files/${encodeURIComponent(currentCourse.coverImage)}" alt="" style="width:60px;height:40px;object-fit:cover;border:1px solid var(--ink);">
          <label class="checkbox-row"><input type="checkbox" name="removeCover" value="1"> Удалить текущую обложку</label>`;
      }

      renderStudents(data.allStudents, enrolledIds);
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    }
  } else {
    try {
      const { students } = await api.get('/api/teacher/students');
      renderStudents(students, []);
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    }
  }

  function renderStudents(students, checkedIds) {
    if (!students.length) {
      studentsGrid.innerHTML = '<span class="checkbox-grid__empty">Пока нет ни одного зарегистрированного ученика.</span>';
      return;
    }
    studentsGrid.innerHTML = students.map((s) => `
      <label class="checkbox-row">
        <input type="checkbox" name="studentIds" value="${s.id}" ${checkedIds.includes(s.id) ? 'checked' : ''}>
        ${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)} <span class="muted">— ${escapeHtml(s.city)}</span>
      </label>`).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    renderErrors(errorsBox, null);

    const fd = new FormData(form);
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;

    try {
      let result;
      if (mode === 'edit') {
        result = await api.putForm(`/api/teacher/courses/${courseId}`, fd);
        window.location.href = `/teacher/course.html?id=${encodeURIComponent(courseId)}`;
      } else {
        result = await api.postForm('/api/teacher/courses', fd);
        window.location.href = `/teacher/course.html?id=${encodeURIComponent(result.course.id)}`;
      }
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
      submitBtn.disabled = false;
    }
  });
})();
