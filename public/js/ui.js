// public/js/ui.js

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = false;
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = true;
}

// Общая проводка для любых модалок на странице: [data-modal-open="id"] открывает,
// [data-modal-close] внутри модалки закрывает, клик по подложке и Escape тоже закрывают.
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-modal-open')));
  });
  document.querySelectorAll('[data-modal-close]').forEach((btn) => {
    const overlay = btn.closest('.modal-overlay');
    btn.addEventListener('click', () => { if (overlay) overlay.hidden = true; });
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach((o) => { o.hidden = true; });
  });
}

// Универсальная форма "введите УДАЛИТЬ, чтобы подтвердить".
// onConfirm() должен вернуть промис (например, вызов api.postJson на /delete).
function wireDeleteForm(formEl, onConfirm) {
  if (!formEl) return;
  const errorsBox = formEl.querySelector('[data-role="delete-errors"]');
  const input = formEl.querySelector('input[name="confirmText"]');
  const submitBtn = formEl.querySelector('button[type="submit"]');

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = (input.value || '').trim();
    if (value !== 'УДАЛИТЬ') {
      renderErrors(errorsBox, ['Чтобы удалить, введите слово «УДАЛИТЬ» без ошибок.']);
      return;
    }
    submitBtn.disabled = true;
    try {
      await onConfirm(value);
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
      submitBtn.disabled = false;
    }
  });
}

// Простой WYSIWYG на execCommand — достаточно для базового форматирования текста урока.
function initEditors() {
  document.querySelectorAll('[data-editor]').forEach((wrapper) => {
    const content = wrapper.querySelector('.editor-content');
    const hiddenInput = document.getElementById(wrapper.getAttribute('data-editor'));
    if (!content || !hiddenInput) return;

    if (hiddenInput.value) content.innerHTML = hiddenInput.value;

    const sync = () => { hiddenInput.value = content.innerHTML; };
    content.addEventListener('input', sync);

    wrapper.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        const value = btn.getAttribute('data-value') || undefined;
        content.focus();
        document.execCommand(cmd, false, value);
        sync();
      });
    });

    const form = wrapper.closest('form');
    if (form) form.addEventListener('submit', sync);
  });
}

// Подставляет имя выбранного файла рядом с input[type=file]
function initFileLabels() {
  document.querySelectorAll('input[type="file"][data-filename-target]').forEach((input) => {
    const target = document.querySelector(input.getAttribute('data-filename-target'));
    if (!target) return;
    input.addEventListener('change', () => {
      if (input.files && input.files.length) {
        target.textContent = Array.from(input.files).map((f) => f.name).join(', ');
      }
    });
  });
}

function initPageChrome() {
  initModals();
  initEditors();
  initFileLabels();
}

document.addEventListener('DOMContentLoaded', initPageChrome);
