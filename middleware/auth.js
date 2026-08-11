// middleware/auth.js
const users = require('../db/users');

// Кладём текущего пользователя в req.user, если сессия валидна.
function loadUser(req, res, next) {
  if (req.session && req.session.userId) {
    const user = users.getById(req.session.userId);
    if (user) {
      req.user = users.publicUser(user);
      return next();
    }
  }
  req.user = null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Требуется вход в систему.' });
  }
  next();
}

// Защита разделов от пользователей с другой ролью — на уровне API.
// Директор имеет полный доступ ко всем разделам платформы.
function requireRole(role) {
  const labels = { teacher: 'учителям', student: 'ученикам', parent: 'родителям' };
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется вход в систему.' });
    }
    if (req.user.role === role || req.user.role === 'director') {
      return next();
    }
    return res.status(403).json({
      message: `Этот раздел доступен только ${labels[role] || 'определённой роли'}.`,
    });
  };
}

module.exports = { loadUser, requireAuth, requireRole };
