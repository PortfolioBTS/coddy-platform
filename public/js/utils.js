// public/js/utils.js

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const today = new Date();
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

function isDeadlinePassed(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function initials(user) {
  return `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();
}

// Рендерит список ошибок в контейнер (например, <ul class="error-list" id="form-errors">)
function renderErrors(container, errors) {
  if (!container) return;
  if (!errors || !errors.length) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
}

function deadlineBadge(iso, { softClass = 'badge--gray' } = {}) {
  if (!iso) return '';
  const overdue = isDeadlinePassed(iso);
  return `<span class="badge ${overdue ? 'badge--overdue' : softClass}">до ${formatDate(iso)}</span>`;
}

function statusBadge(submission) {
  if (!submission) return '<span class="badge badge--gray">не сдано</span>';
  if (submission.status === 'reviewed') return '<span class="badge badge--ok">проверено</span>';
  return '<span class="badge badge--gold">на проверке</span>';
}
