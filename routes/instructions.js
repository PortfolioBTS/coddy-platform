// routes/instructions.js
//
// Раздел «Инструкции»: видео-инструкции по работе с платформой.
// Смотреть их может любой авторизованный пользователь (ученик, родитель,
// учитель, директор), а прикреплять новые и удалять — только директор.

const express = require('express');
const fs = require('fs');
const path = require('path');

const instructionsDb = require('../db/instructions');
const { requireAuth, requireRole } = require('../middleware/auth');
const { instructionUpload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
}

// ---------- Просмотр (любая роль) ----------

router.get('/api/instructions', requireAuth, (req, res) => {
  const instructions = instructionsDb.listAll();
  res.json({ instructions });
});

// ---------- Управление (только директор) ----------

router.use('/api/director/instructions', requireAuth, requireRole('director'));

router.post('/api/director/instructions', instructionUpload, (req, res) => {
  const title = String(req.body.title || '').trim();
  const videoUrl = String(req.body.videoUrl || '').trim();
  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  if (!title) errors.push('Укажите заголовок инструкции.');

  const files = req.files || {};
  const uploadedFile = files.videoFile && files.videoFile[0];
  if (!uploadedFile && !videoUrl) errors.push('Прикрепите видеофайл (MP4) или вставьте ссылку на видео.');

  if (errors.length) {
    if (uploadedFile) removeFile(uploadedFile.filename);
    return res.status(400).json({ message: 'Проверьте форму инструкции.', errors });
  }

  const video = uploadedFile
    ? { type: 'file', value: uploadedFile.filename, originalName: uploadedFile.originalname }
    : { type: 'url', value: videoUrl };

  const instruction = instructionsDb.create({
    title,
    video,
    createdBy: req.user.id,
  });

  res.status(201).json({ instruction });
});

router.post('/api/director/instructions/:id/delete', (req, res) => {
  const instruction = instructionsDb.getById(req.params.id);
  if (!instruction) return res.status(404).json({ message: 'Инструкция не найдена.' });

  if (instruction.video && instruction.video.type === 'file') removeFile(instruction.video.value);
  instructionsDb.remove(instruction.id);

  res.json({ ok: true });
});

module.exports = router;
