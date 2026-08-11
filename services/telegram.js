// services/telegram.js
// Отправка сообщений через Telegram Bot API + long polling для ответов на /start.
// Токен берётся из переменной окружения TELEGRAM_BOT_TOKEN (файл .env).

const fs = require('fs');
const path = require('path');

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function apiUrl(method) {
  return `https://api.telegram.org/bot${token()}/${method}`;
}

async function call(method, payload) {
  if (!token()) return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан.' };
  try {
    const res = await fetch(apiUrl(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      return { ok: false, error: data && data.description ? data.description : `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Отправляет сообщение в личный чат ученика по его числовому chat_id.
async function sendMessage(chatId, text) {
  return call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

// Проверка токена: возвращает информацию о боте (имя, юзернейм).
async function getMe() {
  if (!token()) return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан.' };
  try {
    const res = await fetch(apiUrl('getMe'));
    const data = await res.json().catch(() => null);
    return data && data.ok
      ? { ok: true, data: data.result }
      : { ok: false, error: data && data.description ? data.description : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ---------- Long polling: отвечаем на /start и выдаём пользователю его ID ----------

const OFFSET_FILE = path.join(__dirname, '..', 'data', 'telegram-offset.json');

function loadOffset() {
  try {
    return JSON.parse(fs.readFileSync(OFFSET_FILE, 'utf8')).offset || 0;
  } catch (_) {
    return 0;
  }
}

function saveOffset(offset) {
  try {
    fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }));
  } catch (_) {}
}

// Обрабатываем одно сообщение от пользователя.
async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.chat || !msg.from) return;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  const first = msg.from.first_name || '';
  const last = msg.from.last_name || '';
  const name = `${first}${last ? ' ' + last : ''}`.trim() || 'друг';
  const username = msg.from.username ? '@' + msg.from.username : '';

  if (text.startsWith('/start')) {
    const reply =
      '👋 Привет, ' + name + '!\n\n' +
      'Твой ID для привязки к учебной платформе:\n' +
      '<b>' + chatId + '</b>\n\n' +
      (username ? 'Твой юзернейм: ' + username + '\n\n' : '') +
      'Вставь этот номер на сайте в профиле в поле «ID в Telegram», чтобы получать уведомления о новых уроках и домашних заданиях.';
    await sendMessage(chatId, reply);
  } else {
    await sendMessage(chatId, 'Напиши /start, чтобы получить свой ID.');
  }
}

let polling = false;

async function pollOnce() {
  try {
    const offset = loadOffset() + 1;
    const res = await fetch(apiUrl('getUpdates') + `?offset=${offset}&timeout=50`);
    const data = await res.json().catch(() => null);
    if (data && data.ok && Array.isArray(data.result) && data.result.length) {
      let maxId = loadOffset();
      for (const u of data.result) {
        if (u.update_id > maxId) maxId = u.update_id;
        handleUpdate(u).catch(() => {});
      }
      saveOffset(maxId);
    }
  } catch (_) {
    // сеть недоступна — просто ждём следующего цикла
  } finally {
    if (polling) setTimeout(pollOnce, 200);
  }
}

// Запускаем фоновый опрос сообщений. Вызывается один раз при старте сервера.
function startPolling() {
  if (!token() || polling) return;
  polling = true;
  pollOnce();
}

module.exports = { sendMessage, getMe, startPolling, hasToken: () => !!token() };