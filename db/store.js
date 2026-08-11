// db/store.js
//
// Минимальный слой хранения данных на JSON-файлах.
// Каждая "коллекция" (users, lessons, homeworks, submissions) — это отдельный
// JSON-файл со списком объектов. Все обращения к диску идут ТОЛЬКО через
// этот модуль, поэтому в будущем достаточно переписать реализацию класса
// Collection (например, на MongoDB/PostgreSQL), не трогая остальной код.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateId() {
  return crypto.randomBytes(9).toString('base64url');
}

class Collection {
  constructor(name) {
    this.name = name;
    this.file = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, '[]', 'utf-8');
    }
  }

  _read() {
    try {
      const raw = fs.readFileSync(this.file, 'utf-8');
      return raw.trim() ? JSON.parse(raw) : [];
    } catch (err) {
      console.error(`Ошибка чтения ${this.file}:`, err);
      return [];
    }
  }

  // Запись через временный файл, чтобы не повредить данные при сбое на середине записи.
  _write(items) {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf-8');
    fs.renameSync(tmp, this.file);
  }

  all() {
    return this._read();
  }

  find(predicate) {
    return this._read().filter(predicate);
  }

  findOne(predicate) {
    return this._read().find(predicate) || null;
  }

  getById(id) {
    return this.findOne((item) => item.id === id);
  }

  insert(data) {
    const items = this._read();
    const record = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    items.push(record);
    this._write(items);
    return record;
  }

  updateById(id, patch) {
    const items = this._read();
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    items[idx] = {
      ...items[idx],
      ...patch,
      id: items[idx].id,
      updatedAt: new Date().toISOString(),
    };
    this._write(items);
    return items[idx];
  }

  deleteById(id) {
    const items = this._read();
    const next = items.filter((item) => item.id !== id);
    const removed = next.length !== items.length;
    if (removed) this._write(next);
    return removed;
  }
}

module.exports = { Collection, generateId };
