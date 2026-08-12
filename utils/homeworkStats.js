// utils/homeworkStats.js
//
// Автоматический расчёт «% выполненных дз» для отзыва (feedback) учителя за
// конкретный месяц — используется, чтобы поле в форме обратной связи
// подтягивалось само по факту сданных работ, но при этом учитель по-прежнему
// мог его поправить руками (см. routes/feedback.js и public/js/pages/teacher-feedback.js).

const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');

// К какому месяцу ('YYYY-MM') относится домашнее задание: по дедлайну, если
// он указан, иначе — по дате создания урока (когда дедлайна нет, урок и
// задание по нему естественно считать «месяцем создания»).
function monthOfHomework(homework, lesson) {
  const source = homework.deadline || (lesson && lesson.deadline) || (lesson && lesson.createdAt);
  if (!source) return null;
  const d = new Date(source);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7);
}

// Считает авто-% выполненных дз ученика по курсу за месяц: доля домашних
// заданий этого месяца, на которые у ученика есть сданная работа (неважно,
// проверена она уже учителем или нет — важен сам факт сдачи).
// Возвращает { percent, completedCount, totalCount }: percent === null,
// если в этом месяце по курсу вообще не было домашних заданий — тогда
// автоматически посчитать нечего, и поле остаётся полностью на усмотрение учителя.
function computeAutoHomeworkPercent(courseId, studentId, month) {
  const lessons = lessonsDb.listByCourse(courseId);

  const homeworksInMonth = lessons
    .map((lesson) => ({ lesson, homework: homeworksDb.getByLesson(lesson.id) }))
    .filter((x) => x.homework && monthOfHomework(x.homework, x.lesson) === month);

  const totalCount = homeworksInMonth.length;
  if (!totalCount) {
    return { percent: null, completedCount: 0, totalCount: 0 };
  }

  const completedCount = homeworksInMonth.filter(
    (x) => !!submissionsDb.getByHomeworkAndStudent(x.homework.id, studentId)
  ).length;

  return {
    percent: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
  };
}

module.exports = { computeAutoHomeworkPercent };
