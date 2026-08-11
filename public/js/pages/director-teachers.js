// public/js/pages/director-teachers.js

(async function () {
  const user = await bootPage('director');
  if (!user) return;

  const content = document.getElementById('content');
  const searchInput = document.getElementById('search-input');
  const countEl = document.getElementById('teachers-count');
  const codeInput = document.getElementById('teacher-code-input');
  const codeSave = document.getElementById('teacher-code-save');
  const codeStatus = document.getElementById('teacher-code-status');
  let allTeachers = [];

  codeInput.value = user.teacherCode || '';

  codeSave.addEventListener('click', async () => {
    codeStatus.textContent = '';
    const code = codeInput.value.trim();
    codeSave.disabled = true;
    try {
      await api.putJson('/api/director/teacher-code', { teacherCode: code });
      user.teacherCode = code;
      codeStatus.textContent = '✓ Сохранено';
      setTimeout(() => { codeStatus.textContent = ''; }, 2000);
    } catch (err) {
      codeStatus.textContent = 'Ошибка: ' + (err.message || 'не удалось сохранить');
      codeStatus.style.color = 'var(--red)';
      setTimeout(() => {
        codeStatus.textContent = '';
        codeStatus.style.color = '';
      }, 3000);
    } finally {
      codeSave.disabled = false;
    }
  });

  try {
    const { teachers } = await api.get('/api/director/teachers');
    allTeachers = teachers;
    countEl.textContent = `Всего: ${teachers.length}`;
    render(teachers);
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    return;
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    let filtered = allTeachers;
    if (q) {
      filtered = filtered.filter((t) =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q)
      );
    }
    render(filtered);
  }

  searchInput.addEventListener('input', applyFilters);

  function render(teachers) {
    if (!teachers.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🧑‍🏫</div>
          <div class="empty-state__title">${allTeachers.length ? 'Ничего не найдено' : 'Педагогов пока нет'}</div>
          <p class="empty-state__text">${allTeachers.length ? 'Попробуйте изменить поисковый запрос.' : 'Как только кто-то зарегистрируется как педагог, он появится в этом списке.'}</p>
        </div>`;
      return;
    }

    content.innerHTML = `
      <div class="panel">
        <span class="panel__tab">Список педагогов</span>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Имя</th><th>Фамилия</th><th>Контакты</th><th>Дата рег.</th><th></th></tr></thead>
            <tbody>${teachers.map((t) => `
              <tr data-teacher-id="${escapeHtml(t.id)}">
                <td class="cell-title">${escapeHtml(t.firstName)}</td>
                <td>${escapeHtml(t.lastName)}</td>
                <td class="contacts-cell">
                  <span class="contacts-phone">${escapeHtml(t.phone || '—')}</span>
                  <span class="contacts-email">${escapeHtml(t.email || '—')}</span>
                </td>
                <td>${formatDate(t.createdAt)}</td>
                <td style="padding-right:20px;"><button class="btn btn--sm btn--danger teacher-delete" type="button" data-id="${escapeHtml(t.id)}" data-name="${escapeHtml(t.firstName + ' ' + t.lastName)}">✕</button></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="panel__count">Всего: ${teachers.length}</p>
      </div>`;

    // Удаление педагога
    content.querySelectorAll('.teacher-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        if (!confirm(`Удалить педагога «${name}»? Все его курсы, уроки и материалы будут удалены. Это действие нельзя отменить.`)) return;
        try {
          await api.postJson(`/api/director/teachers/${btn.dataset.id}/delete`, {});
          allTeachers = allTeachers.filter((t) => t.id !== btn.dataset.id);
          countEl.textContent = `Всего: ${allTeachers.length}`;
          render(allTeachers);
        } catch (err) {
          alert('Ошибка: ' + (err.message || 'неизвестная ошибка'));
        }
      });
    });
  }
})();
