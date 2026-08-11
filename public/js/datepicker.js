// public/js/datepicker.js — самодельный календарь для выбора даты.
// Заменяет нативный input[type=date] на визуально приятное окно-календарь.

const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad2(n) { return String(n).padStart(2, '0'); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDisplay(iso) {
  if (!iso) return '';
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

// maxDate — строка YYYY-MM-DD (или null) — даты позже не выбираются.
function initDatepicker({ trigger, popup, input, label, maxDate }) {
  const today = new Date();
  const max = maxDate ? parseISODate(maxDate) : today;
  let view = input.value ? parseISODate(input.value) : new Date(today.getFullYear(), today.getMonth(), 1);
  let selected = input.value || '';
  let open = false;

  function render() {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // понедельник = 0

    const curYear = new Date().getFullYear();
    const months = MONTHS_RU.map((m, i) =>
      `<option value="${i}"${i === view.getMonth() ? ' selected' : ''}>${m}</option>`).join('');
    const years = [];
    for (let y = curYear; y >= curYear - 90; y--) {
      years.push(`<option value="${y}"${y === view.getFullYear() ? ' selected' : ''}>${y}</option>`);
    }

    const header = `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-step="-1" title="Предыдущий месяц">&lsaquo;</button>
        <select class="dp-select dp-select--month" aria-label="Месяц">${months}</select>
        <select class="dp-select dp-select--year" aria-label="Год">${years.join('')}</select>
        <button type="button" class="dp-nav" data-step="1" title="Следующий месяц">&rsaquo;</button>
      </div>
      <div class="dp-week">${WEEKDAYS_RU.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="dp-grid">`;

    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<span class="dp-empty"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const iso = toISODate(date);
      const isFuture = date > max;
      const isSelected = iso === selected;
      const isToday = iso === toISODate(today);
      let cls = 'dp-day';
      if (isFuture) cls += ' dp-day--disabled';
      if (isSelected) cls += ' dp-day--selected';
      if (isToday) cls += ' dp-day--today';
      cells += `<button type="button" class="${cls}" data-iso="${iso}"${isFuture ? ' disabled' : ''}>${d}</button>`;
    }

    popup.innerHTML = header + cells + '</div>';
  }

  function openPopup() {
    open = true;
    popup.hidden = false;
    render();
  }

  function closePopup() {
    open = false;
    popup.hidden = true;
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open) closePopup();
    else openPopup();
  });

  popup.addEventListener('click', (e) => {
    const nav = e.target.closest('.dp-nav');
    if (nav) {
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.step), 1);
      render();
      return;
    }
    const day = e.target.closest('.dp-day');
    if (!day || day.disabled) return;
    selected = day.dataset.iso;
    input.value = selected;
    if (label) {
      label.textContent = fmtDisplay(selected);
      label.classList.add('datepicker__value');
      label.classList.remove('datepicker__placeholder');
    }
    closePopup();
  });

  popup.addEventListener('change', (e) => {
    const monthSel = e.target.closest('.dp-select--month');
    if (monthSel) {
      view = new Date(view.getFullYear(), Number(monthSel.value), 1);
      render();
      return;
    }
    const yearSel = e.target.closest('.dp-select--year');
    if (yearSel) {
      view = new Date(Number(yearSel.value), view.getMonth(), 1);
      render();
    }
  });

  document.addEventListener('click', (e) => {
    if (open && !trigger.contains(e.target) && !popup.contains(e.target)) closePopup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });

  if (input.value) {
    selected = input.value;
    view = parseISODate(input.value);
  }
  if (label && input.value) {
    label.textContent = fmtDisplay(input.value);
    label.classList.add('datepicker__value');
    label.classList.remove('datepicker__placeholder');
  }
}
