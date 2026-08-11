// db/testAttempts.js
const { Collection } = require('./store');

const attempts = new Collection('testAttempts');

function create(data) {
  return attempts.insert({
    testId: data.testId,
    lessonId: data.lessonId,
    studentId: data.studentId,
    answers: data.answers || [], // [{ questionId, optionIds: [] }]
    score: data.score || 0,
    maxScore: data.maxScore || 0,
    attemptNumber: data.attemptNumber || 1,
    showResults: data.showResults || false,
  });
}

function removeByTest(testId) {
  const items = attempts.find((a) => a.testId === testId);
  items.forEach((a) => attempts.deleteById(a.id));
}

function listByTest(testId) {
  return attempts.find((a) => a.testId === testId);
}

function listByTestAndStudent(testId, studentId) {
  return attempts
    .find((a) => a.testId === testId && a.studentId === studentId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function bestScore(testId, studentId) {
  const items = listByTestAndStudent(testId, studentId);
  if (!items.length) return null;
  return Math.max(...items.map((a) => a.score));
}

module.exports = { create, listByTest, listByTestAndStudent, bestScore, removeByTest };
