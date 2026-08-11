// db/courses.js
const { Collection } = require('./store');

const courses = new Collection('courses');

function create(data) {
  return courses.insert({
    title: data.title,
    description: data.description || '',
    academicYear: data.academicYear || '',
    coverImage: data.coverImage || null,
    teacherId: data.teacherId,
    studentIds: data.studentIds || [],
  });
}

function update(id, data) {
  return courses.updateById(id, data);
}

function remove(id) {
  return courses.deleteById(id);
}

function getById(id) {
  return courses.getById(id);
}

function listByTeacher(teacherId) {
  return courses
    .find((c) => c.teacherId === teacherId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listForStudent(studentId) {
  return courses
    .find((c) => Array.isArray(c.studentIds) && c.studentIds.includes(studentId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Находит курс, которому принадлежит файл (сейчас это только обложка курса).
function findByFile(filename) {
  return courses.findOne((c) => c.coverImage === filename);
}

module.exports = { create, update, remove, getById, listByTeacher, listForStudent, findByFile, all: () => courses.all() };
