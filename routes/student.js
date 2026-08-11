// routes/student.js
const express = require('express');

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
<<<<<<< HEAD
const testsDb = require('../db/tests');
const testAttemptsDb = require('../db/testAttempts');
const certificatesDb = require('../db/certificates');
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
// Копия теста для ученика: вопросы и варианты без поля correct — правильные
// ответы не должны быть видны ни до, ни во время прохождения.
function sanitizeTest(test) {
  if (!test) return null;
  return {
    ...test,
    questions: test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}

// Проверяет попытку ученика: для каждого вопроса сравнивает выбранные варианты
// с правильными (наборы должны совпадать полностью) и возвращает балл.
function gradeAnswers(test, answers) {
  const byQuestion = {};
  (Array.isArray(answers) ? answers : []).forEach((a) => {
    if (a && a.questionId) byQuestion[a.questionId] = Array.isArray(a.optionIds) ? a.optionIds : [];
  });

  let score = 0;
  const review = test.questions.map((q) => {
    const chosen = (byQuestion[q.id] || []).filter((id) => q.options.some((o) => o.id === id));
    const correct = Array.isArray(q.correct) ? q.correct : [];
    const isCorrect = chosen.length === correct.length && correct.every((id) => chosen.includes(id));
    if (isCorrect) score += 1;
    return { questionId: q.id, chosen, correct, isCorrect };
  });

  return { score, maxScore: test.questions.length, review };
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
router.get('/api/student/courses', (req, res) => {
  const courses = coursesDb.listForStudent(req.user.id).map((c) => ({
    ...c,
    lessonCount: lessonsDb.listByCourse(c.id).length,
  }));
  res.json({ courses });
});

<<<<<<< HEAD
router.get('/api/student/certificates', (req, res) => {
  const certificates = certificatesDb.listByStudent(req.user.id);
  res.json({ certificates });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD

  const test = testsDb.getByLesson(lesson.id);
  const attempts = test ? testAttemptsDb.listByTestAndStudent(test.id, req.user.id) : [];

  res.json({
    lesson,
    course,
    homework,
    submission,
    test: sanitizeTest(test),
    attempts: attempts.map((a) => {
      // Разбор правильных ответов доступен ученику только если учитель включил
      // показ результатов после прохождения.
      const base = {
        id: a.id,
        attemptNumber: a.attemptNumber,
        score: a.score,
        maxScore: a.maxScore,
        submittedAt: a.createdAt,
      };
      if (test && test.showResults) base.review = a.review || null;
      return base;
    }),
  });
=======
  res.json({ lesson, course, homework, submission });
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
router.post('/api/student/lessons/:id/test/submit', (req, res) => {
  const lesson = lessonsDb.getById(req.params.id);
  if (!lesson) return res.status(404).json({ message: 'Урок не найден.' });
  const course = enrolledCourse(req, res, lesson.courseId);
  if (!course) return;

  const test = testsDb.getByLesson(lesson.id);
  if (!test) return res.status(404).json({ message: 'К этому уроку не прикреплён тест.' });

  const rawAttempts = Number(test.attempts);
  const maxAttempts = rawAttempts === 0 ? Infinity : Math.max(1, rawAttempts || 1);
  const done = testAttemptsDb.listByTestAndStudent(test.id, req.user.id);
  if (done.length >= maxAttempts) {
    const msg = 'Вы уже использовали все попытки прохождения теста.';
    return res.status(400).json({ message: msg, errors: [msg] });
  }

  const { score, maxScore, review } = gradeAnswers(test, req.body.answers);
  const attempt = testAttemptsDb.create({
    testId: test.id,
    lessonId: lesson.id,
    studentId: req.user.id,
    answers: (req.body.answers || []).map((a) => ({ questionId: a.questionId, optionIds: a.optionIds || [] })),
    score,
    maxScore,
    attemptNumber: done.length + 1,
    review,
    showResults: !!test.showResults,
  });

  const base = {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score: attempt.score,
    maxScore: attempt.maxScore,
    submittedAt: attempt.createdAt,
  };
  if (test.showResults) base.review = review;

  const remaining = rawAttempts === 0 ? -1 : Math.max(0, maxAttempts - (done.length + 1));
  res.status(201).json({ attempt: base, remainingAttempts: remaining });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
module.exports = router;
