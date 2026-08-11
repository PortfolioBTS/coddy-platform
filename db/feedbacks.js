// db/feedbacks.js
//
// «Обратная связь» — ежемесячный отзыв учителя о ребёнке по конкретному курсу.
// Один документ = один месяц ('YYYY-MM') для пары курс+ученик. Повторное
// сохранение того же месяца обновляет существующую запись (см. routes/feedback.js).

const { Collection } = require('./store');

const feedbacks = new Collection('feedbacks');

function create(data) {
  return feedbacks.insert({
    courseId: data.courseId,
    studentId: data.studentId,
    teacherId: data.teacherId,
    month: data.month, // 'YYYY-MM'
    homeworkPercent: data.homeworkPercent || 0, // «процент выполненных дз»
    communicationScore: data.communicationScore || 0, // «коммуникация в группе»
    progressScore: data.progressScore || 0, // «успеваемость на уроке»
    teacherText: data.teacherText || '', // текст от преподавателя
    focusNotes: data.focusNotes || '', // основные моменты по работе с ребёнком (по строке на пункт)
    projectFiles: data.projectFiles || [], // [{ filename, originalName, size }]
  });
}

function update(id, patch) {
  return feedbacks.updateById(id, patch);
}

function remove(id) {
  return feedbacks.deleteById(id);
}

function getById(id) {
  return feedbacks.getById(id);
}

function getByCourseStudentMonth(courseId, studentId, month) {
  return feedbacks.findOne((f) => f.courseId === courseId && f.studentId === studentId && f.month === month);
}

// История отзывов по ребёнку в рамках курса, от новых месяцев к старым —
// используется и учителем (форма/история), и родителем (просмотр по месяцам).
function listByCourseAndStudent(courseId, studentId) {
  return feedbacks
    .find((f) => f.courseId === courseId && f.studentId === studentId)
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}

function listByTeacher(teacherId) {
  return feedbacks.find((f) => f.teacherId === teacherId);
}

function findByFile(filename) {
  return feedbacks.findOne((f) => Array.isArray(f.projectFiles) && f.projectFiles.some((p) => p.filename === filename));
}

module.exports = {
  create,
  update,
  remove,
  getById,
  getByCourseStudentMonth,
  listByCourseAndStudent,
  listByTeacher,
  findByFile,
};
