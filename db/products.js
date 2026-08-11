// db/products.js
//
// Хранилище товаров магазина на JSON-файле (data/products.json).
// Числовые id сохранены ради совместимости с витриной (shop.js использует Number()).

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'products.json');

function read() {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Ошибка чтения ${FILE}:`, err);
    return [];
  }
}

function write(items) {
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf-8');
  fs.renameSync(tmp, FILE);
}

function list() {
  return read();
}

function getById(id) {
  return read().find((p) => p.id === Number(id)) || null;
}

function nextProductId(items) {
  return items.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
}

function nextCategoryId(items) {
  return items.reduce((m, p) => Math.max(m, p.categoryId || 0), 0) + 1;
}

function insert(data) {
  const items = read();
  const record = {
    id: nextProductId(items),
    createdAt: new Date().toISOString(),
    ...data,
  };
  items.push(record);
  write(items);
  return record;
}

function update(id, patch) {
  const items = read();
  const idx = items.findIndex((p) => p.id === Number(id));
  if (idx === -1) return null;
  items[idx] = {
    ...items[idx],
    ...patch,
    id: items[idx].id,
    updatedAt: new Date().toISOString(),
  };
  write(items);
  return items[idx];
}

function remove(id) {
  const items = read();
  const next = items.filter((p) => p.id !== Number(id));
  if (next.length !== items.length) {
    write(next);
    return true;
  }
  return false;
}

module.exports = { list, getById, insert, update, remove, nextProductId, nextCategoryId };