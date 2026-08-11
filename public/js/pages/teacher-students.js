(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

<<<<<<< HEAD
  const isDirector = user.role === 'director';

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD
        <div class="table-scroll">
          <table class="table students-table">
            <thead><tr><th>Имя</th><th>Фамилия</th><th>Город</th><th>Контакты</th><th>Пароль</th><th>Возраст</th><th>Дата рег.</th><th>Коддикоины</th><th></th></tr></thead>
=======
        <div>
          <table class="table students-table">
            <thead><tr><th>Имя</th><th>Фамилия</th><th>Город</th><th>Телефон</th><th>Почта</th><th>Возраст</th><th>Дата рег.</th><th>Коддикоины</th><th></th></tr></thead>
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD
                <td class="contacts-cell">
                  <span class="contacts-phone">${escapeHtml(s.phone)}</span>
                  <span class="contacts-email">${escapeHtml(s.email)}</span>
                </td>
                <td class="cell-year">${escapeHtml(s.plainPassword || '—')}</td>
=======
                <td class="cell-year">${escapeHtml(s.phone)}</td>
                <td>${escapeHtml(s.email)}</td>
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD

  // ---------- Импорт учеников (только для директора) ----------
  if (isDirector) {
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('import-file');
    const fileLabel = document.getElementById('import-file-name');
    const errorsBox = document.getElementById('import-errors');
    const uploadDiv = document.getElementById('import-upload');
    const resultDiv = document.getElementById('import-result');
    let lastResult = null;

    function downloadText(text, filename, mime) {
      const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function resetImport() {
      fileInput.value = '';
      fileLabel.textContent = '';
      renderErrors(errorsBox, []);
      uploadDiv.hidden = false;
      resultDiv.hidden = true;
      document.getElementById('import-table').querySelector('tbody').innerHTML = '';
    }

    importBtn.hidden = false;
    importBtn.addEventListener('click', () => {
      resetImport();
      openModal('import-modal');
    });

    fileInput.addEventListener('change', () => {
      fileLabel.textContent = fileInput.files && fileInput.files.length
        ? `Выбран файл: ${fileInput.files[0].name}`
        : '';
    });

    document.getElementById('template-btn').addEventListener('click', () => {
      const csv = '\uFEFFФамилия;Имя;Город;Телефон;Почта;Дата рождения\n' +
        'Иванов;Иван;Сочи;+7 (900) 123-45-67;;01.01.2015\n' +
        'Петрова;Анна;Краснодар;+7 (911) 555-55-55;anna.petrova@mail.ru;\n';
      downloadText(csv, 'шаблон_импорта_учеников.csv', 'text/csv;charset=utf-8');
    });

    document.getElementById('import-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      renderErrors(errorsBox, []);
      if (!fileInput.files || !fileInput.files.length) {
        renderErrors(errorsBox, ['Выберите файл с таблицей.']);
        return;
      }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        lastResult = await api.postForm('/api/director/import-students', fd);
        const summary = document.getElementById('import-summary');
        summary.innerHTML = `
          <span class="badge badge--gold">Создано: ${lastResult.created.length}</span>
          <span class="badge badge--red">Дубликаты: ${lastResult.duplicates.length}</span>
          <span class="badge badge--gray">Строк с ошибками: ${lastResult.invalid.length}</span>`;
        const tbody = document.getElementById('import-table').querySelector('tbody');
        tbody.innerHTML = lastResult.created.length
          ? lastResult.created.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="cell-title">${escapeHtml(c.user.lastName)}</td>
                <td>${escapeHtml(c.user.firstName)}</td>
                <td>${escapeHtml(c.login)}</td>
                <td><b>${escapeHtml(c.password)}</b></td>
              </tr>`).join('')
          : '<tr><td colspan="5" style="text-align:center;"><p class="muted">Нет созданных аккаунтов.</p></td></tr>';
        uploadDiv.hidden = true;
        resultDiv.hidden = false;
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('download-credentials').addEventListener('click', () => {
      if (!lastResult) return;
      const lines = ['Фамилия;Имя;Логин;Пароль'];
      lastResult.created.forEach((c) => {
        lines.push([c.user.lastName, c.user.firstName, c.login, c.password].join(';'));
      });
      downloadText('\uFEFF' + lines.join('\n'), 'данные_для_выдачи_ученикам.csv', 'text/csv;charset=utf-8');
    });

    document.getElementById('import-done').addEventListener('click', () => {
      closeModal('import-modal');
      window.location.reload();
    });
  }
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
})();
