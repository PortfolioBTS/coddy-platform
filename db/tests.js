// db/tests.js
const { Collection } = require('./store');

const tests = new Collection('tests');

function create(data) {
  return tests.insert({
    lessonId: data.lessonId,
    teacherId: data.teacherId,
    title: data.title,
    description: data.description || '',
    showResults: !!data.showResults,
    attempts: data.attempts === 0 ? 0 : (data.attempts || 1),
    questions: data.questions || [],
  });
}

function update(id, data) {
  return tests.updateById(id, data);
}

function remove(id) {
  return tests.deleteById(id);
}

function getById(id) {
  return tests.getById(id);
}

function getByLesson(lessonId) {
  return tests.findOne((t) => t.lessonId === lessonId);
}

function listByLesson(lessonId) {
  return tests.find((t) => t.lessonId === lessonId);
}

function listByTeacher(teacherId) {
  return tests.find((t) => t.teacherId === teacherId);
}

module.exports = { create, update, remove, getById, getByLesson, listByLesson, listByTeacher };
