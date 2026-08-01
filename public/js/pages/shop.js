(async function () {
  const requiredRole = window.location.pathname.startsWith('/teacher/') ? 'teacher' : 'student';
  const user = await bootPage(requiredRole);
  if (!user) return;

  let currentProduct = null;
  let categories = [];
  let products = [];
  let currentCategory = 'all';

  async function loadBalance() {
    if (user.role !== 'student') return;
    const badge = document.getElementById('balance-badge');
    try {
      const data = await api.get('/api/student/alfacrm/balance');
      if (data.balance != null) {
        badge.textContent = `${data.balance} коддикоинов`;
      } else {
        badge.textContent = 'Баланс недоступен';
      }
    } catch {
      badge.textContent = 'Ошибка загрузки';
    }
  }

  async function loadProducts() {
    const data = await api.get('/api/shop/products');
    categories = data.categories;
    products = data.products;

    const steamCats = categories.filter((c) => c.type === 'steam');
    if (steamCats.length > 1) {
      const merged = { id: 'steam', name: 'Игры в Steam', type: 'steam', products: [] };
      for (const cat of steamCats) {
        merged.products = merged.products.concat(cat.products);
        categories = categories.filter((c) => c.id !== cat.id);
      }
      categories.push(merged);
    }

    renderCategoryFilter();
    applyShopFilters();
  }

  function getFilteredProducts() {
    let list = products;
    const q = (document.getElementById('shop-search').value || '').toLowerCase().trim();
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (currentCategory === 'steam') {
      list = list.filter((p) => p.type === 'steam');
    } else if (currentCategory !== 'all') {
      list = list.filter((p) => p.categoryId === Number(currentCategory));
    }
    return list;
  }

  function applyShopFilters() {
    renderProducts(getFilteredProducts());
  }

  function renderCategoryFilter() {
    const select = document.getElementById('category-filter');
    select.innerHTML = '<option value="all">Все категории</option>';
    for (const cat of categories) {
      select.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    }
    select.addEventListener('change', () => {
      currentCategory = select.value;
      applyShopFilters();
    });
    document.getElementById('shop-search').addEventListener('input', () => {
      applyShopFilters();
    });
  }

  function renderProducts(list) {
    const grid = document.getElementById('product-grid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state__title">¯\\_(ツ)_/¯</div><div class="empty-state__text">Нет товаров в этой категории.</div></div>';
      return;
    }
    grid.innerHTML = list.map((p) => `
      <a class="item-card item-card--product" href="#" data-product-id="${p.id}">
        <div class="item-card__cover">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="item-card__cover--placeholder"><span>${escapeHtml(p.name[0])}</span></div>`}
        </div>
        <div class="item-card__body">
          <h3 class="item-card__title">${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="item-card__desc">${escapeHtml(p.description)}</p>` : ''}
          <div class="item-card__meta">
            <span class="price">${p.price} коддикоинов</span>
            <span class="badge ${p.type === 'steam' ? 'badge--gold' : 'badge--gray'}">${p.type === 'steam' ? 'Steam' : 'Физический'}</span>
          </div>
        </div>
      </a>
    `).join('');

    grid.querySelectorAll('.item-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const id = Number(card.dataset.productId);
        const product = products.find((p) => p.id === id);
        if (product) openOrderModal(product);
      });
    });
  }

  function openOrderModal(product) {
    currentProduct = product;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `${product.price} C`;
    document.getElementById('modal-category').textContent = product.categoryName + (product.description ? ` · ${product.description}` : '');
    document.getElementById('order-firstname').value = user.firstName || '';
    document.getElementById('order-lastname').value = user.lastName || '';
    document.getElementById('order-city').value = user.city || '';

    const fieldCity = document.getElementById('field-city');
    const fieldSize = document.getElementById('field-size');
    const fieldSteam = document.getElementById('field-steam');
    fieldCity.hidden = product.type !== 'physical';
    fieldSteam.hidden = product.type !== 'steam';
    fieldSize.hidden = !(product.type === 'physical' && product.requiresSize);

    if (product.requiresSize && product.availableSizes) {
      const sizeSelect = document.getElementById('order-size');
      sizeSelect.innerHTML = '<option value="">Выберите размер</option>' +
        product.availableSizes.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }

    document.getElementById('order-phone').value = '';
    document.getElementById('order-steam').value = '';
    renderErrors(document.getElementById('order-errors'), []);

    const submitBtn = document.getElementById('order-submit');
    submitBtn.hidden = user.role !== 'student';
    if (user.role === 'student') {
      submitBtn.textContent = `Оформить заказ (${product.price} коддикоинов)`;
    }

    document.getElementById('order-modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('order-modal').hidden = true;
    currentProduct = null;
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProduct || user.role !== 'student') return;

    const errors = [];
    const phone = document.getElementById('order-phone').value.trim();
    const city = document.getElementById('order-city').value.trim();
    const steamCode = document.getElementById('order-steam').value.trim();
    const size = document.getElementById('order-size').value;

    if (!phone) errors.push('Укажите телефон.');
    else if (!/^[\d+\-() ]{5,20}$/.test(phone)) errors.push('Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).');
    if (currentProduct.type === 'physical') {
      if (!city) errors.push('Укажите город.');
      if (currentProduct.requiresSize && !size) errors.push('Выберите размер.');
    }
    if (currentProduct.type === 'steam') {
      if (!steamCode) errors.push('Укажите Steam-код дружбы.');
      else if (steamCode.length > 8) errors.push('Steam-код не длиннее 8 символов.');
      else if (!/^\d+$/.test(steamCode)) errors.push('Steam-код должен содержать только цифры.');
    }

    if (errors.length) {
      renderErrors(document.getElementById('order-errors'), errors);
      return;
    }

    const submitBtn = document.getElementById('order-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Оформляем...';

    try {
      await api.postJson('/api/shop/order', {
        productId: currentProduct.id,
        phone,
        city: currentProduct.type === 'physical' ? city : undefined,
        steamCode: currentProduct.type === 'steam' ? steamCode : undefined,
        size: currentProduct.requiresSize ? size : undefined,
      });
      closeModal();
      alert('Заказ оформлен! Ожидайте подтверждения.');
      await loadBalance();
    } catch (err) {
      renderErrors(document.getElementById('order-errors'), err.errors || [err.message]);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = `Оформить заказ (${currentProduct.price} коддикоинов)`;
    }
  });

  if (user.role === 'student') {
    await loadBalance();
  }
  await loadProducts();
})();
