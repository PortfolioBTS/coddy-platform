// middleware/upload.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ

// Полный список разрешённых форматов (раздел 9 ТЗ).
const ALL_ALLOWED_EXT = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt',
  '.jpg', '.jpeg', '.png',
  '.html', '.css', '.js',
  '.mp4',
  '.py', '.jsx', '.ts', '.tsx', '.json',
  '.yaml', '.yml', '.xml',
  '.sh', '.sql', '.md', '.csv', '.svg',
];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png'];
const VIDEO_EXT = ['.mp4'];
const ARCHIVE_EXT = ['.zip', '.rar'];
// Ответы учеников на домашние задания — обычные форматы + архивы (zip/rar).
const HOMEWORK_ANSWER_EXT = ALL_ALLOWED_EXT.concat(ARCHIVE_EXT);
// Практический "безлимит" на число вложений к уроку — форма всё равно не
// рассчитана на сотни файлов, но конкретного потолка в несколько штук больше нет.
const LESSON_ATTACHMENTS_MAX = 100;
// Максимум файлов в одном ответе ученика на домашнее задание.
const HOMEWORK_ANSWER_MAX_FILES = 5;

// Busboy (на нём построен multer) по умолчанию декодирует имена файлов из
// multipart-запроса как latin1, хотя современные браузеры отправляют их в
// UTF-8. Из-за этого кириллица в originalname превращается в "кракозябры".
// Чиним это, перекодируя строку обратно в байты (latin1) и заново декодируя
// их как utf8 — для ASCII-имён это no-op, для кириллицы и т.п. — исправление.
function fixOriginalNameEncoding(name) {
  if (!name) return name;
  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8');
    // Buffer.from(...).toString() никогда не бросает исключение сам по себе,
    // но на всякий случай подстрахуемся и не потеряем исходное имя.
    return fixed || name;
  } catch (e) {
    return name;
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

// fieldRules: { fieldname: [ '.ext', ... ] }. Поле без записи в fieldRules
// проверяется по общему списку разрешённых форматов.
function makeFileFilter(fieldRules, fallbackExt) {
  return (req, file, cb) => {
    // Пустой input[type=file] (ничего не выбрано) браузер иногда всё равно
    // включает в FormData как часть без имени файла — просто пропускаем её,
    // не считая это ошибкой формата.
    if (!file.originalname) {
      return cb(null, false);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = fieldRules[file.fieldname] || fallbackExt;
    if (!allowed.includes(ext)) {
      const err = new Error(
        `Формат «${ext || 'без расширения'}» не поддерживается для этого поля. Разрешены: ${allowed.join(', ')}`
      );
      err.code = 'BAD_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  };
}

function build(fieldRules, fallbackExt, fieldConfig) {
  const uploader = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: makeFileFilter(fieldRules, fallbackExt),
  });
  const handler = Array.isArray(fieldConfig) ? uploader.fields(fieldConfig) : fieldConfig;

  // Оборачиваем multer, чтобы ошибки (размер/тип) не роняли сервер, а
  // аккуратно возвращались в req.uploadError для отображения на форме.
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          req.uploadError = 'Файл слишком большой. Максимальный размер — 50 МБ.';
        } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          req.uploadError = 'Слишком много файлов в одном поле формы.';
        } else if (err.code === 'BAD_FILE_TYPE') {
          req.uploadError = err.message;
        } else {
          req.uploadError = 'Не удалось загрузить файл. Попробуйте ещё раз.';
        }
      } else if (req.files) {
        // Исправляем кодировку имён файлов (см. fixOriginalNameEncoding выше)
        // сразу после успешной загрузки, чтобы дальше по коду везде уже была
        // корректная строка.
        Object.values(req.files).forEach((fileArray) => {
          fileArray.forEach((f) => {
            f.originalname = fixOriginalNameEncoding(f.originalname);
          });
        });
      }
      next();
    });
  };
}

// Форма курса: только обложка
const courseUpload = build({ cover: IMAGE_EXT }, ALL_ALLOWED_EXT, [{ name: 'cover', maxCount: 1 }]);

// Форма урока: обложка (только картинка) + вложения (любой разрешённый формат,
// сколько потребуется — см. LESSON_ATTACHMENTS_MAX) + видео (только mp4)
const lessonUpload = build(
  { cover: IMAGE_EXT, videoFile: VIDEO_EXT, attachments: ALL_ALLOWED_EXT },
  ALL_ALLOWED_EXT,
  [
    { name: 'cover', maxCount: 1 },
    { name: 'attachments', maxCount: LESSON_ATTACHMENTS_MAX },
    { name: 'videoFile', maxCount: 1 },
  ]
);

// Сдача домашнего задания учеником — до HOMEWORK_ANSWER_MAX_FILES файлов,
// разрешённые форматы + архивы zip/rar
const homeworkUpload = build({ files: HOMEWORK_ANSWER_EXT }, HOMEWORK_ANSWER_EXT, [
  { name: 'files', maxCount: HOMEWORK_ANSWER_MAX_FILES },
]);

// Блок «Проект ребёнка» в отзыве обратной связи — учитель прикладывает
// скриншоты/файлы работы ученика. Разрешаем обычные форматы + архивы.
const FEEDBACK_PROJECT_EXT = ALL_ALLOWED_EXT.concat(ARCHIVE_EXT);
const FEEDBACK_PROJECT_MAX_FILES = 6;
const feedbackUpload = build({ projectFiles: FEEDBACK_PROJECT_EXT }, FEEDBACK_PROJECT_EXT, [
  { name: 'projectFiles', maxCount: FEEDBACK_PROJECT_MAX_FILES },
]);

module.exports = {
  courseUpload,
  lessonUpload,
  homeworkUpload,
  feedbackUpload,
  MAX_FILE_SIZE,
  ALL_ALLOWED_EXT,
  HOMEWORK_ANSWER_EXT,
  HOMEWORK_ANSWER_MAX_FILES,
  FEEDBACK_PROJECT_EXT,
  FEEDBACK_PROJECT_MAX_FILES,
  IMAGE_EXT,
  VIDEO_EXT,
  ARCHIVE_EXT,
  UPLOAD_DIR,
};
