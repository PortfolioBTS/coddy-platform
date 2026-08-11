// db/homeworks.js
const { Collection } = require('./store');

const homeworks = new Collection('homeworks');

function create(data) {
  return homeworks.insert({
    lessonId: data.lessonId,
    teacherId: data.teacherId,
    title: data.title,
    description: data.description || '',
    deadline: data.deadline || null,
  });
}

function update(id, data) {
  return homeworks.updateById(id, data);
}

function remove(id) {
  return homeworks.deleteById(id);
}

function getById(id) {
  return homeworks.getById(id);
}

function getByLesson(lessonId) {
  return homeworks.findOne((h) => h.lessonId === lessonId);
}

// Уроки и домашние задания объединены в UI (один шаг «Создать урок» сразу
// открывает возможность сдавать ответ), но Submission по-прежнему ссылается
// на homeworkId, поэтому запись Homework создаётся автоматически и прозрачно
// для пользователя — учителю больше не нужно создавать её отдельным шагом.
function ensureForLesson(lesson) {
  const existing = getByLesson(lesson.id);
  if (existing) return existing;
  return create({
    lessonId: lesson.id,
    teacherId: lesson.teacherId,
    title: lesson.title,
    description: lesson.description || '',
    deadline: lesson.deadline || null,
  });
}

// Держит заголовок/описание/дедлайн домашнего задания синхронизированными с
// уроком при каждом редактировании урока (отдельной формы для этого больше нет).
function syncWithLesson(lesson) {
  const hw = ensureForLesson(lesson);
  return update(hw.id, {
    title: lesson.title,
    description: lesson.description || '',
    deadline: lesson.deadline || null,
  });
}

function listByTeacher(teacherId) {
  return homeworks
    .find((h) => h.teacherId === teacherId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  create,
  update,
  remove,
  getById,
  getByLesson,
  ensureForLesson,
  syncWithLesson,
  listByTeacher,
};
