const express = require('express');
const products = require('../db/products');
const { requireAuth, requireRole } = require('../middleware/auth');
const usersDb = require('../db/users');
const alfacrm = require('../alfacrm');
const gdrive = require('../gdrive');

const router = express.Router();

router.get('/api/shop/products', requireAuth, (req, res) => {
  const all = products.list();
  const categories = {};
  for (const p of all) {
    if (!categories[p.categoryId]) {
      categories[p.categoryId] = { id: p.categoryId, name: p.categoryName, type: p.type, products: [] };
    }
    categories[p.categoryId].products.push(p);
  }
  res.json({ categories: Object.values(categories), products: all });
});

router.post('/api/shop/order', requireAuth, requireRole('student'), async (req, res) => {
  const { productId, size, phone, city, steamCode } = req.body;
  const product = products.getById(productId);
  if (!product) {
    return res.status(400).json({ message: 'Товар не найден.' });
  }

  const user = usersDb.getById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден.' });
  }

  let balance = null;
  if (user.alfacrmCustomerId) {
    try {
      const result = await alfacrm.getCustomerBonus(user.alfacrmCustomerId);
      balance = result.balance ?? result;
    } catch {
      balance = null;
    }
  }

  if (balance !== null && balance < product.price) {
    return res.status(400).json({ message: `Недостаточно коддикоинов. Баланс: ${balance}, цена: ${product.price}.` });
  }

  const errors = [];
  const phoneClean = (phone || '').trim();
  if (!phoneClean) {
    errors.push('Укажите телефон.');
  } else if (!/^[\d\s+\-()]{5,20}$/.test(phoneClean)) {
    errors.push('Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).');
  }
  if (product.type === 'physical') {
    if (!city || !city.trim()) errors.push('Укажите город.');
    if (product.requiresSize && !size) errors.push('Укажите размер.');
  } else if (product.type === 'steam') {
    if (!steamCode || !steamCode.trim()) errors.push('Укажите Steam-код дружбы.');
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Проверьте форму заказа.', errors });
  }

  const order = gdrive.appendOrder({
    studentId: req.user.id,
    studentName: `${req.user.firstName} ${req.user.lastName}`,
    productId: product.id,
    productName: product.name,
    productType: product.type,
    price: product.price,
    phone: phoneClean,
    city: (city || user.city || '').trim(),
    size: size || null,
    steamCode: (steamCode || '').trim(),
    balanceAtOrder: balance,
  });

  res.status(201).json({ order, message: 'Заказ оформлен!' });
});

router.get('/api/shop/orders', requireAuth, (req, res) => {
  if (req.user.role === 'teacher' || req.user.role === 'director') {
    const allOrders = gdrive.getAllOrders();
    const students = usersDb.listStudents().map(usersDb.publicUser);
    const studentMap = {};
    for (const s of students) studentMap[s.id] = s;
    for (const o of allOrders) {
      o.student = studentMap[o.studentId] || null;
    }
    return res.json({ orders: allOrders });
  }
  const orders = gdrive.getOrdersForStudent(req.user.id);
  res.json({ orders });
});

router.put('/api/shop/orders/:id', requireAuth, requireRole('teacher'), (req, res) => {
  const { status, dateIssued, actualCost, completed } = req.body;
  const fields = {};
  if (status !== undefined) fields.status = status;
  if (dateIssued !== undefined) fields.dateIssued = dateIssued;
  if (actualCost !== undefined) fields.actualCost = actualCost;
  if (completed !== undefined) fields.completed = completed;

  const updated = gdrive.updateOrder(req.params.id, fields);
  if (!updated) {
    return res.status(404).json({ message: 'Заказ не найден.' });
  }
  res.json({ order: updated });
});

router.delete('/api/shop/orders/:id', requireAuth, requireRole('teacher'), (req, res) => {
  const removed = gdrive.removeOrder(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Заказ не найден.' });
  }
  res.json({ ok: true });
});

module.exports = router;
