// routes/auth.js
const express = require('express');
const users = require('../db/users');
const { EMAIL_RE, PHONE_RE } = require('../utils');

const router = express.Router();

router.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  res.json({ user: req.user });
});

router.post('/api/register', async (req, res) => {
  const { role, firstName, lastName, city, phone, email, password, passwordConfirm, birthDate } = req.body || {};
  const errors = [];

  if (!['teacher', 'student'].includes(role)) errors.push('Выберите роль: учитель или ученик.');
  if (!firstName || !firstName.trim()) errors.push('Укажите имя.');
  if (!lastName || !lastName.trim()) errors.push('Укажите фамилию.');
  if (!city || !city.trim()) errors.push('Укажите город.');
  if (!phone || !PHONE_RE.test(phone.trim())) errors.push('Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).');
  if (!email || !EMAIL_RE.test(email.trim())) errors.push('Укажите корректную электронную почту.');
  if (!password || password.length < 6) errors.push('Пароль должен быть не короче 6 символов.');
  if (password !== passwordConfirm) errors.push('Пароли не совпадают.');

  let birthDateClean = null;
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(new Date(birthDate).getTime())) {
      errors.push('Укажите корректную дату рождения.');
    } else {
      const b = new Date(birthDate);
      if (b >= new Date()) errors.push('Дата рождения не может быть в будущем.');
      else birthDateClean = birthDate;
    }
  }

  if (!errors.length && users.findByEmail(email)) {
    errors.push('Пользователь с такой почтой уже зарегистрирован.');
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Не удалось зарегистрироваться.', errors });
  }

  const user = await users.createUser({ role, firstName, lastName, city, phone, email, password, birthDate: birthDateClean });
  req.session.userId = user.id;
  res.status(201).json({ user: users.publicUser(user) });
});

router.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.findByEmail(email || '');
  const ok = user && (await users.verifyPassword(user, password || ''));

  if (!ok) {
    return res.status(400).json({ message: 'Неверная почта или пароль.', errors: ['Неверная почта или пароль.'] });
  }

  req.session.userId = user.id;
  res.json({ user: users.publicUser(user) });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
