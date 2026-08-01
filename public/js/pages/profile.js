(async function () {
  const requiredRole = window.location.pathname.startsWith('/teacher/') ? 'teacher' : 'student';
  const user = await bootPage(requiredRole);
  if (!user) return;

  document.getElementById('role-badge').textContent = user.role === 'teacher' ? 'Учитель' : 'Ученик';

  let balance = null;
  if (user.role === 'student') {
    try {
      const data = await api.get('/api/student/alfacrm/balance');
      balance = data.balance;
    } catch (_) {}
  }

  const fields = [
    ['Имя', user.firstName],
    ['Фамилия', user.lastName],
    ['Город', user.city],
    ['Телефон', user.phone],
    ['Электронная почта', user.email],
    ['В журнале с', formatDate(user.createdAt)],
  ];

  if (user.role === 'student') {
    const age = calcAge(user.birthDate);
    fields.push(['Возраст', age != null ? String(age) : '—']);
    fields.push(['Коддикоины', balance != null ? String(balance) : '—']);
  }

  let currentTheme = localStorage.getItem('coddy-theme') || 'light';
  if (currentTheme === 'dark') currentTheme = 'gray';
  const themeLabels = { light: 'Светлая', dark: 'Тёмная', gray: 'Серая', coddyshop: 'CODDY' };

  document.getElementById('content').innerHTML = `
    ${fields.map(([label, value]) => `
      <div class="profile-field">
        <p class="profile-field__label">${escapeHtml(label)}</p>
        <p class="profile-field__value">${escapeHtml(value)}</p>
      </div>`).join('')}
    <div class="profile-field">
      <p class="profile-field__label">Тема оформления</p>
      <select class="profile-theme-select" id="theme-select">
        ${Object.entries(themeLabels).map(([val, label]) =>
          `<option value="${val}"${val === currentTheme ? ' selected' : ''}>${label}</option>`
        ).join('')}
      </select>
    </div>`;

  document.getElementById('theme-select').addEventListener('change', (e) => {
    const theme = e.target.value;
    localStorage.setItem('coddy-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  });
})();
