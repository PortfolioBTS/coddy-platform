// db/instructions.js
//
// Видео-инструкции по работе с платформой (раздел «Инструкции», доступен
// всем ролям на чтение). Прикреплять новые и удалять их может только
// директор — см. routes/instructions.js.

const { Collection } = require('./store');

const instructions = new Collection('instructions');

function create(data) {
  return instructions.insert({
    title: data.title,
    // video: { type: 'file', value: filename, originalName } | { type: 'url', value: url }
    video: data.video,
    createdBy: data.createdBy,
  });
}

function getById(id) {
  return instructions.getById(id);
}

// Новые сверху — последнее прикреплённое видео первым в списке.
function listAll() {
  return instructions.all().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findByFile(filename) {
  return instructions.findOne((i) => i.video && i.video.type === 'file' && i.video.value === filename);
}

function remove(id) {
  return instructions.deleteById(id);
}

module.exports = {
  create,
  getById,
  listAll,
  findByFile,
  remove,
};
