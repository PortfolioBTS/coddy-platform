// utils.js — общие серверные валидаторы (используются в routes/auth.js)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d+\-() ]{5,20}$/;

module.exports = { EMAIL_RE, PHONE_RE };
