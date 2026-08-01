// routes/teacher.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
const usersDb = require('../db/users');
const { requireAuth, requireRole } = require('../middleware/auth');
const { courseUpload, lessonUpload, UPLOAD_DIR } = require('../middleware/upload');
const alfacrm = require('../alfacrm');

const router = express.Router();

router.use('/api/teacher', requireAuth, requireRole('teacher'));

function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
}

function ownCourse(req, res) {
  const course = coursesDb.getById(req.params.id);
  if (!course || course.teacherId !== req.user.id) {
    res.status(404).json({ message: 'Курс не найден.' });
    return null;
  }
  return course;
}

function ownLesson(req, res) {
  const lesson = lessonsDb.getById(req.params.id);
  if (!lesson || lesson.teacherId !== req.user.id) {
    res.status(404).json({ message: 'Урок не найден.' });
    return null;
  }
  return lesson;
}

function courseSummary(course) {
  return {
    ...course,
    lessonCount: lessonsDb.listByCourse(course.id).length,
    studentCount: (course.studentIds || []).length,
  };
}

function submissionRowsFor(lesson) {
  // Урок и домашнее задание объединены в UI — homework гарантированно
  // существует (создаётся вместе с уроком), ensureForLesson подстрахует
  // и старые записи, если урок почему-то создавался раньше этого изменения.
  const homework = homeworksDb.ensureForLesson(lesson);
  const course = coursesDb.getById(lesson.courseId);
  const enrolledStudents = course
    ? usersDb.listStudents().filter((s) => course.studentIds.includes(s.id)).map(usersDb.publicUser)
    : [];
  const rows = enrolledStudents.map((student) => ({
    student,
    submission: submissionsDb.getByHomeworkAndStudent(homework.id, student.id),
  }));
  return { homework, enrolledStudents, rows };
}

// ---------- Курсы ----------

router.get('/api/teacher/courses', (req, res) => {
  const courses = coursesDb.listByTeacher(req.user.id).map(courseSummary);
  res.json({ courses });
});

router.post('/api/teacher/courses', courseUpload, (req, res) => {
  const { title, description, academicYear } = req.body;
  const studentIds = [].concat(req.body.studentIds || []).filter(Boolean);
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim()) errors.push('Укажите название курса.');

  if (errors.length) return res.status(400).json({ message: 'Проверьте форму курса.', errors });

  const files = req.files || {};
  const cover = files.cover && files.cover[0] ? files.cover[0].filename : null;

  const course = coursesDb.create({
    title: title.trim(),
    description: (description || '').trim(),
    academicYear: (academicYear || '').trim(),
    coverImage: cover,
    teacherId: req.user.id,
    studentIds,
  });

  res.status(201).json({ course });
});

router.get('/api/teacher/courses/:id', (req, res) => {
  const course = ownCourse(req, res);
  if (!course) return;
  const lessons = lessonsDb.listByCourse(course.id);
  const enrolledStudents = usersDb.listStudents().filter((s) => course.studentIds.includes(s.id)).map(usersDb.publicUser);
  const allStudents = usersDb.listStudents().map(usersDb.publicUser);
  res.json({ course, lessons, enrolledStudents, allStudents });
});

router.put('/api/teacher/courses/:id', courseUpload, (req, res) => {
  const course = ownCourse(req, res);
  if (!course) return;

  const { title, description, academicYear, removeCover } = req.body;
  const studentIds = [].concat(req.body.studentIds || []).filter(Boolean);
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim()) errors.push('Укажите название курса.');
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму курса.', errors });

  const files = req.files || {};
  const patch = { title: title.trim(), description: (description || '').trim(), academicYear: (academicYear || '').trim(), studentIds };

  if (files.cover && files.cover[0]) {
    removeFile(course.coverImage);
    patch.coverImage = files.cover[0].filename;
  } else if (removeCover === '1') {
    removeFile(course.coverImage);
    patch.coverImage = null;
  }

  const updated = coursesDb.update(course.id, patch);
  res.json({ course: updated });
});

router.post('/api/teacher/courses/:id/delete', (req, res) => {
  const course = ownCourse(req, res);
  if (!course) return;

  if ((req.body.confirmText || '').trim() !== 'УДАЛИТЬ') {
    return res.status(400).json({ message: 'Чтобы удалить курс, введите слово «УДАЛИТЬ» без ошибок.' });
  }

  removeFile(course.coverImage);

  lessonsDb.listByCourse(course.id).forEach((lesson) => {
    removeFile(lesson.coverImage);
    (lesson.attachments || []).forEach((a) => removeFile(a.filename));
    if (lesson.video && lesson.video.type === 'file') removeFile(lesson.video.value);

    const homework = homeworksDb.getByLesson(lesson.id);
    if (homework) {
      submissionsDb.listByHomework(homework.id).forEach((s) => {
        (s.files || []).forEach((f) => removeFile(f.filename));
      });
      homeworksDb.remove(homework.id);
    }
    lessonsDb.remove(lesson.id);
  });

  coursesDb.remove(course.id);
  res.json({ ok: true });
});

// ---------- Уроки ----------

router.post('/api/teacher/courses/:id/lessons', lessonUpload, (req, res) => {
  const course = ownCourse(req, res);
  if (!course) return;

  const { title, description, content, deadline, videoUrl, alfacrmSubjectId, alfacrmSubjectName } = req.body;
  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim()) errors.push('Укажите название урока.');
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму урока.', errors });

  const files = req.files || {};
  const cover = files.cover && files.cover[0] ? files.cover[0].filename : null;
  const attachments = (files.attachments || []).map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
  }));

  let video = null;
  if (files.videoFile && files.videoFile[0]) {
    video = { type: 'file', value: files.videoFile[0].filename, originalName: files.videoFile[0].originalname };
  } else if (videoUrl && videoUrl.trim()) {
    video = { type: 'url', value: videoUrl.trim() };
  }

  const lesson = lessonsDb.create({
    courseId: course.id,
    teacherId: req.user.id,
    title: title.trim(),
    description: (description || '').trim(),
    content: content || '',
    coverImage: cover,
    attachments,
    video,
    deadline: deadline || null,
    alfacrmSubjectId: alfacrmSubjectId || null,
    alfacrmSubjectName: alfacrmSubjectName || null,
  });

  // Уроки и домашние задания объединены: как только урок создан, ученики
  // сразу могут сдавать ответ — отдельного шага «Добавить задание» больше нет.
  homeworksDb.ensureForLesson(lesson);

  res.status(201).json({ lesson });
});

router.get('/api/teacher/lessons/:id', (req, res) => {
  const lesson = ownLesson(req, res);
  if (!lesson) return;
  const course = coursesDb.getById(lesson.courseId);
  const { homework, rows } = submissionRowsFor(lesson);
  res.json({ lesson, course, homework, submissionRows: rows });
});

router.put('/api/teacher/lessons/:id', lessonUpload, (req, res) => {
  const lesson = ownLesson(req, res);
  if (!lesson) return;

  const { title, description, content, deadline, videoUrl, removeCover, removeVideo, alfacrmSubjectId, alfacrmSubjectName } = req.body;
  const removeAttachmentIds = [].concat(req.body.removeAttachments || []).filter(Boolean);
  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim()) errors.push('Укажите название урока.');
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму урока.', errors });

  const files = req.files || {};
  const patch = {
    title: title.trim(),
    description: (description || '').trim(),
    content: content || '',
    deadline: deadline || null,
    alfacrmSubjectId: alfacrmSubjectId || null,
    alfacrmSubjectName: alfacrmSubjectName || null,
  };

  if (files.cover && files.cover[0]) {
    removeFile(lesson.coverImage);
    patch.coverImage = files.cover[0].filename;
  } else if (removeCover === '1') {
    removeFile(lesson.coverImage);
    patch.coverImage = null;
  }

  let attachments = lesson.attachments || [];
  if (removeAttachmentIds.length) {
    attachments = attachments.filter((a) => {
      const drop = removeAttachmentIds.includes(a.filename);
      if (drop) removeFile(a.filename);
      return !drop;
    });
  }
  if (files.attachments && files.attachments.length) {
    attachments = attachments.concat(
      files.attachments.map((f) => ({ filename: f.filename, originalName: f.originalname, size: f.size }))
    );
  }
  patch.attachments = attachments;

  if (files.videoFile && files.videoFile[0]) {
    if (lesson.video && lesson.video.type === 'file') removeFile(lesson.video.value);
    patch.video = { type: 'file', value: files.videoFile[0].filename, originalName: files.videoFile[0].originalname };
  } else if (videoUrl && videoUrl.trim()) {
    if (lesson.video && lesson.video.type === 'file') removeFile(lesson.video.value);
    patch.video = { type: 'url', value: videoUrl.trim() };
  } else if (removeVideo === '1') {
    if (lesson.video && lesson.video.type === 'file') removeFile(lesson.video.value);
    patch.video = null;
  }

  const updated = lessonsDb.update(lesson.id, patch);
  homeworksDb.syncWithLesson(updated);
  res.json({ lesson: updated });
});

router.post('/api/teacher/lessons/:id/delete', (req, res) => {
  const lesson = ownLesson(req, res);
  if (!lesson) return;

  if ((req.body.confirmText || '').trim() !== 'УДАЛИТЬ') {
    return res.status(400).json({ message: 'Чтобы удалить урок, введите слово «УДАЛИТЬ» без ошибок.' });
  }

  removeFile(lesson.coverImage);
  (lesson.attachments || []).forEach((a) => removeFile(a.filename));
  if (lesson.video && lesson.video.type === 'file') removeFile(lesson.video.value);

  const homework = homeworksDb.getByLesson(lesson.id);
  if (homework) {
    submissionsDb.listByHomework(homework.id).forEach((s) => {
      (s.files || []).forEach((f) => removeFile(f.filename));
    });
    homeworksDb.remove(homework.id);
  }

  lessonsDb.remove(lesson.id);
  res.json({ ok: true });
});

// ---------- Работы учеников ----------

router.get('/api/teacher/submissions/:id', (req, res) => {
  const submission = submissionsDb.getById(req.params.id);
  const homework = submission && homeworksDb.getById(submission.homeworkId);
  if (!submission || !homework || homework.teacherId !== req.user.id) {
    return res.status(404).json({ message: 'Такой сданной работы не существует.' });
  }
  const student = usersDb.getById(submission.studentId);
  const lesson = lessonsDb.getById(homework.lessonId);
  const course = lesson ? coursesDb.getById(lesson.courseId) : null;
  res.json({ submission, homework, lesson, course, student: usersDb.publicUser(student) });
});

router.post('/api/teacher/submissions/:id/comment', (req, res) => {
  const submission = submissionsDb.getById(req.params.id);
  const homework = submission && homeworksDb.getById(submission.homeworkId);
  if (!submission || !homework || homework.teacherId !== req.user.id) {
    return res.status(404).json({ message: 'Такой сданной работы не существует.' });
  }
  const updated = submissionsDb.update(submission.id, {
    teacherComment: (req.body.teacherComment || '').trim(),
    status: 'reviewed',
  });
  res.json({ submission: updated });
});

// ---------- Ученики ----------

router.get('/api/teacher/students', (req, res) => {
  const students = usersDb.listStudents().map(usersDb.publicUser);
  res.json({ students });
});

router.get('/api/teacher/students/balances', async (req, res) => {
  const ids = [].concat(req.query.ids || []).filter(Boolean);
  if (!ids.length) return res.json({ balances: {} });
  const balances = {};
  for (const id of ids) {
    const user = usersDb.getById(id);
    if (user && user.alfacrmCustomerId) {
      try {
        const result = await alfacrm.getCustomerBonus(user.alfacrmCustomerId);
        balances[id] = result.balance ?? result;
      } catch {
        balances[id] = null;
      }
    } else {
      balances[id] = null;
    }
  }
  res.json({ balances });
});

router.post('/api/teacher/students/:id/delete', (req, res) => {
  const student = usersDb.getById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Ученик не найден.' });
  }

  coursesDb.all().forEach((course) => {
    if (course.studentIds && course.studentIds.includes(student.id)) {
      coursesDb.update(course.id, {
        studentIds: course.studentIds.filter((sid) => sid !== student.id),
      });
    }
  });

  const removed = usersDb.remove(student.id);
  if (!removed) {
    return res.status(500).json({ message: 'Не удалось удалить ученика.' });
  }
  res.json({ ok: true });
});

module.exports = router;
