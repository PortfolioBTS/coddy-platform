// db/certificates.js
const { Collection } = require('./store');

const certificates = new Collection('certificates');

function create(data) {
  return certificates.insert(data);
}

function getById(id) {
  return certificates.getById(id);
}

function listByStudent(studentId) {
  return certificates
    .find((c) => c.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listAll() {
  return certificates.all().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findByFile(filename) {
  return certificates.findOne((c) => c.file === filename);
}

function remove(id) {
  return certificates.deleteById(id);
}

module.exports = {
  create,
  getById,
  listByStudent,
  listAll,
  findByFile,
  remove,
};
