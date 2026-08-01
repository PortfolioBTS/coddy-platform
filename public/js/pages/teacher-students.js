(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  const content = document.getElementById('content');
  const controls = document.getElementById('controls');
  const searchInput = document.getElementById('search-input');
  const cityFilter = document.getElementById('city-filter');
  const countEl = document.getElementById('students-count');
  let allStudents = [];
  let balances = {};

  try {
    const { students } = await api.get('/api/teacher/students');
    allStudents = students;
    controls.hidden = false;
    countEl.textContent = `Всего: ${students.length}`;

    const cities = [...new Set(students.map((s) => s.city).filter(Boolean))].sort();
    cityFilter.innerHTML = '<option value="all">Все города</option>' +
      cities.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    const idsWithCrm = students.filter((s) => s.alfacrmCustomerId).map((s) => s.id);
    if (idsWithCrm.length) {
      const qs = idsWithCrm.map((id) => 'ids=' + encodeURIComponent(id)).join('&');
      try {
        const data = await api.get('/api/teacher/students/balances?' + qs);
        balances = data.balances || {};
      } catch (_) {}
    }

    render(students);
  } catch (err) {
    content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    return;
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const city = cityFilter.value;
    let filtered = allStudents;
    if (q) {
      filtered = filtered.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    }
    if (city !== 'all') {
      filtered = filtered.filter((s) => s.city === city);
    }
    render(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  cityFilter.addEventListener('change', applyFilters);

  function render(students) {
    if (!students.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <div class="empty-state__title">${allStudents.length ? 'Ничего не найдено' : 'Учеников пока нет'}</div>
          <p class="empty-state__text">${allStudents.length ? 'Попробуй изменить поисковый запрос.' : 'Как только кто-то зарегистрируется как ученик, он появится в этом списке.'}</p>
        </div>`;
      return;
    }

    content.innerHTML = `
      <div class="panel students-panel">
        <span class="panel__tab">Список учеников</span>
        <div>
          <table class="table students-table">
            <thead><tr><th>Имя</th><th>Фамилия</th><th>Город</th><th>Телефон</th><th>Почта</th><th>Возраст</th><th>Дата рег.</th><th>Коддикоины</th><th></th></tr></thead>
            <tbody>${students.map((s) => {
              const balance = balances[s.id];
              const balanceCell = balance != null
                ? `<span class="badge badge--gold">${balance}</span>`
                : '<span class="muted">—</span>';
              const age = calcAge(s.birthDate);
              return `<tr>
                <td class="cell-title">${escapeHtml(s.firstName)}</td>
                <td>${escapeHtml(s.lastName)}</td>
                <td>${escapeHtml(s.city)}</td>
                <td class="cell-year">${escapeHtml(s.phone)}</td>
                <td>${escapeHtml(s.email)}</td>
                <td class="cell-year">${age != null ? age : '—'}</td>
                <td>${formatDate(s.createdAt)}</td>
                <td style="text-align:center;">${balanceCell}</td>
                <td style="padding-right:20px"><button class="btn btn--sm btn--danger student-delete" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.firstName + ' ' + s.lastName)}">✕</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <p class="panel__count">Всего: ${students.length}</p>
      </div>`;

    document.querySelectorAll('.student-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        if (!confirm(`Удалить ученика «${name}»? Он будет отчислен со всех курсов. Это действие нельзя отменить.`)) return;
        try {
          await api.postJson('/api/teacher/students/' + id + '/delete', {});
          allStudents = allStudents.filter((s) => s.id !== id);
          render(allStudents);
          countEl.textContent = `Всего: ${allStudents.length}`;
        } catch (err) {
          alert('Ошибка: ' + (err.message || 'неизвестная ошибка'));
        }
      });
    });
  }
})();
