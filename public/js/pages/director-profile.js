// public/js/pages/director-profile.js

(async function () {
  const user = await bootPage('director');
  if (!user) return;

  const content = document.getElementById('content');

  // ---------- Тема ----------
  let currentTheme = localStorage.getItem('coddy-theme') || 'light';
  if (currentTheme === 'dark') currentTheme = 'gray';
  const themeLabels = { light: 'Светлая', dark: 'Тёмная', gray: 'Серая', coddyshop: 'CODDY' };

  function render(userData) {
    const infoFields = [
      ['Имя', userData.firstName],
      ['Фамилия', userData.lastName],
      ['Город', userData.city],
      ['Телефон', userData.phone],
      ['Электронная почта', userData.email],
    ];
    const accountFields = [
      ['В журнале с', formatDate(userData.createdAt)],
      ['Код педагога', userData.teacherCode || '—'],
    ];

    content.innerHTML = `
      <div class="profile-hero">
        <div class="profile-hero__body">
          <div class="profile-hero__name">${escapeHtml(userData.firstName)} ${escapeHtml(userData.lastName)}</div>
          <div class="profile-hero__meta">Директор · в журнале с ${formatDate(userData.createdAt)}</div>
        </div>
        <span class="badge badge--red">Директор</span>
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

      <div class="profile-section">
        <div class="profile-section__title">Аккаунт</div>
        <div class="profile-grid">
          ${accountFields.map(([label, value]) => `
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
          <div class="profile-field profile-field--theme">
            <p class="profile-field__label">Тема оформления</p>
            <select class="profile-theme-select" id="theme-select">
              ${Object.entries(themeLabels).map(([val, label]) =>
                `<option value="${val}"${val === currentTheme ? ' selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="profile-section__title">Правовые документы</div>
        <div class="profile-settings">
          <a class="btn" href="/legal/consent.html" target="_blank" rel="noopener">📄 Согласие на обработку персональных данных</a>
          <a class="btn" href="/legal/user-agreement.html" target="_blank" rel="noopener">📄 Пользовательское соглашение</a>
          <a class="btn" href="/legal/offer.html" target="_blank" rel="noopener">📄 Договор оферты</a>
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
  }

  function openEditModal() {
    renderErrors(document.getElementById('edit-errors'), []);
    document.getElementById('edit-firstName').value = user.firstName || '';
    document.getElementById('edit-lastName').value = user.lastName || '';
    document.getElementById('edit-city').value = user.city || '';
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-max').value = user.max || '';
    document.getElementById('edit-teacherCode').value = user.teacherCode || '';

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
      teacherCode: document.getElementById('edit-teacherCode').value.trim(),
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const data = await api.putJson('/api/profile', payload);
      Object.assign(user, data.user);
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
})();
