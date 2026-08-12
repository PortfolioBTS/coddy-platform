// public/js/pages/instructions.js

(async function () {
  const user = await bootPage();
  if (!user) return;

  const isDirector = user.role === 'director';
  const content = document.getElementById('content');

  let instructions = [];

  async function load() {
    content.innerHTML = '<p class="muted">Загрузка…</p>';
    try {
      const data = await api.get('/api/instructions');
      instructions = data.instructions || [];
      render();
    } catch (err) {
      content.innerHTML = `<ul class="error-list"><li>${escapeHtml(err.message)}</li></ul>`;
    }
  }

  function videoFrameHtml(video) {
    if (!video) return '';
    return video.type === 'file'
      ? `<div class="video-frame"><video controls preload="metadata" src="/files/${encodeURIComponent(video.value)}"></video></div>`
      : `<div class="video-frame"><iframe src="${escapeHtml(video.value)}" allowfullscreen></iframe></div>`;
  }

  function cardHtml(v) {
    return `
      <article class="video-card" data-id="${v.id}">
        ${isDirector ? `<button type="button" class="item-card__remove" data-remove="${v.id}" title="Удалить">✕</button>` : ''}
        ${videoFrameHtml(v.video)}
        <div class="video-card__body">
          <h3 class="video-card__title">${escapeHtml(v.title)}</h3>
        </div>
      </article>`;
  }

  function formHtml() {
    if (!isDirector) return '';
    return `
      <form class="form" id="instruction-form" style="margin-bottom:28px;">
        <ul class="error-list" id="instruction-errors" hidden></ul>
        <div class="field">
          <label class="field__label" for="instruction-title">Заголовок</label>
          <input class="input" type="text" id="instruction-title" maxlength="120" placeholder="Например: Как сдать домашнее задание" required>
        </div>
        <div class="field">
          <span class="field__label">Видео (файл или ссылка)</span>
          <div class="file-field">
            <input type="file" id="instruction-video-file" accept=".mp4">
            <input class="input" type="url" id="instruction-video-url" placeholder="или вставьте ссылку на видео (YouTube и т.п.)">
            <span class="field__hint">MP4, до 50 МБ, либо внешняя ссылка</span>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--red" type="submit">📌 Прикрепить инструкцию</button>
        </div>
      </form>`;
  }

  function render() {
    if (!instructions.length) {
      content.innerHTML = `
        ${formHtml()}
        <div class="empty-state">
          <div class="empty-state__icon">🎬</div>
          <div class="empty-state__title">Видеоинструкций пока нет.</div>
          ${isDirector ? '' : '<p class="empty-state__text">Как только администрация добавит инструкции, они появятся здесь.</p>'}
        </div>`;
    } else {
      content.innerHTML = `
        ${formHtml()}
        <div class="video-list" id="video-list">
          ${instructions.map(cardHtml).join('')}
        </div>`;
    }

    if (isDirector) wireForm();
    wireDeleteButtons();
  }

  function wireDeleteButtons() {
    content.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Удалить эту видео-инструкцию? Это действие необратимо.')) return;
        btn.disabled = true;
        try {
          await api.postJson(`/api/director/instructions/${btn.dataset.remove}/delete`);
          instructions = instructions.filter((i) => i.id !== btn.dataset.remove);
          render();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function wireForm() {
    const form = document.getElementById('instruction-form');
    const errorsBox = document.getElementById('instruction-errors');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      renderErrors(errorsBox, null);

      const title = document.getElementById('instruction-title').value.trim();
      const fileInput = document.getElementById('instruction-video-file');
      const urlInput = document.getElementById('instruction-video-url');

      const errors = [];
      if (!title) errors.push('Укажите заголовок инструкции.');
      if (!(fileInput.files && fileInput.files[0]) && !urlInput.value.trim()) {
        errors.push('Прикрепите видеофайл (MP4) или вставьте ссылку на видео.');
      }
      if (errors.length) {
        renderErrors(errorsBox, errors);
        return;
      }

      const fd = new FormData();
      fd.append('title', title);
      if (fileInput.files && fileInput.files[0]) fd.append('videoFile', fileInput.files[0]);
      if (urlInput.value.trim()) fd.append('videoUrl', urlInput.value.trim());

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const { instruction } = await api.postForm('/api/director/instructions', fd);
        instructions.unshift(instruction);
        render();
      } catch (err) {
        renderErrors(errorsBox, err.errors || [err.message]);
      } finally {
        btn.disabled = false;
      }
    });
  }

  await load();
})();
