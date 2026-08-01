// server.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');

const { loadUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const filesRoutes = require('./routes/files');
const alfacrmRoutes = require('./routes/alfacrm');
const shopRoutes = require('./routes/shop');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Инъекция темы во все HTML: перехватываем HTML-запросы до статики
app.get(['/', '/*.html'], (req, res, next) => {
  const filePath = req.path === '/'
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'public', req.path);
  if (!fs.existsSync(filePath)) return next();
  let body = fs.readFileSync(filePath, 'utf-8');
  body = body.replace(
    '</head>',
    '<script>try{var t=localStorage.getItem("coddy-theme");if(t==="dark")t="gray";if(!t)t="light";document.documentElement.setAttribute("data-theme",t)}catch(e){}</script></head>'
  );
  res.type('html').send(body);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'учебная-платформа-секрет-измените-в-продакшене',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 дней
    },
  })
);

app.use(loadUser);

app.use('/', authRoutes);
app.use('/', teacherRoutes);
app.use('/', studentRoutes);
app.use('/', filesRoutes);
app.use('/', alfacrmRoutes);
app.use('/', shopRoutes);

// Статика: HTML/CSS/JS отдаются как обычные файлы, без шаблонизатора.
// Реальная защита данных обеспечивается на уровне API (см. middleware/auth.js) —
// сами HTML-страницы не содержат чужих данных, поэтому их можно раздавать статикой.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Такого API-маршрута не существует.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api') || req.path.startsWith('/files')) {
    return res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
  }
  res.status(500).send('Внутренняя ошибка сервера.');
});

app.listen(PORT, () => {
  console.log(`Образовательная платформа запущена: http://localhost:${PORT}`);
});
