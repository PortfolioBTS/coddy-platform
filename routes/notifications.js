// routes/notifications.js
const express = require('express');
const notificationsDb = require('../db/notifications');
const usersDb = require('../db/users');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Уведомления доступны любому авторизованному пользователю.
router.use('/api/notifications', requireAuth);

router.get('/api/notifications', (req, res) => {
  const all = notificationsDb.listForUser(req.user);
  res.json({
    notifications: all.filter((n) => !n.removed),
    unreadCount: notificationsDb.countUnread(req.user),
  });
});

// Создание оповещения — только директор.
router.post('/api/notifications', requireRole('director'), (req, res) => {
  const { title, message, targetType, recipientIds } = req.body || {};
  const errors = [];

  if (!title || !String(title).trim()) errors.push('Укажите заголовок оповещения.');
  if (!message || !String(message).trim()) errors.push('Напишите текст оповещения.');
  if (!['all', 'teachers', 'students', 'specific'].includes(targetType)) {
    errors.push('Укажите, кому отправляется оповещение.');
  }
  if (targetType === 'specific') {
    const ids = [].concat(recipientIds || []).filter(Boolean);
    if (!ids.length) errors.push('Выберите хотя бы одного получателя.');
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Проверьте форму оповещения.', errors });
  }

  const notification = notificationsDb.create({
    senderId: req.user.id,
    title: String(title).trim(),
    message: String(message).trim(),
    targetType,
    recipientIds: targetType === 'specific' ? [].concat(recipientIds).filter(Boolean) : [],
  });

  res.status(201).json({ notification });
});

// «Удалить все мои уведомления».
router.post('/api/notifications/clear', (req, res) => {
  notificationsDb.removeAllForUser(req.user);
  res.json({ ok: true });
});

// Закрытие всплывающего окна уведомления.
router.post('/api/notifications/:id/read', (req, res) => {
  const notification = notificationsDb.getById(req.params.id);
  if (!notification) {
    return res.status(404).json({ message: 'Уведомление не найдено.' });
  }
  notificationsDb.markRead(req.user.id, notification.id);
  res.json({ ok: true });
});

module.exports = router;
