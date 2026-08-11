// utils/testStats.js
//
// Общий расчёт статистики прохождения теста учениками. Раньше жил только в
// routes/teacher.js — вынесен сюда, чтобы тем же способом считать статистику
// и для родителя (но только по его ребёнку), не дублируя логику.

const testAttemptsDb = require('../db/testAttempts');

// students — массив «публичных» пользователей (без passwordHash), для
// которых нужно посчитать строки статистики. Учитель передаёт всех учеников
// курса, родитель — только своего ребёнка.
function computeTestStats(test, students) {
  const attempts = testAttemptsDb.listByTest(test.id);
  const maxScore = test.questions.length;

  const rows = students.map((student) => {
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);
    const best = studentAttempts.length ? Math.max(...studentAttempts.map((a) => a.score)) : null;
    const latest = studentAttempts.length ? studentAttempts[studentAttempts.length - 1] : null;
    return {
      student,
      attempts: studentAttempts.length,
      best,
      latest,
      maxScore,
    };
  });

  const completed = rows.filter((r) => r.attempts > 0);
  const avg = completed.length
    ? Math.round((completed.reduce((s, r) => s + (r.best || 0), 0) / (completed.length * maxScore)) * 100)
    : null;

  return { test, maxScore, rows, completedCount: completed.length, totalCount: students.length, averagePercent: avg };
}

module.exports = { computeTestStats };
