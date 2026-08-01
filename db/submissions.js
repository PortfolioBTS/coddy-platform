// db/submissions.js
const { Collection } = require('./store');

const submissions = new Collection('submissions');

// status: 'submitted' -> ученик сдал, ждёт проверки
//         'reviewed'  -> учитель оставил комментарий/проверил

function create(data) {
  return submissions.insert({
    homeworkId: data.homeworkId,
    lessonId: data.lessonId,
    studentId: data.studentId,
    files: data.files || [], // [{ filename, originalName, size }, ...] — до 5 файлов
    comment: data.comment || '',
    status: 'submitted',
    teacherComment: '',
  });
}

function update(id, data) {
  return submissions.updateById(id, data);
}

function getById(id) {
  return submissions.getById(id);
}

function getByHomeworkAndStudent(homeworkId, studentId) {
  return submissions.findOne((s) => s.homeworkId === homeworkId && s.studentId === studentId);
}

function listByHomework(homeworkId) {
  return submissions.find((s) => s.homeworkId === homeworkId);
}

function findByFile(filename) {
  return submissions.findOne((s) => Array.isArray(s.files) && s.files.some((f) => f.filename === filename));
}

module.exports = { create, update, getById, getByHomeworkAndStudent, listByHomework, findByFile };
