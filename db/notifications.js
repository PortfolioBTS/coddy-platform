// db/notifications.js
const { Collection } = require('./store');

const notifications = new Collection('notifications');
const notificationReads = new Collection('notificationReads');

function create({ senderId, title, message, targetType, recipientIds }) {
  return notifications.insert({
    senderId,
    title,
    message,
    targetType,
    recipientIds: Array.isArray(recipientIds) ? recipientIds : [],
  });
}

// Совпадает ли уведомление с получателем.
function targetsUser(notification, user) {
  switch (notification.targetType) {
    case 'all':
      return true;
    case 'teachers':
      return user.role === 'teacher';
    case 'students':
      return user.role === 'student';
    case 'specific':
      return (notification.recipientIds || []).includes(user.id);
    default:
      return false;
  }
}

function _stateFor(userId) {
  const row = notificationReads.findOne((r) => r.userId === userId);
  return row || { userId, readIds: [], removedIds: [] };
}

function _saveState(state) {
  const row = notificationReads.findOne((r) => r.userId === state.userId);
  if (row) notificationReads.updateById(row.id, {
    readIds: state.readIds,
    removedIds: state.removedIds,
  });
  else notificationReads.insert(state);
}

// Все уведомления пользователя (новые сверху) с флагами read / removed.
function listForUser(user) {
  const state = _stateFor(user.id);
  return notifications
    .find((n) => targetsUser(n, user))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((n) => ({
      ...n,
      read: state.readIds.includes(n.id),
      removed: state.removedIds.includes(n.id),
    }));
}

// Количество непрочитанных (не закрытых и не удалённых) уведомлений — цифра на колокольчике.
function countUnread(user) {
  const state = _stateFor(user.id);
  const incoming = notifications.find((n) => targetsUser(n, user));
  return incoming.filter((n) => !state.readIds.includes(n.id) && !state.removedIds.includes(n.id)).length;
}

// Закрытие всплывающего окна — уведомление помечается прочитанным.
function markRead(userId, notificationId) {
  const state = _stateFor(userId);
  if (!state.readIds.includes(notificationId)) state.readIds.push(notificationId);
  _saveState(state);
}

// «Удалить все» — уведомления скрываются из списка для этого пользователя.
function removeAllForUser(user) {
  const state = _stateFor(user.id);
  notifications
    .find((n) => targetsUser(n, user))
    .forEach((n) => {
      if (!state.removedIds.includes(n.id)) state.removedIds.push(n.id);
    });
  _saveState(state);
}

// Позволяет получить уведомление целиком (для внутренних проверок).
function getById(id) {
  return notifications.getById(id);
}

module.exports = {
  create,
  listForUser,
  countUnread,
  markRead,
  removeAllForUser,
  getById,
};
