// routes/parent.js
//
// Раздел родителя: «Курсы детей» (то же самое, что видит ребёнок, но без
// возможности сдавать дз/проходить тесты — только просмотр + статистика по
// тестам, как у учителя, но лишь по своему ребёнку).

const express = require('express');

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
const testsDb = require('../db/tests');
const usersDb = require('../db/users');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeTestStats } = require('../utils/testStats');

const router = express.Router();

router.use('/api/parent', requireAuth, requireRole('parent'));

function ownChild(req, res) {
  const childId = req.params.childId;
  if (!Array.isArray(req.user.childIds) || !req.user.childIds.includes(childId)) {
    res.status(404).json({ message: 'Ребёнок не найден.' });
    return null;
  }
  const child = usersDb.getById(childId);
  if (!child || child.role !== 'student') {
    res.status(404).json({ message: 'Ребёнок не найден.' });
    return null;
  }
  return child;
}

function childCourse(req, res, child) {
  const course = coursesDb.getById(req.params.courseId);
  if (!course || !Array.isArray(course.studentIds) || !course.studentIds.includes(child.id)) {
    res.status(404).json({ message: 'Курс недоступен для этого ребёнка.' });
    return null;
  }
  return course;
}

// Список привязанных детей — у одного родителя их может быть несколько.
router.get('/api/parent/children', (req, res) => {
  const ids = Array.isArray(req.user.childIds) ? req.user.childIds : [];
  const children = ids.map((id) => usersDb.getById(id)).filter((u) => u && u.role === 'student').map(usersDb.publicUser);
  res.json({ children });
});

// Привязка ещё одного (уже зарегистрированного) ребёнка к аккаунту родителя —
// по логину (почте), так же, как при регистрации родителя (routes/auth.js).
// Принимает либо один childLogin, либо массив childLogins — можно добавить
// сразу нескольких детей за один запрос.
router.post('/api/parent/children', (req, res) => {
  const rawLogins = []
    .concat(req.body.childLogins || req.body.childLogin || [])
    .map((l) => String(l || '').trim())
    .filter(Boolean);

  if (!rawLogins.length) {
    return res.status(400).json({ message: 'Укажите логин хотя бы одного ребёнка.', errors: ['Укажите логин хотя бы одного ребёнка.'] });
  }

  const existingIds = Array.isArray(req.user.childIds) ? req.user.childIds : [];
  const seenLogins = new Set();
  const newIds = [];
  const notFound = [];
  const alreadyLinked = [];

  rawLogins.forEach((login) => {
    const key = login.toLowerCase();
    if (seenLogins.has(key)) return;
    seenLogins.add(key);

    const child = usersDb.findByEmail(login);
    if (!child || child.role !== 'student') {
      notFound.push(login);
      return;
    }
    if (existingIds.includes(child.id) || newIds.includes(child.id)) {
      alreadyLinked.push(login);
      return;
    }
    newIds.push(child.id);
  });

  const errors = [];
  if (notFound.length) errors.push(`Не найден ученик с логином: ${notFound.join(', ')}.`);
  if (alreadyLinked.length) errors.push(`Уже привязан(ы) к вашему аккаунту: ${alreadyLinked.join(', ')}.`);
  if (errors.length) {
    return res.status(400).json({ message: 'Не удалось добавить ребёнка.', errors });
  }

  const updated = usersDb.updateProfile(req.user.id, { childIds: [...existingIds, ...newIds] });
  const children = (updated.childIds || [])
    .map((id) => usersDb.getById(id))
    .filter((u) => u && u.role === 'student')
    .map(usersDb.publicUser);

  res.status(201).json({ user: usersDb.publicUser(updated), children });
});

router.get('/api/parent/children/:childId/courses', (req, res) => {
  const child = ownChild(req, res);
  if (!child) return;
  const courses = coursesDb.listForStudent(child.id).map((c) => ({
    ...c,
    lessonCount: lessonsDb.listByCourse(c.id).length,
  }));
  res.json({ child: usersDb.publicUser(child), courses });
});

router.get('/api/parent/children/:childId/courses/:courseId', (req, res) => {
  const child = ownChild(req, res);
  if (!child) return;
  const course = childCourse(req, res, child);
  if (!course) return;
  const lessons = lessonsDb.listByCourse(course.id);
  res.json({ child: usersDb.publicUser(child), course, lessons });
});

// То же, что видит ученик на странице урока, но:
//  — submission отдаётся только для чтения (без формы сдачи);
//  — вместо теста для прохождения — статистика теста в духе учительской
//    таблицы (лучший балл, число попыток, дата последней), но только по
//    этому одному ребёнку.
router.get('/api/parent/children/:childId/lessons/:id', (req, res) => {
  const child = ownChild(req, res);
  if (!child) return;
  const lesson = lessonsDb.getById(req.params.id);
  if (!lesson) return res.status(404).json({ message: 'Урок не найден.' });
  const course = coursesDb.getById(lesson.courseId);
  if (!course || !Array.isArray(course.studentIds) || !course.studentIds.includes(child.id)) {
    return res.status(404).json({ message: 'Урок недоступен для этого ребёнка.' });
  }

  const homework = homeworksDb.ensureForLesson(lesson);
  const submission = submissionsDb.getByHomeworkAndStudent(homework.id, child.id);

  const test = testsDb.getByLesson(lesson.id);
  const testStats = test ? computeTestStats(test, [usersDb.publicUser(child)]) : null;

  res.json({
    child: usersDb.publicUser(child),
    lesson,
    course,
    homework,
    submission,
    test: test
      ? { id: test.id, title: test.title, description: test.description, questionCount: test.questions.length, attempts: test.attempts }
      : null,
    testStats,
  });
});

module.exports = router;
