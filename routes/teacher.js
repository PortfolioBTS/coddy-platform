// routes/teacher.js
const express = require('express');
const fs = require('fs');
const path = require('path');
<<<<<<< HEAD
const crypto = require('crypto');
=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3

const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
<<<<<<< HEAD
const testsDb = require('../db/tests');
const testAttemptsDb = require('../db/testAttempts');
const usersDb = require('../db/users');
const { requireAuth, requireRole } = require('../middleware/auth');
const { courseUpload, lessonUpload, UPLOAD_DIR } = require('../middleware/upload');
const gforms = require('../utils/gforms');
const { computeTestStats } = require('../utils/testStats');
const alfacrm = require('../alfacrm');
const telegram = require('../services/telegram');
=======
const usersDb = require('../db/users');
const { requireAuth, requireRole } = require('../middleware/auth');
const { courseUpload, lessonUpload, UPLOAD_DIR } = require('../middleware/upload');
const alfacrm = require('../alfacrm');
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3

const router = express.Router();

router.use('/api/teacher', requireAuth, requireRole('teacher'));

function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
}

<<<<<<< HEAD
// Копирует файл в uploads с новым именем. Если файл не найден — возвращает
// null (для необязательных файлов) или исходное имя (для критичных ссылок).
function copyFileToUploads(filename) {
  if (!filename) return null;
  const ext = path.extname(filename);
  const newName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  try {
    fs.copyFileSync(path.join(UPLOAD_DIR, filename), path.join(UPLOAD_DIR, newName));
    return newName;
  } catch (err) {
    return null;
  }
}

// Создаёт глубокую копию данных урока (кроме служебных id) для переноса в другой курс.
function cloneLessonData(lesson) {
  return {
    title: lesson.title,
    description: lesson.description || '',
    content: lesson.content || '',
    coverImage: copyFileToUploads(lesson.coverImage),
    attachments: (lesson.attachments || []).map((a) => ({
      filename: copyFileToUploads(a.filename),
      originalName: a.originalName,
      size: a.size,
    })),
    video: lesson.video
      ? lesson.video.type === 'file'
        ? { type: 'file', value: copyFileToUploads(lesson.video.value), originalName: lesson.video.originalName }
        : { type: 'url', value: lesson.video.value }
      : null,
    deadline: lesson.deadline || null,
    alfacrmSubjectId: lesson.alfacrmSubjectId || null,
    alfacrmSubjectName: lesson.alfacrmSubjectName || null,
  };
}

function cloneTestData(test) {
  return {
    title: test.title,
    description: test.description || '',
    showResults: !!test.showResults,
    attempts: test.attempts,
    questions: JSON.parse(JSON.stringify(test.questions || [])),
  };
}

function ownCourse(req, res) {
  const course = coursesDb.getById(req.params.id);
  if (!course || (course.teacherId !== req.user.id && req.user.role !== 'director')) {
=======
function ownCourse(req, res) {
  const course = coursesDb.getById(req.params.id);
  if (!course || course.teacherId !== req.user.id) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    res.status(404).json({ message: 'Курс не найден.' });
    return null;
  }
  return course;
}

function ownLesson(req, res) {
  const lesson = lessonsDb.getById(req.params.id);
<<<<<<< HEAD
  if (!lesson || (lesson.teacherId !== req.user.id && req.user.role !== 'director')) {
=======
  if (!lesson || lesson.teacherId !== req.user.id) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    res.status(404).json({ message: 'Урок не найден.' });
    return null;
  }
  return lesson;
}

<<<<<<< HEAD
// Приводит входящий массив вопросов к безопасному виду: генерирует id, чистит
// строки, оставляет только валидные варианты и правильные ответы.
function normalizeQuestions(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const q of list) {
    if (!q || !q.text || !String(q.text).trim()) continue;
    const type = q.type === 'multiple' ? 'multiple' : 'single';
    const options = (Array.isArray(q.options) ? q.options : [])
      .filter((o) => o && String(o.text || '').trim())
      .map((o) => ({ id: o.id || `o_${Math.random().toString(36).slice(2, 8)}`, text: String(o.text).trim() }));
    if (options.length < 2) continue;
    let correct = [];
    if (type === 'single') {
      const single = Array.isArray(q.correct) ? q.correct : [q.correct];
      const id = single.map((c) => (c && c.id !== undefined ? c.id : c)).find((c) => options.some((o) => o.id === c));
      if (id) correct = [id];
      else continue;
    } else {
      const many = Array.isArray(q.correct) ? q.correct : [q.correct];
      correct = many
        .map((c) => (c && c.id !== undefined ? c.id : c))
        .filter((c) => options.some((o) => o.id === c));
      if (!correct.length) continue;
    }
    out.push({
      id: q.id || `q_${Math.random().toString(36).slice(2, 8)}`,
      type,
      text: String(q.text).trim(),
      options,
      correct,
    });
  }
  return out;
}

function validateTestPayload(body) {
  const errors = [];
  if (!body.title || !String(body.title).trim()) errors.push('Укажите название теста.');
  const questions = normalizeQuestions(body.questions);
  if (!questions.length) errors.push('Добавьте хотя бы один вопрос.');
  return { errors, questions };
}

// attempts: 0 означает «без ограничений», иначе не меньше 1.
function normalizeAttempts(raw) {
  const n = Number(raw);
  return n === 0 ? 0 : Math.max(1, n || 1);
}

function testSummary(test, course) {
  const students = course
    ? usersDb.listStudents().filter((s) => course.studentIds.includes(s.id)).map(usersDb.publicUser)
    : [];
  return computeTestStats(test, students);
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD

    const test = testsDb.getByLesson(lesson.id);
    if (test) {
      testAttemptsDb.removeByTest(test.id);
      testsDb.remove(test.id);
    }

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
    lessonsDb.remove(lesson.id);
  });

  coursesDb.remove(course.id);
  res.json({ ok: true });
});

// ---------- Уроки ----------

<<<<<<< HEAD
// Все уроки педагога (для копирования в другие курсы), с названием курса-источника.
router.get('/api/teacher/lessons', (req, res) => {
  const lessons = lessonsDb.listByTeacher(req.user.id).map((l) => {
    const course = coursesDb.getById(l.courseId);
    return {
      ...l,
      courseTitle: course ? course.title : '—',
      hasTest: !!testsDb.getByLesson(l.id),
    };
  });
  res.json({ lessons });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
  // Уведомляем привязанных в Telegram учеников курса о новом уроке с ДЗ.
  // Отправка идёт в фоне и не должна ломать сам ответ на запрос.
  const courseTitle = course.title || 'Курс';
  const text = '📚 Новый урок по курсу «' + courseTitle + '»:\n«' + lesson.title + '»\n\n' +
    'К уроку прикреплено домашнее задание. Откройте его в личном кабинете и выполните.';
  (course.studentIds || []).forEach((sid) => {
    const student = usersDb.getById(sid);
    if (student && student.tgId) {
      telegram.sendMessage(student.tgId, text).then((r) => {
        if (!r.ok) console.log(`[telegram] не отправлено ${student.email} (${student.tgId}): ${r.error}`);
      });
    }
  });

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  res.status(201).json({ lesson });
});

router.get('/api/teacher/lessons/:id', (req, res) => {
  const lesson = ownLesson(req, res);
  if (!lesson) return;
  const course = coursesDb.getById(lesson.courseId);
  const { homework, rows } = submissionRowsFor(lesson);
<<<<<<< HEAD
  const test = testsDb.getByLesson(lesson.id);
  const testStats = test ? testSummary(test, course) : null;
  res.json({ lesson, course, homework, submissionRows: rows, test: test || null, testStats });
=======
  res.json({ lesson, course, homework, submissionRows: rows });
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
// Копирование урока в другой курс (вместе с файлами и тестом).
// Источником может быть любой урок педагога; цель — курс, где он преподаватель.
router.post('/api/teacher/courses/:id/lessons/copy', (req, res) => {
  const course = ownCourse(req, res);
  if (!course) return;

  const sourceLesson = lessonsDb.getById(req.body.lessonId);
  if (!sourceLesson || (sourceLesson.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Исходный урок не найден.' });
  }

  const lesson = lessonsDb.create({
    courseId: course.id,
    teacherId: req.user.id,
    ...cloneLessonData(sourceLesson),
  });

  homeworksDb.ensureForLesson(lesson);

  const sourceTest = testsDb.getByLesson(sourceLesson.id);
  if (sourceTest) {
    testsDb.create({
      lessonId: lesson.id,
      teacherId: req.user.id,
      ...cloneTestData(sourceTest),
    });
  }

  res.status(201).json({ lesson });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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

<<<<<<< HEAD
  const test = testsDb.getByLesson(lesson.id);
  if (test) {
    testAttemptsDb.removeByTest(test.id);
    testsDb.remove(test.id);
  }

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  lessonsDb.remove(lesson.id);
  res.json({ ok: true });
});

<<<<<<< HEAD
// ---------- Тесты ----------

function ownLessonTest(req, res) {
  const lesson = ownLesson(req, res);
  if (!lesson) return null;
  const test = testsDb.getByLesson(lesson.id);
  if (!test) {
    res.status(404).json({ message: 'Тест не найден.' });
    return null;
  }
  return test;
}

router.post('/api/teacher/lessons/:id/test', (req, res) => {
  const lesson = ownLesson(req, res);
  if (!lesson) return;

  const { errors, questions } = validateTestPayload(req.body);
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму теста.', errors });

  const existing = testsDb.getByLesson(lesson.id);
  if (existing) {
    return res.status(409).json({ message: 'У этого урока уже есть тест. Отредактируйте его.' });
  }

  const test = testsDb.create({
    lessonId: lesson.id,
    teacherId: req.user.id,
    title: String(req.body.title).trim(),
    description: (req.body.description || '').trim(),
    showResults: !!req.body.showResults,
    attempts: normalizeAttempts(req.body.attempts),
    questions,
  });

  const course = coursesDb.getById(lesson.courseId);
  res.status(201).json({ test, testStats: testSummary(test, course) });
});

// Импорт вопросов из публичной Google-формы (ссылка или iframe-код).
// Возвращает черновик вопросов — учитель отмечает правильные ответы вручную.
router.post('/api/teacher/tests/import-google', async (req, res) => {
  try {
    const form = await gforms.fetchForm(req.body.input);
    res.json(form);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/api/teacher/tests/:id', (req, res) => {
  const test = testsDb.getById(req.params.id);
  if (!test || (test.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Тест не найден.' });
  }

  const { errors, questions } = validateTestPayload(req.body);
  if (errors.length) return res.status(400).json({ message: 'Проверьте форму теста.', errors });

  const updated = testsDb.update(test.id, {
    title: String(req.body.title).trim(),
    description: (req.body.description || '').trim(),
    showResults: !!req.body.showResults,
    attempts: normalizeAttempts(req.body.attempts),
    questions,
  });

  const lesson = lessonsDb.getById(updated.lessonId);
  const course = lesson ? coursesDb.getById(lesson.courseId) : null;
  res.json({ test: updated, testStats: testSummary(updated, course) });
});

router.post('/api/teacher/tests/:id/delete', (req, res) => {
  const test = testsDb.getById(req.params.id);
  if (!test || (test.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Тест не найден.' });
  }

  testAttemptsDb.removeByTest(test.id);
  testsDb.remove(test.id);
  res.json({ ok: true });
});

// Все тесты педагога (для копирования в другие уроки/курсы), с названием
// курса и урока-источника.
router.get('/api/teacher/tests', (req, res) => {
  const tests = testsDb.listByTeacher(req.user.id).map((t) => {
    const lesson = lessonsDb.getById(t.lessonId);
    const course = lesson ? coursesDb.getById(lesson.courseId) : null;
    return {
      ...t,
      lessonTitle: lesson ? lesson.title : '—',
      courseId: lesson ? lesson.courseId : null,
      courseTitle: course ? course.title : '—',
    };
  });
  res.json({ tests });
});

// Копирует тест на целевой урок (lessonId в URL). Источником может быть
// любой тест педагога; цель — урок, где он преподаватель. Копия получает
// новый id, попытки учеников не переносятся.
router.post('/api/teacher/lessons/:id/test/copy', (req, res) => {
  const targetLesson = ownLesson(req, res);
  if (!targetLesson) return;

  const sourceTest = testsDb.getById(req.body.testId);
  if (!sourceTest || (sourceTest.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Исходный тест не найден.' });
  }

  if (targetLesson.id === sourceTest.lessonId) {
    return res.status(400).json({ message: 'Урок-источник и целевой урок совпадают.' });
  }

  if (testsDb.getByLesson(targetLesson.id)) {
    return res.status(409).json({ message: 'У этого урока уже есть тест.' });
  }

  const test = testsDb.create({
    lessonId: targetLesson.id,
    teacherId: req.user.id,
    ...cloneTestData(sourceTest),
  });

  const course = coursesDb.getById(targetLesson.courseId);
  res.status(201).json({ test, testStats: testSummary(test, course) });
});

router.get('/api/teacher/tests/:id', (req, res) => {
  const test = testsDb.getById(req.params.id);
  if (!test || (test.teacherId !== req.user.id && req.user.role !== 'director')) {
    return res.status(404).json({ message: 'Тест не найден.' });
  }
  const lesson = lessonsDb.getById(test.lessonId);
  const course = lesson ? coursesDb.getById(lesson.courseId) : null;
  res.json({ test, lesson, course, testStats: testSummary(test, course) });
});

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
// ---------- Работы учеников ----------

router.get('/api/teacher/submissions/:id', (req, res) => {
  const submission = submissionsDb.getById(req.params.id);
  const homework = submission && homeworksDb.getById(submission.homeworkId);
<<<<<<< HEAD
  if (!submission || !homework || (homework.teacherId !== req.user.id && req.user.role !== 'director')) {
=======
  if (!submission || !homework || homework.teacherId !== req.user.id) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
<<<<<<< HEAD
  if (!submission || !homework || (homework.teacherId !== req.user.id && req.user.role !== 'director')) {
=======
  if (!submission || !homework || homework.teacherId !== req.user.id) {
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
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
