(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  let allOrders = [];
  let activeTab = 'physical';

  const STEAM_COLS = ['№', 'Дата', 'Ученик', 'Товар', 'Цена', 'Статус', 'Дата выдачи', 'Телефон', 'Steam-код', 'Факт. стоимость', ''];

  const PHYSICAL_COLS = ['№', 'Дата', 'Ученик', 'Товар', 'Цена', 'Телефон', 'Город', 'Размер', ''];

  async function loadOrders() {
    const data = await api.get('/api/shop/orders');
    allOrders = (data.orders || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    renderFilters();
    switchTab(activeTab);
  }

  function renderFilters() {
    const cities = [...new Set(allOrders.filter((o) => o.productType === 'physical').map((o) => o.city).filter(Boolean))].sort();
    const statuses = [...new Set(allOrders.filter((o) => o.productType === 'steam').map((o) => o.status).filter(Boolean))];

    const filterRow = document.getElementById('filter-row');
    filterRow.innerHTML = `
      <span class="controls__label">Фильтр</span>
      <select class="controls__select" id="city-filter" hidden>
        <option value="all">Все города</option>
        ${cities.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <select class="controls__select" id="status-filter" hidden>
        <option value="all">Все статусы</option>
        ${statuses.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
      </select>`;
    document.getElementById('city-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
  }

  function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-physical').classList.toggle('is-active', tab === 'physical');
    document.getElementById('tab-steam').classList.toggle('is-active', tab === 'steam');
    document.getElementById('panel-tab').textContent = tab === 'steam' ? 'Steam' : 'Физические';
    document.getElementById('city-filter').hidden = tab !== 'physical';
    document.getElementById('status-filter').hidden = tab !== 'steam';
    document.querySelector('.wrap').classList.toggle('wrap--wide', tab === 'steam');
    applyFilters();
  }

  function applyFilters() {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    const cityFilter = document.getElementById('city-filter').value;
    const statusFilter = document.getElementById('status-filter').value;

    let filtered = allOrders;
    if (q) {
      filtered = filtered.filter((o) =>
        (o.studentName || '').toLowerCase().includes(q) ||
        (o.productName || '').toLowerCase().includes(q)
      );
    }
    filtered = filtered.filter((o) => o.productType === (activeTab === 'steam' ? 'steam' : 'physical'));

    if (activeTab === 'physical' && cityFilter !== 'all') {
      filtered = filtered.filter((o) => o.city === cityFilter);
    }
    if (activeTab === 'steam' && statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // выполненные — вниз
    if (activeTab === 'physical') {
      filtered = [...filtered].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    }

    renderTable(filtered);
  }

  function renderTable(orders) {
    const isSteam = activeTab === 'steam';
    const cols = isSteam ? STEAM_COLS : PHYSICAL_COLS;

    document.getElementById('orders-head').innerHTML = '<tr>' + cols.map((c) => `<th>${c}</th>`).join('') + '</tr>';
    document.getElementById('orders-count').textContent = `Всего: ${orders.length} ${declOfNum(orders.length, ['заказ', 'заказа', 'заказов'])}`;

    // Общая фактическая стоимость для Steam
    updateTotal(orders, isSteam);

    const tbody = document.getElementById('orders-body');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="' + cols.length + '" style="text-align:center;color:var(--gray);padding:40px">Нет заказов</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map((o, idx) => {
      const num = o.number != null ? o.number : idx + 1;
      const showSize = o.productName.includes('Футболка');
      const rowClass = o.completed ? ' order-completed' : '';
      let cells;

      if (isSteam) {
        const statuses = ['не выдан', 'оформлен', 'добавлен в друзья', 'выдан'];
        const actualCostVal = o.actualCost != null ? o.actualCost : '';
        cells = `
          <td class="cell-year" style="white-space:nowrap">${formatDate(o.createdAt)}</td>
          <td class="cell-title">${escapeHtml(o.studentName || '—')}</td>
          <td class="cell-title">${escapeHtml(o.productName)}</td>
          <td class="cell-rating">${o.price}</td>
          <td>
            <select class="select order-select status-${(o.status || 'не выдан').replace(/\s+/g, '-')}" data-field="status">
              ${statuses.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td class="cell-year" style="white-space:nowrap">${o.dateIssued ? formatDate(o.dateIssued) : '—'}</td>
          <td>${escapeHtml(o.phone || '—')}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapeHtml(o.steamCode || '—')}</td>
          <td><span class="order-text" data-field="actualCost" data-value="${escapeHtml(String(actualCostVal))}">${actualCostVal !== '' ? actualCostVal : '—'}</span></td>`;
      } else {
        cells = `
          <td class="cell-year" style="white-space:nowrap">${formatDate(o.createdAt)}</td>
          <td class="cell-title">${escapeHtml(o.studentName || '—')}</td>
          <td class="cell-title">${escapeHtml(o.productName)}</td>
          <td class="cell-rating">${o.price}</td>
          <td>${escapeHtml(o.phone || '—')}</td>
          <td>${escapeHtml(o.city || '—')}</td>
          <td>${showSize ? escapeHtml(o.size || '—') : '—'}</td>`;
      }

      return `<tr class="${rowClass}" data-order-id="${escapeHtml(o.id)}">${isSteam ? `<td class="cell-year">${num}</td>` : `<td class="cell-year" style="white-space:nowrap"><button class="order-check" data-id="${escapeHtml(o.id)}" data-completed="${o.completed ? '1' : '0'}">${o.completed ? '✓' : ''}</button> ${num}</td>`}${cells}<td><button class="btn btn--sm btn--danger order-delete" title="Удалить заказ">&times;</button></td></tr>`;
    }).join('');

    attachEditors();
    attachTextEditors();
    attachDeleters();
    if (!isSteam) attachCheckers();
  }

  function attachCheckers() {
    document.querySelectorAll('.order-check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const completed = btn.dataset.completed === '1';
        await saveOrder(id, { completed: !completed });
        const order = allOrders.find((o) => o.id === id);
        if (order) order.completed = !completed;
        applyFilters();
      });
    });
  }

  function attachEditors() {
    document.querySelectorAll('.order-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const tr = sel.closest('tr');
        const id = tr.dataset.orderId;
        const status = sel.value;
        const fields = { status };

        if (status === 'выдан') {
          const today = new Date().toISOString().slice(0, 10);
          fields.dateIssued = today;
        } else {
          fields.dateIssued = null;
        }

        await saveOrder(id, fields);

        const dateCell = tr.querySelector('td:nth-child(7)');
        if (dateCell) {
          dateCell.textContent = status === 'выдан' && fields.dateIssued ? formatDate(fields.dateIssued) : '—';
        }

        // обновить класс статуса
        sel.className = sel.className.replace(/status-\S+/g, '').trim() + ' status-' + status.replace(/\s+/g, '-');
      });
    });
  }

  function attachTextEditors() {
    document.querySelectorAll('.order-text').forEach((span) => {
      span.addEventListener('click', function () {
        if (this.querySelector('input')) return;
        const field = this.dataset.field;
        const val = this.dataset.value || '';
        const input = document.createElement('input');
        input.className = 'input order-input';
        input.type = 'number';
        input.value = val;
        input.dataset.field = field;
        this.textContent = '';
        this.appendChild(input);
        input.focus();
        input.select();

        const done = () => {
          const newVal = input.value ? Number(input.value) : null;
          const tr = this.closest('tr');
          const id = tr.dataset.orderId;
          saveOrder(id, { [field]: newVal });
          this.dataset.value = newVal != null ? String(newVal) : '';
          this.textContent = newVal != null ? String(newVal) : '—';
          // обновить allOrders и пересчитать общую стоимость
          const order = allOrders.find((o) => o.id === id);
          if (order) { order[field] = newVal; }
          updateTotal(allOrders, activeTab === 'steam');
        };

        input.addEventListener('blur', done);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { input.blur(); }
          if (e.key === 'Escape') {
            this.textContent = val || '—';
          }
        });
      });
    });
  }

  function attachDeleters() {
    document.querySelectorAll('.order-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.orderId;
        const name = tr.querySelector('.cell-title')?.textContent || 'заказ';

        if (!confirm(`Удалить заказ «${name}»? Это действие нельзя отменить.`)) return;

        try {
          await api.delete('/api/shop/orders/' + id);
          allOrders = allOrders.filter((o) => o.id !== id);
          applyFilters();
          updateTotal(allOrders, activeTab === 'steam');
        } catch (err) {
          alert('Ошибка при удалении: ' + (err.message || 'неизвестная ошибка'));
        }
      });
    });
  }

  function updateTotal(orders, isSteam) {
    const totalEl = document.getElementById('orders-total');
    if (isSteam) {
      const sum = orders.reduce((s, o) => s + (Number(o.actualCost) || 0), 0);
      totalEl.textContent = `Общая фактическая стоимость: ${sum} ₽`;
      totalEl.hidden = false;
    } else {
      totalEl.hidden = true;
    }
  }

  async function saveOrder(id, fields) {
    try {
      await api.putJson(`/api/shop/orders/${id}`, fields);
    } catch (err) {
      console.error('Ошибка сохранения заказа:', err);
    }
  }

  function declOfNum(n, titles) {
    return titles[
      n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2
    ];
  }

  document.getElementById('tab-physical').addEventListener('click', () => switchTab('physical'));
  document.getElementById('tab-steam').addEventListener('click', () => switchTab('steam'));
  document.getElementById('search-input').addEventListener('input', applyFilters);

  await loadOrders();
})();
