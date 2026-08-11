// public/js/pages/instructions.js

(async function () {
  const user = await bootPage();
  if (!user) return;

  const content = document.getElementById('content');

  function renderEmpty() {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">🎬</div>
        <div class="empty-state__text">Видеоинструкций пока нет.</div>
      </div>`;
  }

  function renderList(list) {
    content.innerHTML = `
      <div class="video-list" id="video-list">
        ${list.map((v) => `
          <article class="video-card" data-video-id="${v.id}">
            <div class="video-card__body">
              <h3 class="video-card__title">${escapeHtml(v.title)}</h3>
              ${v.description ? `<p class="video-card__desc">${escapeHtml(v.description)}</p>` : ''}
            </div>
            <div class="video-card__meta">
              <span class="badge ${v.access === 'all' ? 'badge--gray' : 'badge--gold'}">${v.access === 'all' ? 'Для всех' : 'Для ' + escapeHtml(v.access)}</span>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  try {
    const data = await api.get('/api/instructions');
    const list = Array.isArray(data) ? data : (data.instructions || []);
    if (!list.length) {
      renderEmpty();
    } else {
      renderList(list);
    }
  } catch {
    renderEmpty();
  }
})();
