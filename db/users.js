// db/users.js
const bcrypt = require('bcryptjs');
const { Collection } = require('./store');

const users = new Collection('users');

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

<<<<<<< HEAD
async function createUser({ role, firstName, lastName, city, phone, email, password, birthDate, teacherCode, childIds }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const record = {
=======
async function createUser({ role, firstName, lastName, city, phone, email, password, birthDate }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return users.insert({
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    role,
    firstName,
    lastName,
    city,
    phone,
    email: email.toLowerCase().trim(),
    birthDate: birthDate || null,
    passwordHash,
<<<<<<< HEAD
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
=======
  });
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
}

function findByEmail(email) {
  return users.findOne((u) => u.email === email.toLowerCase().trim());
}

<<<<<<< HEAD
function findByTgId(tgId) {
  if (tgId == null || tgId === '') return null;
  return users.findOne((u) => u.tgId != null && String(u.tgId) === String(tgId));
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
function getById(id) {
  return users.getById(id);
}

async function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

<<<<<<< HEAD
async function updatePassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return users.updateById(id, { passwordHash, plainPassword: password });
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
function listStudents() {
  return users.find((u) => u.role === 'student');
}

function listTeachers() {
  return users.find((u) => u.role === 'teacher');
}

<<<<<<< HEAD
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

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
function remove(id) {
  return users.deleteById(id);
}

module.exports = {
  createUser,
  findByEmail,
<<<<<<< HEAD
  findByTgId,
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  getById,
  verifyPassword,
  listStudents,
  listTeachers,
<<<<<<< HEAD
  listDirectors,
  listParents,
  findParentsByChildId,
  isValidTeacherCode,
  updateProfile,
  updatePassword,
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  publicUser,
  remove,
};
