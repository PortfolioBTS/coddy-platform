// db/users.js
const bcrypt = require('bcryptjs');
const { Collection } = require('./store');

const users = new Collection('users');

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

async function createUser({ role, firstName, lastName, city, phone, email, password, birthDate }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return users.insert({
    role,
    firstName,
    lastName,
    city,
    phone,
    email: email.toLowerCase().trim(),
    birthDate: birthDate || null,
    passwordHash,
  });
}

function findByEmail(email) {
  return users.findOne((u) => u.email === email.toLowerCase().trim());
}

function getById(id) {
  return users.getById(id);
}

async function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

function listStudents() {
  return users.find((u) => u.role === 'student');
}

function listTeachers() {
  return users.find((u) => u.role === 'teacher');
}

function remove(id) {
  return users.deleteById(id);
}

module.exports = {
  createUser,
  findByEmail,
  getById,
  verifyPassword,
  listStudents,
  listTeachers,
  publicUser,
  remove,
};
