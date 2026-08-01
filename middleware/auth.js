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

// Защита разделов учителя от учеников (и наоборот) — на уровне API.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется вход в систему.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        message:
          role === 'teacher'
            ? 'Этот раздел доступен только учителям.'
            : 'Этот раздел доступен только ученикам.',
      });
    }
    next();
  };
}

module.exports = { loadUser, requireAuth, requireRole };
