// routes/auth.js
const express = require('express');
const users = require('../db/users');
const { EMAIL_RE, PHONE_RE } = require('../utils');

const router = express.Router();

router.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  res.json({ user: req.user });
});

<<<<<<< HEAD
router.put('/api/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  const { firstName, lastName, city, phone, email, telegram, max } = req.body || {};
  const errors = [];

  if (!firstName || !firstName.trim()) errors.push('Укажите имя.');
  if (!lastName || !lastName.trim()) errors.push('Укажите фамилию.');
  if (!city || !city.trim()) errors.push('Укажите город.');
  if (!phone || !PHONE_RE.test(phone.trim())) errors.push('Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).');
  if (!email || !EMAIL_RE.test(email.trim())) errors.push('Укажите корректную электронную почту.');

  const emailClean = email ? email.trim().toLowerCase() : '';
  const otherWithEmail = users.findByEmail(emailClean);
  if (emailClean && otherWithEmail && otherWithEmail.id !== req.user.id) {
    errors.push('Пользователь с такой почтой уже зарегистрирован.');
  }

  const telegramClean = telegram != null && telegram.trim() ? telegram.trim().replace(/^@/, '').slice(0, 32) : '';
  const maxClean = max != null && max.trim() ? max.trim().slice(0, 32) : '';

  if (telegramClean && !/^[A-Za-z0-9_]{3,32}$/.test(telegramClean)) {
    errors.push('Юзернейм в ТГ может содержать только латинские буквы, цифры и подчёркивания.');
  }
  if (maxClean && !/^[A-Za-z0-9_.]{3,32}$/.test(maxClean)) {
    errors.push('Ник в MAX может содержать только латинские буквы, цифры, точки и подчёркивания.');
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Не удалось сохранить изменения.', errors });
  }

  const updated = users.updateProfile(req.user.id, {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    city: city.trim(),
    phone: phone.trim(),
    email: emailClean,
    telegram: telegramClean,
    max: maxClean,
  });

  // Директор может в любой момент сменить свой код педагога — новый код
  // сразу начинает подходить при регистрации педагогов.
  if (req.user.role === 'director') {
    const code = req.body.teacherCode != null && String(req.body.teacherCode).trim()
      ? String(req.body.teacherCode).trim()
      : '';
    const withCode = users.updateProfile(req.user.id, { teacherCode: code });
    if (withCode) {
      updated.teacherCode = withCode.teacherCode;
      updated.updatedAt = withCode.updatedAt;
    }
  }

  if (!updated) {
    return res.status(404).json({ message: 'Пользователь не найден.' });
  }

  req.user = updated;
  res.json({ user: users.publicUser(updated) });
});

router.post('/api/register', async (req, res) => {
  const { role, firstName, lastName, city, phone, email, password, passwordConfirm, birthDate, teacherCode, childLogins } = req.body || {};
  const errors = [];

  if (!['teacher', 'student', 'parent'].includes(role)) errors.push('Выберите роль: учитель, ученик или родитель.');
=======
router.post('/api/register', async (req, res) => {
  const { role, firstName, lastName, city, phone, email, password, passwordConfirm, birthDate } = req.body || {};
  const errors = [];

  if (!['teacher', 'student'].includes(role)) errors.push('Выберите роль: учитель или ученик.');
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  if (!firstName || !firstName.trim()) errors.push('Укажите имя.');
  if (!lastName || !lastName.trim()) errors.push('Укажите фамилию.');
  if (!city || !city.trim()) errors.push('Укажите город.');
  if (!phone || !PHONE_RE.test(phone.trim())) errors.push('Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).');
  if (!email || !EMAIL_RE.test(email.trim())) errors.push('Укажите корректную электронную почту.');
  if (!password || password.length < 6) errors.push('Пароль должен быть не короче 6 символов.');
  if (password !== passwordConfirm) errors.push('Пароли не совпадают.');

<<<<<<< HEAD
  // Педагогом может стать только тот, кто получил код от директора школы.
  if (role === 'teacher') {
    const code = teacherCode == null ? '' : String(teacherCode).trim();
    if (!code) errors.push('Укажите код педагога — его выдаёт директор школы.');
    else if (!users.isValidTeacherCode(code)) errors.push('Неверный код педагога.');
  }

  // Родителю дату рождения не показываем и не спрашиваем — вместо этого он
  // указывает логин (почту) своего ребёнка. Логинов может быть несколько —
  // у одного родителя на платформе может учиться сразу несколько детей.
  let childIds = [];
  if (role === 'parent') {
    const rawLogins = [].concat(childLogins || []).map((l) => String(l || '').trim()).filter(Boolean);
    const uniqueLogins = [...new Set(rawLogins.map((l) => l.toLowerCase()))];
    if (!uniqueLogins.length) {
      errors.push('Укажите логин хотя бы одного ребёнка.');
    } else {
      const notFound = [];
      uniqueLogins.forEach((login) => {
        const child = users.findByEmail(login);
        if (!child || child.role !== 'student') {
          notFound.push(login);
        } else {
          childIds.push(child.id);
        }
      });
      if (notFound.length) {
        errors.push(`Не найден ученик с логином: ${notFound.join(', ')}. Проверьте логин — его можно уточнить у ребёнка или у учителя.`);
      }
    }
  }

  let birthDateClean = null;
  if (role === 'student' && birthDate) {
=======
  let birthDateClean = null;
  if (birthDate) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
  const user = await users.createUser({
    role,
    firstName,
    lastName,
    city,
    phone,
    email,
    password,
    birthDate: birthDateClean,
    teacherCode: role === 'teacher' ? String(teacherCode || '').trim() : null,
    childIds: role === 'parent' ? childIds : undefined,
  });
=======
  const user = await users.createUser({ role, firstName, lastName, city, phone, email, password, birthDate: birthDateClean });
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
router.put('/api/password', async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  const { currentPassword, newPassword, passwordConfirm } = req.body || {};
  const errors = [];
  const user = users.getById(req.user.id);
  const currentOk = user && (await users.verifyPassword(user, currentPassword || ''));
  if (!currentOk) errors.push('Текущий пароль указан неверно.');
  if (!newPassword || newPassword.length < 6) errors.push('Новый пароль должен быть не короче 6 символов.');
  if (newPassword !== passwordConfirm) errors.push('Новые пароли не совпадают.');

  if (errors.length) {
    return res.status(400).json({ message: 'Не удалось сменить пароль.', errors });
  }

  await users.updatePassword(req.user.id, newPassword);
  res.json({ ok: true });
});

// Привязка Telegram-чата к аккаунту: числовой ID, который бот присылает
// пользователю после нажатия «Start». По нему отправляются уведомления.
router.put('/api/tg-id', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  const raw = req.body && req.body.tgId != null ? String(req.body.tgId).trim() : '';
  const errors = [];

  if (!raw) {
    errors.push('Укажите ваш ID в Telegram.');
  } else if (!/^\d{5,15}$/.test(raw)) {
    errors.push('ID в Telegram — это число (только цифры), которое присылает бот.');
  } else {
    const owner = users.findByTgId(raw);
    if (owner && owner.id !== req.user.id) {
      errors.push('Этот ID уже привязан к другому аккаунту.');
    }
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Не удалось сохранить ID в Telegram.', errors });
  }

  const updated = users.updateProfile(req.user.id, { tgId: Number(raw) });
  req.user = updated;
  res.json({ user: users.publicUser(updated) });
});

// Отписка от уведомлений в Telegram: удаляет привязанный ID.
router.delete('/api/tg-id', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Не авторизован.' });
  const updated = users.updateProfile(req.user.id, { tgId: undefined });
  req.user = updated;
  res.json({ user: users.publicUser(updated) });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
module.exports = router;
