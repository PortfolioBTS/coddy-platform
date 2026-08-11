// public/js/pages/director-notifications.js

(async function () {
  const user = await bootPage('director');
  if (!user) return;

  const form = document.getElementById('notif-form');
  const errorsBox = document.getElementById('notif-errors');
  const specificBlock = document.getElementById('specific-block');
  const specificGrid = document.getElementById('specific-grid');
  const specificSearch = document.getElementById('specific-search');

  let allUsers = [];
  const selectedIds = new Set();

  // Собираем список всех пользователей (педагоги + ученики) для точечной рассылки.
  try {
    const [t, s] = await Promise.all([
      api.get('/api/director/teachers'),
      api.get('/api/director/students'),
    ]);
    allUsers = [
      ...(t.teachers || []).map((x) => ({ ...x, roleLabel: 'Педагог' })),
      ...(s.students || []).map((x) => ({ ...x, roleLabel: 'Ученик' })),
    ];
  } catch (_) {
    allUsers = [];
  }

  document.querySelectorAll('input[name="notif-target"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      specificBlock.hidden = radio.value !== 'specific';
      if (!specificBlock.hidden && !specificGrid.querySelector('input[type="checkbox"]')) {
        renderSpecificUsers('');
      }
    });
  });

  // Отметки храним в selectedIds отдельно от DOM, чтобы они не терялись
  // при перерисовке списка во время поиска.
  specificGrid.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const id = e.target.value;
      if (e.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
    }
  });

  specificSearch.addEventListener('input', () => renderSpecificUsers(specificSearch.value));

  function renderSpecificUsers(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = allUsers.filter((u) =>
      !q ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
    specificGrid.innerHTML = filtered.length
      ? filtered.map((u) => `
          <label class="checkbox-row">
            <input type="checkbox" value="${escapeHtml(u.id)}"${selectedIds.has(u.id) ? ' checked' : ''}>
            ${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}
            <span class="muted">— ${u.roleLabel}</span>
          </label>`).join('')
      : `<span class="checkbox-grid__empty">${q ? 'Никого не нашли по запросу.' : 'Пользователей пока нет.'}</span>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    renderErrors(errorsBox, null);

    const targetType = form.querySelector('input[name="notif-target"]:checked').value;
    const recipientIds = targetType === 'specific'
      ? Array.from(specificGrid.querySelectorAll('input[type="checkbox"]:checked')).map((i) => i.value)
      : [];

    const btn = document.getElementById('notif-submit');
    btn.disabled = true;
    try {
      await api.postJson('/api/notifications', {
        title: document.getElementById('notif-title').value.trim(),
        message: document.getElementById('notif-message').value.trim(),
        targetType,
        recipientIds,
      });
      form.reset();
      specificBlock.hidden = true;
      alert('Оповещение отправлено.');
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    } finally {
      btn.disabled = false;
    }
  });
})();
