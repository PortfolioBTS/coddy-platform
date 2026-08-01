// routes/student.js
const express = require('express');

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
const { requireAuth, requireRole } = require('../middleware/auth');
const { homeworkUpload } = require('../middleware/upload');

const router = express.Router();

router.use('/api/student', requireAuth, requireRole('student'));

function enrolledCourse(req, res, courseId) {
  const course = coursesDb.getById(courseId);
  if (!course || !Array.isArray(course.studentIds) || !course.studentIds.includes(req.user.id)) {
    res.status(404).json({ message: 'Курс недоступен — возможно, вас ещё не подключили к нему.' });
    return null;
  }
  return course;
}

router.get('/api/student/courses', (req, res) => {
  const courses = coursesDb.listForStudent(req.user.id).map((c) => ({
    ...c,
    lessonCount: lessonsDb.listByCourse(c.id).length,
  }));
  res.json({ courses });
});

router.get('/api/student/courses/:id', (req, res) => {
  const course = enrolledCourse(req, res, req.params.id);
  if (!course) return;
  const lessons = lessonsDb.listByCourse(course.id);
  res.json({ course, lessons });
});

router.get('/api/student/lessons/:id', (req, res) => {
  const lesson = lessonsDb.getById(req.params.id);
  if (!lesson) return res.status(404).json({ message: 'Урок не найден.' });
  const course = enrolledCourse(req, res, lesson.courseId);
  if (!course) return;

  // Урок и домашнее задание объединены — как только урок опубликован,
  // ответ можно сдавать сразу же.
  const homework = homeworksDb.ensureForLesson(lesson);
  const submission = submissionsDb.getByHomeworkAndStudent(homework.id, req.user.id);
  res.json({ lesson, course, homework, submission });
});

router.post('/api/student/lessons/:id/homework/submit', homeworkUpload, (req, res) => {
  const lesson = lessonsDb.getById(req.params.id);
  if (!lesson) return res.status(404).json({ message: 'Урок не найден.' });
  const course = enrolledCourse(req, res, lesson.courseId);
  if (!course) return;

  const homework = homeworksDb.ensureForLesson(lesson);

  const files = req.files || {};
  const uploadedFiles = files.files || [];
  const comment = (req.body.comment || '').trim();

  if (req.uploadError) {
    return res.status(400).json({ message: req.uploadError, errors: [req.uploadError] });
  }
  if (!uploadedFiles.length && !comment) {
    const msg = 'Прикрепите файл или оставьте комментарий с ответом.';
    return res.status(400).json({ message: msg, errors: [msg] });
  }

  const filesData = uploadedFiles.map((f) => ({ filename: f.filename, originalName: f.originalname, size: f.size }));
  const existing = submissionsDb.getByHomeworkAndStudent(homework.id, req.user.id);

  let submission;
  if (existing) {
    submission = submissionsDb.update(existing.id, {
      files: filesData.length ? filesData : existing.files,
      comment: comment || existing.comment,
      status: 'submitted',
      teacherComment: '',
    });
  } else {
    submission = submissionsDb.create({
      homeworkId: homework.id,
      lessonId: lesson.id,
      studentId: req.user.id,
      files: filesData,
      comment,
    });
  }

  res.status(201).json({ submission });
});

module.exports = router;
