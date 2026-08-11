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

<<<<<<< HEAD
// Склонение существительного по числу: pluralize(3, 'урок', 'урока', 'уроков') → 'урока'
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD

// Превращает 'YYYY-MM' в «Август 2026» для вкладок/подписей обратной связи.
const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_NAMES_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
function formatMonthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || '';
  const [y, m] = month.split('-').map(Number);
  const name = MONTH_NAMES_NOM[m - 1] || '';
  return `${name} ${y}`;
}
function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

// Небольшой радар-график из трёх осей для карточки обратной связи:
// % выполненных дз, коммуникация в группе, успеваемость на уроке.
function renderFeedbackChart(scores) {
  const size = 220;
  const center = size / 2;
  const maxR = 76;
  const axes = [
    { label: '% ДЗ', value: scores.homeworkPercent, angle: -90 },
    { label: 'Коммуникация', value: scores.communicationScore, angle: 30 },
    { label: 'Успеваемость', value: scores.progressScore, angle: 150 },
  ];
  const toPoint = (angleDeg, r) => {
    const rad = (angleDeg * Math.PI) / 180;
    return [center + r * Math.cos(rad), center + r * Math.sin(rad)];
  };
  const rings = [0.33, 0.66, 1]
    .map((lvl) => `<polygon points="${axes.map((a) => toPoint(a.angle, maxR * lvl).join(',')).join(' ')}" fill="none" stroke="var(--border-light, #ccc)" stroke-width="1"></polygon>`)
    .join('');
  const axisLines = axes
    .map((a) => { const [x, y] = toPoint(a.angle, maxR); return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="var(--border-light, #ccc)" stroke-width="1"></line>`; })
    .join('');
  const dataPts = axes.map((a) => toPoint(a.angle, (Math.max(0, Math.min(100, a.value || 0)) / 100) * maxR));
  const dots = dataPts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="var(--red)"></circle>`).join('');
  const labels = axes
    .map((a) => {
      const [x, y] = toPoint(a.angle, maxR + 24);
      const cos = Math.cos((a.angle * Math.PI) / 180);
      const anchor = Math.abs(cos) < 0.3 ? 'middle' : (cos > 0 ? 'start' : 'end');
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="var(--ink)">${escapeHtml(a.label)}</text>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" style="max-width:230px; display:block; margin:0 auto;">
      ${rings}
      ${axisLines}
      <polygon points="${dataPts.map((p) => p.join(',')).join(' ')}" fill="var(--red)" fill-opacity="0.2" stroke="var(--red)" stroke-width="2"></polygon>
      ${dots}
      ${labels}
    </svg>`;
}
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
