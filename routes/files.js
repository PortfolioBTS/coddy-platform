// routes/files.js
const express = require('express');
const path = require('path');

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
const { requireAuth } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

function courseAllows(course, user) {
  if (!course) return false;
  return (
    (user.role === 'teacher' && course.teacherId === user.id) ||
    (user.role === 'student' && course.studentIds.includes(user.id))
  );
}

function send(res, filename) {
  return res.sendFile(path.join(UPLOAD_DIR, filename), (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'Файл не найден.' });
  });
}

router.get('/files/:filename', requireAuth, (req, res) => {
  const { filename } = req.params;
  const user = req.user;

  // 1) Обложка курса
  const course = coursesDb.findByFile(filename);
  if (course) {
    if (!courseAllows(course, user)) return res.status(403).json({ message: 'Доступ запрещён.' });
    return send(res, filename);
  }

  // 2) Файл урока (обложка / вложение / видео) — права проверяются через курс урока
  const lesson = lessonsDb.findByFile(filename);
  if (lesson) {
    const lessonCourse = coursesDb.getById(lesson.courseId);
    if (!courseAllows(lessonCourse, user)) return res.status(403).json({ message: 'Доступ запрещён.' });
    return send(res, filename);
  }

  // 3) Файл, приложенный учеником к домашней работе
  const submission = submissionsDb.findByFile(filename);
  if (submission) {
    const homework = homeworksDb.getById(submission.homeworkId);
    const allowed =
      (user.role === 'student' && submission.studentId === user.id) ||
      (user.role === 'teacher' && homework && homework.teacherId === user.id);
    if (!allowed) return res.status(403).json({ message: 'Доступ запрещён.' });
    return send(res, filename);
  }

  res.status(404).json({ message: 'Файл не найден.' });
});

module.exports = router;
