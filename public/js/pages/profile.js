(async function () {
<<<<<<< HEAD
  const path = window.location.pathname;
  const requiredRole = path.startsWith('/teacher/') ? 'teacher' : path.startsWith('/parent/') ? 'parent' : 'student';
  const user = await bootPage(requiredRole);
  if (!user) return;

  const isStudent = user.role === 'student';
  const isParent = user.role === 'parent';
  const content = document.getElementById('content');
  let balance = null;
  let children = [];

  if (isStudent) {
=======
  const requiredRole = window.location.pathname.startsWith('/teacher/') ? 'teacher' : 'student';
  const user = await bootPage(requiredRole);
  if (!user) return;

  document.getElementById('role-badge').textContent = user.role === 'teacher' ? 'Учитель' : 'Ученик';

  let balance = null;
  if (user.role === 'student') {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    try {
      const data = await api.get('/api/student/alfacrm/balance');
      balance = data.balance;
    } catch (_) {}
  }

<<<<<<< HEAD
  if (isParent) {
    try {
      const data = await api.get('/api/parent/children');
      children = data.children || [];
    } catch (_) {}
  }

  // ---------- Тема ----------
=======
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

>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  let currentTheme = localStorage.getItem('coddy-theme') || 'light';
  if (currentTheme === 'dark') currentTheme = 'gray';
  const themeLabels = { light: 'Светлая', dark: 'Тёмная', gray: 'Серая', coddyshop: 'CODDY' };

<<<<<<< HEAD
  // ---------- Отображение ----------
  function roleLabelText() {
    if (isStudent) return 'Ученик';
    if (isParent) return 'Родитель';
    return 'Учитель';
  }

  function render(userData) {
    const age = isStudent ? calcAge(userData.birthDate) : null;
    const infoFields = [
      ['Имя', userData.firstName],
      ['Фамилия', userData.lastName],
      ['Город', userData.city],
      ['Телефон', userData.phone],
      ['Электронная почта', userData.email],
    ];
    if (isStudent) infoFields.push(['Возраст', age != null ? String(age) : '—']);

    const statsFields = isStudent
      ? [
          ['Коддикоины', balance != null ? String(balance) : '—'],
          ['В журнале с', formatDate(userData.createdAt)],
        ]
      : [['В журнале с', formatDate(userData.createdAt)]];

    const badgeClass = isStudent ? 'badge--gold' : isParent ? 'badge--gray' : 'badge--red';

    content.innerHTML = `
      <div class="profile-hero">
        <div class="profile-hero__body">
          <div class="profile-hero__name">${escapeHtml(userData.firstName)} ${escapeHtml(userData.lastName)}</div>
          <div class="profile-hero__meta">${roleLabelText()} · в журнале с ${formatDate(userData.createdAt)}</div>
        </div>
        <span class="badge ${badgeClass}">${roleLabelText()}</span>
      </div>

      <div class="profile-section">
        <div class="profile-section__title">Личные данные</div>
        <div class="profile-grid">
          ${infoFields.map(([label, value]) => `
            <div class="profile-field">
              <p class="profile-field__label">${escapeHtml(label)}</p>
              <p class="profile-field__value">${escapeHtml(value)}</p>
            </div>`).join('')}
        </div>
      </div>

      ${isParent ? `
      <div class="profile-section">
        <div class="profile-section__title">Ваши дети</div>
        ${children.length ? `
          <div class="panel" style="margin:0;">
            ${children.map((c) => `
              <div class="person-row" style="padding:12px 15px;">
                <div class="avatar">${initials(c)}</div>
                <div>
                  <p class="person-row__name">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</p>
                  <p class="person-row__meta">Логин: ${escapeHtml(c.email)}</p>
                </div>
              </div>`).join('')}
          </div>` : `
          <p class="muted">К аккаунту пока не привязан ни один ребёнок.</p>`}
      </div>` : ''}

      <div class="profile-section">
        <div class="profile-section__title">Аккаунт</div>
        <div class="profile-grid">
          ${statsFields.map(([label, value]) => `
            <div class="profile-field">
              <p class="profile-field__label">${escapeHtml(label)}</p>
              <p class="profile-field__value">${escapeHtml(value)}</p>
            </div>`).join('')}
        </div>
      </div>

      <div class="profile-section">
        <div class="profile-section__title">Уведомления</div>
        <div class="tg-fields-row">
          <div class="profile-field">
            <p class="profile-field__label">Ник в MAX</p>
            <p class="profile-field__value">${escapeHtml(userData.max || '—')}</p>
          </div>
          <div class="profile-field">
            <p class="profile-field__label">ID в Telegram</p>
            <div class="tg-id-row">
              <input class="input" type="text" id="tg-id-input" inputmode="numeric" pattern="[0-9]{5,15}" maxlength="15" placeholder="123456789" value="${escapeHtml(userData.tgId != null ? userData.tgId : '')}">
              <div class="tg-id-actions">
                <button class="btn btn--sm" type="button" id="tg-id-save">Сохранить</button>
                <button class="btn btn--sm btn--danger" type="button" id="tg-id-unsubscribe">Отписаться</button>
              </div>
            </div>
          </div>
        </div>
        <span class="field__hint" style="margin-top:8px;">Напишите боту <b>@CODDYworkBOT</b>, нажмите «Start» — бот пришлёт ваш ID. На него придут уведомления о новых уроках и домашних заданиях.</span>
        <span class="field__hint" id="tg-id-status"></span>
      </div>

      <div class="profile-section">
        <div class="profile-section__title">Параметры</div>
        <div class="profile-settings">
          <button class="btn" type="button" id="edit-btn">✎ Редактировать данные</button>
          <button class="btn" type="button" id="password-btn">🔑 Сменить пароль</button>
          ${isStudent ? '<button class="btn" type="button" id="certificates-btn">🏆 Просмотреть сертификаты</button>' : ''}
          <div class="profile-field profile-field--theme">
            <p class="profile-field__label">Тема оформления</p>
            <select class="profile-theme-select" id="theme-select">
              ${Object.entries(themeLabels).map(([val, label]) =>
                `<option value="${val}"${val === currentTheme ? ' selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>`;

    document.getElementById('theme-select').addEventListener('change', (e) => {
      currentTheme = e.target.value;
      localStorage.setItem('coddy-theme', currentTheme);
      document.documentElement.setAttribute('data-theme', currentTheme);
    });

    document.getElementById('edit-btn').addEventListener('click', openEditModal);
    document.getElementById('password-btn').addEventListener('click', openPasswordModal);

    const tgInput = document.getElementById('tg-id-input');
    const tgSave = document.getElementById('tg-id-save');
    const tgUnsub = document.getElementById('tg-id-unsubscribe');
    const tgStatus = document.getElementById('tg-id-status');
    tgSave.addEventListener('click', async () => {
      tgStatus.textContent = '';
      tgSave.disabled = true;
      try {
        const data = await api.putJson('/api/tg-id', { tgId: tgInput.value.trim() });
        user.tgId = data.user.tgId;
        tgStatus.textContent = '✓ Сохранено. Уведомления включены.';
        tgStatus.style.color = 'var(--ok, #2e7d32)';
      } catch (err) {
        tgStatus.textContent = (err.errors || [err.message]).join(' ');
        tgStatus.style.color = 'var(--red)';
      } finally {
        tgSave.disabled = false;
      }
    });
    tgUnsub.addEventListener('click', async () => {
      tgStatus.textContent = '';
      if (!user.tgId) {
        tgStatus.textContent = 'ID не привязан.';
        tgStatus.style.color = 'var(--red)';
        return;
      }
      if (!confirm('Отписаться от уведомлений в Telegram?')) return;
      tgUnsub.disabled = true;
      try {
        const data = await api.delete('/api/tg-id');
        user.tgId = data.user.tgId;
        tgInput.value = '';
        tgStatus.textContent = '✓ Отписан. Уведомления больше не придут.';
        tgStatus.style.color = 'var(--red)';
      } catch (err) {
        tgStatus.textContent = (err.errors || [err.message]).join(' ');
        tgStatus.style.color = 'var(--red)';
      } finally {
        tgUnsub.disabled = false;
      }
    });

    if (isStudent) {
      document.getElementById('certificates-btn').addEventListener('click', async () => {
        const box = document.getElementById('certificates-content');
        box.innerHTML = '<p class="muted">Загрузка…</p>';
        document.getElementById('certificates-modal').hidden = false;
        try {
          const data = await api.get('/api/student/certificates');
          const list = data.certificates || [];
          box.innerHTML = list.length
            ? `
              <div class="panel" style="margin:0;">
                ${list.map((c) => `
                  <div class="quiz-attempt">
                    <div>
                      <p class="cell-title" style="margin:0;">${escapeHtml(c.courseName)}</p>
                      <p class="muted" style="font-size:12px; margin:2px 0;">№ ${escapeHtml(c.certNumber)}${c.issueDate ? ` · от ${escapeHtml(c.issueDate)}` : ''} · ${formatDate(c.createdAt)}</p>
                    </div>
                    <a class="btn btn--sm" href="/files/${encodeURIComponent(c.file)}" download>⬇️ Скачать</a>
                  </div>`).join('')}
              </div>`
            : `
              <div class="empty-state" style="padding: 24px 0;">
                <div class="empty-state__icon">🏆</div>
                <div class="empty-state__title">Сертификатов пока нет</div>
                <p class="empty-state__text">Сертификаты появятся здесь, когда школа их вам выдаст.</p>
              </div>`;
        } catch (err) {
          box.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
        }
      });
    }
  }

  // ---------- Редактирование ----------
  function openEditModal() {
    renderErrors(document.getElementById('edit-errors'), []);
    document.getElementById('edit-firstName').value = user.firstName || '';
    document.getElementById('edit-lastName').value = user.lastName || '';
    document.getElementById('edit-city').value = user.city || '';
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-max').value = user.max || '';

    document.getElementById('edit-modal').hidden = false;
  }

  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorsBox = document.getElementById('edit-errors');
    renderErrors(errorsBox, []);

    const payload = {
      firstName: document.getElementById('edit-firstName').value.trim(),
      lastName: document.getElementById('edit-lastName').value.trim(),
      city: document.getElementById('edit-city').value,
      phone: document.getElementById('edit-phone').value.trim(),
      email: document.getElementById('edit-email').value.trim(),
      max: document.getElementById('edit-max').value.trim(),
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const data = await api.putJson('/api/profile', payload);
      user.firstName = data.user.firstName;
      user.lastName = data.user.lastName;
      user.city = data.user.city;
      user.phone = data.user.phone;
      user.email = data.user.email;
      user.max = data.user.max;
      document.getElementById('edit-modal').hidden = true;
      renderNav(user);
      render(user);
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Смена пароля ----------
  function openPasswordModal() {
    renderErrors(document.getElementById('password-errors'), []);
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
    document.getElementById('password-modal').hidden = false;
  }

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorsBox = document.getElementById('password-errors');
    renderErrors(errorsBox, []);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api.putJson('/api/password', {
        currentPassword: document.getElementById('pw-current').value,
        newPassword: document.getElementById('pw-new').value,
        passwordConfirm: document.getElementById('pw-confirm').value,
      });
      document.getElementById('password-modal').hidden = true;
      alert('Пароль успешно изменён.');
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    } finally {
      btn.disabled = false;
    }
  });

  render(user);
=======
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
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
})();
