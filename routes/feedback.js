// routes/feedback.js
//
// «Обратная связь»: учитель заполняет ежемесячный отзыв о ребёнке в рамках
// курса (см. db/feedbacks.js), родитель — только читает отзывы по своим детям.

const express = require('express');
const fs = require('fs');
const path = require('path');

const coursesDb = require('../db/courses');
const usersDb = require('../db/users');
const feedbacksDb = require('../db/feedbacks');
const { requireAuth, requireRole } = require('../middleware/auth');
const { feedbackUpload, UPLOAD_DIR, FEEDBACK_PROJECT_MAX_FILES } = require('../middleware/upload');

const router = express.Router();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
}

function clampScore(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function withParents(student) {
  const parents = usersDb.findParentsByChildId(student.id).map(usersDb.publicUser);
  return { ...usersDb.publicUser(student), parents };
}

// ---------- Учитель ----------

router.use('/api/teacher/feedback', requireAuth, requireRole('teacher'));

function ownCourseForTeacher(req, res, courseId) {
  const course = coursesDb.getById(courseId);
  if (!course || (course.teacherId !== req.user.id && req.user.role !== 'director')) {
    res.status(404).json({ message: 'Курс не найден.' });
    return null;
  }
  return course;
}

function courseStudent(req, res, course) {
  const student = usersDb.getById(req.params.studentId);
  if (!student || student.role !== 'student' || !(course.studentIds || []).includes(student.id)) {
    res.status(404).json({ message: 'Ученик не найден в этом курсе.' });
    return null;
  }
  return student;
}

// Список курсов учителя с числом учеников — для стартового экрана раздела.
router.get('/api/teacher/feedback/courses', (req, res) => {
  const courses = coursesDb.listByTeacher(req.user.id).map((c) => ({
    ...c,
    studentCount: (c.studentIds || []).length,
  }));
  res.json({ courses });
});

// Мини-список всех прикреплённых к курсу детей + фамилия/имя привязанного родителя.
router.get('/api/teacher/feedback/courses/:id', (req, res) => {
  const course = ownCourseForTeacher(req, res, req.params.id);
  if (!course) return;
  const students = usersDb
    .listStudents()
    .filter((s) => (course.studentIds || []).includes(s.id))
    .map(withParents);
  res.json({ course, students });
});

// История отзывов конкретного ребёнка по этому курсу (по месяцам, новые сверху).
router.get('/api/teacher/feedback/courses/:courseId/students/:studentId', (req, res) => {
  const course = ownCourseForTeacher(req, res, req.params.courseId);
  if (!course) return;
  const student = courseStudent(req, res, course);
  if (!student) return;
  const entries = feedbacksDb.listByCourseAndStudent(course.id, student.id);
  res.json({ course, student: withParents(student), entries });
});

// Создать/обновить отзыв за месяц (upsert по courseId+studentId+month).
router.post('/api/teacher/feedback/courses/:courseId/students/:studentId', feedbackUpload, (req, res) => {
  const course = ownCourseForTeacher(req, res, req.params.courseId);
  if (!course) return;
  const student = courseStudent(req, res, course);
  if (!student) return;

  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  const month = (req.body.month || '').trim();
  if (!MONTH_RE.test(month)) errors.push('Укажите корректный месяц.');
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму отзыва.', errors });

  const existing = feedbacksDb.getByCourseStudentMonth(course.id, student.id, month);

  const uploadedFiles = (req.files && req.files.projectFiles) || [];
  const newFiles = uploadedFiles.map((f) => ({ filename: f.filename, originalName: f.originalname, size: f.size }));
  const removeIds = [].concat(req.body.removeProjectFiles || []).filter(Boolean);

  let projectFiles = existing ? (existing.projectFiles || []) : [];
  if (removeIds.length) {
    projectFiles = projectFiles.filter((f) => {
      const drop = removeIds.includes(f.filename);
      if (drop) removeFile(f.filename);
      return !drop;
    });
  }
  projectFiles = projectFiles.concat(newFiles).slice(0, FEEDBACK_PROJECT_MAX_FILES + 2);

  const patch = {
    courseId: course.id,
    studentId: student.id,
    teacherId: existing ? existing.teacherId : req.user.id,
    month,
    homeworkPercent: clampScore(req.body.homeworkPercent),
    communicationScore: clampScore(req.body.communicationScore),
    progressScore: clampScore(req.body.progressScore),
    teacherText: (req.body.teacherText || '').trim(),
    focusNotes: (req.body.focusNotes || '').trim(),
    projectFiles,
  };

  const entry = existing ? feedbacksDb.update(existing.id, patch) : feedbacksDb.create(patch);
  res.status(existing ? 200 : 201).json({ entry });
});

router.post('/api/teacher/feedback/:id/delete', (req, res) => {
  const entry = feedbacksDb.getById(req.params.id);
  if (!entry || (entry.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Отзыв не найден.' });
  }
  (entry.projectFiles || []).forEach((f) => removeFile(f.filename));
  feedbacksDb.remove(entry.id);
  res.json({ ok: true });
});

// ---------- Родитель ----------

router.use('/api/parent/feedback', requireAuth, requireRole('parent'));

function parentChild(req, res) {
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

function parentChildCourse(req, res, child) {
  const course = coursesDb.getById(req.params.courseId);
  if (!course || !Array.isArray(course.studentIds) || !course.studentIds.includes(child.id)) {
    res.status(404).json({ message: 'Курс недоступен для этого ребёнка.' });
    return null;
  }
  return course;
}

// История отзывов по месяцам для ребёнка в рамках курса — только для чтения.
router.get('/api/parent/feedback/children/:childId/courses/:courseId', (req, res) => {
  const child = parentChild(req, res);
  if (!child) return;
  const course = parentChildCourse(req, res, child);
  if (!course) return;

  const entries = feedbacksDb.listByCourseAndStudent(course.id, child.id);
  const teachers = {};
  [...new Set(entries.map((e) => e.teacherId))].forEach((id) => {
    const t = usersDb.getById(id);
    if (t) teachers[id] = usersDb.publicUser(t);
  });

  res.json({ course, child: usersDb.publicUser(child), entries, teachers });
});

module.exports = router;
