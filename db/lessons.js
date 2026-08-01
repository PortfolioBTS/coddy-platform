// db/lessons.js
const { Collection } = require('./store');

const lessons = new Collection('lessons');

function create(data) {
  return lessons.insert({
    courseId: data.courseId,
    teacherId: data.teacherId,
    title: data.title,
    description: data.description || '',
    content: data.content || '',
    coverImage: data.coverImage || null,
    attachments: data.attachments || [],
    video: data.video || null, // { type: 'file'|'url', value: '...', originalName? }
    deadline: data.deadline || null,
  });
}

function update(id, data) {
  return lessons.updateById(id, data);
}

function remove(id) {
  return lessons.deleteById(id);
}

function getById(id) {
  return lessons.getById(id);
}

function listByCourse(courseId) {
  const items = lessons.find((l) => l.courseId === courseId);
  // Порядковый номер урока — это его место по дате создания (1 = создан первым),
  // а не позиция в списке: список ниже сортируется в обратном порядке (новые
  // уроки сверху), но номер урока при этом не должен «прыгать».
  const chronological = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  chronological.forEach((l, i) => { l.orderNumber = i + 1; });
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listByTeacher(teacherId) {
  return lessons
    .find((l) => l.teacherId === teacherId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Находит урок, которому принадлежит файл с данным именем (обложка, вложение или видео).
function findByFile(filename) {
  return lessons.findOne((l) => {
    if (l.coverImage === filename) return true;
    if (l.video && l.video.type === 'file' && l.video.value === filename) return true;
    if (Array.isArray(l.attachments) && l.attachments.some((a) => a.filename === filename)) return true;
    return false;
  });
}

module.exports = { create, update, remove, getById, listByCourse, listByTeacher, findByFile };
