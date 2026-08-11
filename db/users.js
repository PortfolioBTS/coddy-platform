// db/users.js
const bcrypt = require('bcryptjs');
const { Collection } = require('./store');

const users = new Collection('users');

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

async function createUser({ role, firstName, lastName, city, phone, email, password, birthDate, teacherCode, childIds }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const record = {
    role,
    firstName,
    lastName,
    city,
    phone,
    email: email.toLowerCase().trim(),
    birthDate: birthDate || null,
    passwordHash,
  };
  if (password) {
    record.plainPassword = password;
  }
  if (role === 'teacher' && teacherCode != null && String(teacherCode).trim()) {
    record.teacherCode = String(teacherCode).trim();
  }
  // Родитель привязан к одному или нескольким ученикам по их id (найденным
  // на регистрации по логину-почте ребёнка) — см. routes/auth.js.
  if (role === 'parent') {
    record.childIds = Array.isArray(childIds) ? childIds.filter(Boolean) : [];
  }
  return users.insert(record);
}

function findByEmail(email) {
  return users.findOne((u) => u.email === email.toLowerCase().trim());
}

function findByTgId(tgId) {
  if (tgId == null || tgId === '') return null;
  return users.findOne((u) => u.tgId != null && String(u.tgId) === String(tgId));
}

function getById(id) {
  return users.getById(id);
}

async function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

async function updatePassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return users.updateById(id, { passwordHash, plainPassword: password });
}

function listStudents() {
  return users.find((u) => u.role === 'student');
}

function listTeachers() {
  return users.find((u) => u.role === 'teacher');
}

function listDirectors() {
  return users.find((u) => u.role === 'director');
}

function listParents() {
  return users.find((u) => u.role === 'parent');
}

// Все родители, привязанные к данному ученику (у одного ребёнка их может
// быть несколько — например мама и папа зарегистрировались отдельно).
function findParentsByChildId(childId) {
  return users.find((u) => u.role === 'parent' && Array.isArray(u.childIds) && u.childIds.includes(childId));
}

// Проверяет, что переданный код совпадает с кодом любого директора.
// Именно эти коды директоры выдают желающим стать педагогами.
function isValidTeacherCode(code) {
  if (code == null || String(code).trim() === '') return false;
  const clean = String(code).trim();
  return users.find((u) => u.role === 'director' && u.teacherCode === clean).length > 0;
}

function updateProfile(id, fields) {
  return users.updateById(id, fields);
}

function remove(id) {
  return users.deleteById(id);
}

module.exports = {
  createUser,
  findByEmail,
  findByTgId,
  getById,
  verifyPassword,
  listStudents,
  listTeachers,
  listDirectors,
  listParents,
  findParentsByChildId,
  isValidTeacherCode,
  updateProfile,
  updatePassword,
  publicUser,
  remove,
};
