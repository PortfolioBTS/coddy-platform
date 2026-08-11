// utils/gforms.js
//
// Парсит публичную Google-форму: принимает ссылку (или iframe-код) и вытаскивает
// вопросы с вариантами из данных FB_PUBLIC_LOAD_DATA_, которые Google отдаёт
// внутри страницы формы. Правильные ответы в публичной странице недоступны.

function extractSrc(input) {
  const trimmed = String(input || '').trim();
  const iframeMatch = trimmed.match(/<iframe[^>]*src=["']([^"']+)["']/i);
  return iframeMatch ? iframeMatch[1] : trimmed;
}

function extractPayload(html) {
  const marker = 'FB_PUBLIC_LOAD_DATA_';
  const i = html.indexOf(marker);
  if (i === -1) return null;
  const start = html.indexOf('[', i);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  return null;
}

// Возвращает { title, description, questions: [{ type, text, options: [text] }] }
// либо выбрасывает Error с понятным сообщением.
function parse(html) {
  const raw = extractPayload(html);
  if (!raw) {
    throw new Error('Не удалось найти данные формы. Проверьте, что форма открыта для просмотра по ссылке.');
  }
  let data;
  try { data = JSON.parse(raw); } catch {
    throw new Error('Не удалось прочитать данные формы.');
  }

  const items = data && data[1] && Array.isArray(data[1][1]) ? data[1][1] : null;
  if (!items) {
    throw new Error('Форма пуста или недоступна.');
  }

  const description = typeof data[1][0] === 'string' ? data[1][0] : '';
  const questions = [];

  items.forEach((item) => {
    if (!Array.isArray(item)) return;
    const text = typeof item[1] === 'string' ? item[1].trim() : '';
    if (!text) return;

    const typeCode = item[3];
    // 2 = один из многих, 3 = выпадающий список, 4 = несколько из многих.
    // 0 = текстовый ответ, 1 = короткий ответ — не переносим (нет вариантов для оценки).
    const optionsArr = item[4] && Array.isArray(item[4]) && item[4][0] && Array.isArray(item[4][0][1])
      ? item[4][0][1]
      : [];

    const options = optionsArr
      .map((o) => (Array.isArray(o) ? o[0] : null))
      .filter((o) => typeof o === 'string' && o.trim());

    if (typeCode === 2 || typeCode === 3) {
      if (options.length >= 2) {
        questions.push({ type: 'single', text, options });
      }
    } else if (typeCode === 4) {
      if (options.length >= 2) {
        questions.push({ type: 'multiple', text, options });
      }
    }
    // Прочие типы пропускаем.
  });

  if (!questions.length) {
    throw new Error('В форме нет поддерживаемых вопросов (нужны варианты ответов).');
  }

  return {
    title: '',
    description,
    questions,
  };
}

// Скачивает форму и парсит вопросы. input — ссылка или код iframe.
async function fetchForm(input) {
  const url = extractSrc(input);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Вставьте ссылку на Google-форму или её iframe-код.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Сервис Google Forms не ответил вовремя.');
    throw new Error('Не удалось загрузить форму. Проверьте ссылку.');
  }
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 404) throw new Error('Форма не найдена по этой ссылке.');
    if (res.status === 401 || res.status === 403) throw new Error('Форма требует входа в Google. Откройте доступ «для всех по ссылке».');
    throw new Error(`Не удалось загрузить форму (HTTP ${res.status}).`);
  }

  const html = await res.text();
  return parse(html);
}

module.exports = { fetchForm, parse };
