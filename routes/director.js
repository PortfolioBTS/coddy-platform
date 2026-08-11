// routes/director.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');

const usersDb = require('../db/users');
const coursesDb = require('../db/courses');
const lessonsDb = require('../db/lessons');
const homeworksDb = require('../db/homeworks');
const submissionsDb = require('../db/submissions');
const testsDb = require('../db/tests');
const testAttemptsDb = require('../db/testAttempts');
const certificatesDb = require('../db/certificates');
const { requireAuth, requireRole } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');
const { EMAIL_RE, PHONE_RE } = require('../utils');
const productsDb = require('../db/products');
const telegram = require('../services/telegram');

const router = express.Router();

router.use('/api/director', requireAuth, requireRole('director'));

function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
}

// Полное удаление данных учителя: его курсы, уроки, файлы, домашки, тесты.
function removeTeacherData(teacher) {
  coursesDb.listByTeacher(teacher.id).forEach((course) => {
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

      const test = testsDb.getByLesson(lesson.id);
      if (test) {
        testAttemptsDb.removeByTest(test.id);
        testsDb.remove(test.id);
      }

      lessonsDb.remove(lesson.id);
    });
    coursesDb.remove(course.id);
  });
}

// ---------- Педагоги ----------

router.get('/api/director/teachers', (req, res) => {
  const teachers = usersDb.listTeachers().map(usersDb.publicUser);
  res.json({ teachers });
});

// Код педагога для регистрации: директор вводит его один раз, и любой,
// кто знает код, может зарегистрироваться как педагог.
router.put('/api/director/teacher-code', (req, res) => {
  const code = String(req.body.teacherCode || '').trim().slice(0, 40);
  const updated = usersDb.updateProfile(req.user.id, { teacherCode: code });
  res.json({ teacherCode: updated.teacherCode });
});

// Установить (или изменить) код педагога у учителя.
router.put('/api/director/teachers/:id/code', (req, res) => {
  const teacher = usersDb.getById(req.params.id);
  if (!teacher || teacher.role !== 'teacher') {
    return res.status(404).json({ message: 'Педагог не найден.' });
  }
  const code = String(req.body.teacherCode || '').trim();
  const updated = usersDb.updateProfile(teacher.id, { teacherCode: code });
  res.json({ teacher: usersDb.publicUser(updated) });
});

router.post('/api/director/teachers/:id/delete', (req, res) => {
  const teacher = usersDb.getById(req.params.id);
  if (!teacher || teacher.role !== 'teacher') {
    return res.status(404).json({ message: 'Педагог не найден.' });
  }
  removeTeacherData(teacher);
  usersDb.remove(teacher.id);
  res.json({ ok: true });
});

// ---------- Сертификаты ----------

router.get('/api/director/students', (req, res) => {
  const students = usersDb.listStudents().map(usersDb.publicUser);
  res.json({ students });
});

router.get('/api/director/certificates', (req, res) => {
  const list = certificatesDb.listAll().map((c) => {
    const student = usersDb.getById(c.studentId);
    return {
      ...c,
      student: student ? usersDb.publicUser(student) : null,
    };
  });
  res.json({ certificates: list });
});

// Сохраняет сертификат: PNG (dataURL) пишется в uploads, данные — в certificates.json.
router.post('/api/director/certificates', (req, res) => {
  const { studentId, certNumber, issueDate, courseName, startDate, duration, imageData } = req.body || {};
  const student = studentId ? usersDb.getById(studentId) : null;
  const errors = [];

  if (!student || student.role !== 'student') errors.push('Выберите ученика.');
  if (!certNumber || !String(certNumber).trim()) errors.push('Укажите номер сертификата.');
  if (!courseName || !String(courseName).trim()) errors.push('Укажите название курса.');
  if (!imageData || !String(imageData).startsWith('data:image/png;base64,')) {
    errors.push('Не удалось получить изображение сертификата.');
  }
  if (errors.length) {
    return res.status(400).json({ message: 'Проверьте форму сертификата.', errors });
  }

  const base64 = String(imageData).replace(/^data:image\/png;base64,/, '');
  const filename = `cert-${Date.now()}-${crypto.randomBytes(10).toString('hex')}.png`;
  try {
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'));
  } catch (err) {
    return res.status(500).json({ message: 'Не удалось сохранить изображение сертификата.' });
  }

  const certificate = certificatesDb.create({
    studentId: student.id,
    certNumber: String(certNumber).trim(),
    issueDate: issueDate || '',
    courseName: String(courseName).trim(),
    startDate: startDate || '',
    duration: duration || '',
    file: filename,
    createdBy: req.user.id,
  });

  // Уведомляем ученика в Telegram о получении сертификата.
  if (student.tgId) {
    const text = '🏆 Вам выдан сертификат по курсу «' + String(courseName).trim() + '»!\n\n' +
      'Зайдите в личный кабинет — скачайте его в разделе «Сертификаты».';
    telegram.sendMessage(student.tgId, text).then((r) => {
      if (!r.ok) console.log(`[telegram] не отправлено ${student.email} (${student.tgId}): ${r.error}`);
    });
  }

  res.status(201).json({ certificate });
});

// ---------- Товары магазина ----------

// Нормализуем входящие данные товара из формы.
function normalizeProduct(body) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const type = body.type === 'steam' ? 'steam' : 'physical';
  const price = Math.max(0, Math.round(Number(body.price) || 0));
  const categoryName = String(body.categoryName || '').trim();
  const image = String(body.image || '').trim();
  const requiresSize = body.requiresSize === true || body.requiresSize === 'true' || body.requiresSize === 'on';

  let availableSizes = [];
  if (body.availableSizes) {
    availableSizes = String(body.availableSizes)
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return { name, description, type, price, categoryName, image, requiresSize, availableSizes };
}

router.post('/api/director/products', (req, res) => {
  const data = normalizeProduct(req.body || {});
  const errors = [];
  if (!data.name) errors.push('Укажите название товара.');
  if (!data.categoryName) errors.push('Укажите название категории.');
  if (data.image && !/^https?:\/\/.+/i.test(data.image)) errors.push('Ссылка на изображение должна начинаться с http(s).');
  if (errors.length) {
    return res.status(400).json({ message: 'Проверьте данные товара.', errors });
  }

  // Если категория с таким названием уже есть — используем её id, иначе создаём новую.
  const all = productsDb.list();
  const existing = all.find((p) => p.categoryName.toLowerCase() === data.categoryName.toLowerCase());
  const categoryId = existing ? existing.categoryId : productsDb.nextCategoryId(all);
  data.categoryId = categoryId;

  const product = productsDb.insert(data);
  res.status(201).json({ product });
});

router.put('/api/director/products/:id', (req, res) => {
  const data = normalizeProduct(req.body || {});
  if (!data.name || !data.categoryName) {
    return res.status(400).json({ message: 'Укажите название товара и категории.' });
  }
  const current = productsDb.getById(req.params.id);
  const all = productsDb.list();
  const existing = all.find((p) =>
    p.categoryName.toLowerCase() === data.categoryName.toLowerCase() && p.id !== current.id
  );
  data.categoryId = existing ? existing.categoryId : current.categoryId;

  const updated = productsDb.update(req.params.id, data);
  if (!updated) {
    return res.status(404).json({ message: 'Товар не найден.' });
  }
  res.json({ product: updated });
});

router.delete('/api/director/products/:id', (req, res) => {
  const removed = productsDb.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Товар не найден.' });
  }
  res.json({ ok: true });
});

// ---------- Импорт учеников из таблицы ----------

// Принимаем файл в память: после парсинга он нигде не хранится.
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Варианты названий колонок (латиница и кириллица, с пробелами и без).
const IMPORT_HEADERS = {
  lastName: ['фамилия', 'lastname', 'last_name', 'surname', 'family'],
  firstName: ['имя', 'firstname', 'first_name', 'name'],
  city: ['город', 'city'],
  phone: ['телефон', 'phone', 'телефо', 'tel', 'mobile', 'тлф'],
  email: ['email', 'почта', 'e-mail', 'mail', 'логин', 'login', 'почт'],
  birthDate: ['дата рождения', 'дата рожд', 'birthdate', 'birth_date', 'birthday', 'др'],
};

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function translit(text) {
  return String(text).toLowerCase().split('').map((ch) => {
    if (/[a-z0-9]/.test(ch)) return ch;
    return TRANSLIT[ch] || '';
  }).join('');
}

// Читаемый логин на основе имени/фамилии: ivan.ivanov@coddy.school.
// При совпадении с уже существующим email добавляет суффикс 2, 3, ...
function generateLogin(firstName, lastName) {
  let base = `${translit(firstName)}.${translit(lastName)}`.replace(/\.+$/, '').replace(/^\.+/, '');
  if (!base) base = 'student';
  base = base.slice(0, 32);
  let candidate = `${base}@coddy.school`;
  let n = 2;
  while (usersDb.findByEmail(candidate)) {
    candidate = `${base}${n}@coddy.school`;
    n += 1;
  }
  return candidate;
}

// Пароль выдаёт директор ученику, поэтому он должен легко продиктоваться по телефону.
function generatePassword() {
  const digits = String(crypto.randomInt(1000, 10000));
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  let tail = '';
  for (let i = 0; i < 2; i += 1) {
    tail += letters[crypto.randomInt(letters.length)];
  }
  return `Codd-${digits}${tail}`;
}

function looksLikeUtf8(buf) {
  try {
    return !buf.toString('utf8').includes('\uFFFD');
  } catch (_) {
    return false;
  }
}

// Разбор CSV (разделители ; или , или таб, кавычки поддерживаются).
function parseCsvText(text) {
  const data = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Определяем основной разделитель по первой строке.
  const firstLine = data.split('\n')[0] || '';
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delim = semis >= commas && semis > 0 ? ';' : ',';

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < data.length; i += 1) {
    const ch = data[i];
    if (inQuotes) {
      if (ch === '"') {
        if (data[i + 1] === '"') { cell += '"'; i += 1; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim || ch === '\t') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

function decodeCsv(buffer) {
  // BOM UTF-8 → сразу utf8.
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.slice(3).toString('utf8');
  }
  if (looksLikeUtf8(buffer)) return buffer.toString('utf8');
  // Excel из русской локали часто сохраняет CSV в Windows-1251.
  return iconv.decode(buffer, 'win1251');
}

// Мапим строки таблицы (массив массивов) на поля ученика по заголовкам первой строки.
function mapColumns(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h).toLowerCase().trim());
  const colByField = {};
  for (const [field, keys] of Object.entries(IMPORT_HEADERS)) {
    for (const key of keys) {
      const idx = header.indexOf(key);
      if (idx !== -1) { colByField[field] = idx; break; }
    }
  }
  if (!('lastName' in colByField) || !('firstName' in colByField)) {
    throw new Error('В таблице нет колонок «Имя» и «Фамилия».');
  }
  return rows.slice(1).map((cells, i) => {
    const rec = { __row: i + 2 };
    for (const [field, idx] of Object.entries(colByField)) {
      rec[field] = cells[idx] != null ? String(cells[idx]).trim() : '';
    }
    return rec;
  });
}

function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return json.map((o, i) => {
    const rec = { __row: i + 2 };
    for (const [field, keys] of Object.entries(IMPORT_HEADERS)) {
      for (const key of keys) {
        if (key in o) { rec[field] = String(o[key]).trim(); break; }
      }
    }
    return rec;
  });
}

function normalizeBirthDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// Добавляет учеников из таблицы. Существующие пользователи НЕ перезаписываются
// и НЕ удаляются — импорт всегда только дополняет базу новыми аккаунтами.
// Логин (email) и пароль генерируются автоматически; данные возвращаются
// директору, чтобы он мог выдать их ученикам.
router.post('/api/director/import-students', importUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Выберите файл с таблицей.' });
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
    return res.status(400).json({
      message: `Формат «${ext || 'без расширения'}» не поддерживается. Загрузите CSV, XLSX или XLS.`,
    });
  }

  let records;
  try {
    records = ext === '.csv' ? mapColumns(parseCsvText(decodeCsv(req.file.buffer))) : parseXlsx(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Не удалось прочитать файл. Проверьте, что это корректная таблица.' });
  }
  records = records.filter((r) => Object.values(r).some((v) => v !== ''));
  if (!records.length) {
    return res.status(400).json({ message: 'В таблице нет строк с данными.' });
  }
  if (records.length > 500) {
    return res.status(400).json({ message: 'Слишком много строк в таблице. Максимум — 500 за один раз.' });
  }

  const created = [];
  const duplicates = [];
  const invalid = [];

  for (const r of records) {
    const errors = [];
    const firstName = String(r.firstName || '').trim();
    const lastName = String(r.lastName || '').trim();
    const city = String(r.city || '').trim();
    const phone = String(r.phone || '').trim();
    const email = String(r.email || '').trim().toLowerCase();
    const birthDate = normalizeBirthDate(r.birthDate);

    if (!firstName) errors.push('Не указано имя.');
    if (!lastName) errors.push('Не указана фамилия.');
    if (!city) errors.push('Не указан город.');
    if (!phone || !PHONE_RE.test(phone)) errors.push('Некорректный номер телефона.');
    if (email && !EMAIL_RE.test(email)) errors.push('Некорректная почта.');
    if (r.birthDate && !birthDate) errors.push('Некорректная дата рождения (ожидается ДД.ММ.ГГГГ).');

    if (errors.length) {
      invalid.push({ row: r.__row, errors });
      continue;
    }

    if (email && usersDb.findByEmail(email)) {
      duplicates.push({ row: r.__row, email });
      continue;
    }

    const login = email || generateLogin(firstName, lastName);
    const password = generatePassword();

    try {
      const user = await usersDb.createUser({
        role: 'student',
        firstName,
        lastName,
        city,
        phone,
        email: login,
        password,
        birthDate,
      });
      created.push({ user: usersDb.publicUser(user), login, password });
    } catch (_) {
      invalid.push({ row: r.__row, errors: ['Не удалось создать аккаунт.'] });
    }
  }

  res.status(201).json({
    total: records.length,
    created,
    duplicates,
    invalid,
  });
});

module.exports = router;
