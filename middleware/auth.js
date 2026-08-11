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

<<<<<<< HEAD
// Защита разделов от пользователей с другой ролью — на уровне API.
// Директор имеет полный доступ ко всем разделам платформы.
function requireRole(role) {
  const labels = { teacher: 'учителям', student: 'ученикам', parent: 'родителям' };
=======
// Защита разделов учителя от учеников (и наоборот) — на уровне API.
function requireRole(role) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется вход в систему.' });
    }
<<<<<<< HEAD
    if (req.user.role === role || req.user.role === 'director') {
      return next();
    }
    return res.status(403).json({
      message: `Этот раздел доступен только ${labels[role] || 'определённой роли'}.`,
    });
=======
    if (req.user.role !== role) {
      return res.status(403).json({
        message:
          role === 'teacher'
            ? 'Этот раздел доступен только учителям.'
            : 'Этот раздел доступен только ученикам.',
      });
    }
    next();
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  };
}

module.exports = { loadUser, requireAuth, requireRole };
