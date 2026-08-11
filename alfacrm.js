const https = require('https');
const querystring = require('querystring');

const CONFIG = {
  hostname: process.env.ALFACRM_HOST || '',
  email: process.env.ALFACRM_EMAIL || '',
  apiKey: process.env.ALFACRM_API_KEY || '',
  branch: process.env.ALFACRM_BRANCH || '1',
  enabled: !!(
    process.env.ALFACRM_HOST &&
    process.env.ALFACRM_EMAIL &&
    process.env.ALFACRM_API_KEY
  ),
};

let tokenCache = { token: null, expiresAt: 0 };

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://${CONFIG.hostname}${path}`);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (tokenCache.token) {
      options.headers['X-ALFACRM-TOKEN'] = tokenCache.token;
    }

    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, data: JSON.parse(text) });
        } catch {
          resolve({ status: res.statusCode, data: text });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  const { status, data } = await apiRequest('POST', '/v2api/auth/login', {
    email: CONFIG.email,
    api_key: CONFIG.apiKey,
  });

  if (status !== 200 || !data.token) {
    throw new Error(`AlfaCRM auth failed: ${JSON.stringify(data)}`);
  }

  tokenCache = {
    token: data.token,
    expiresAt: Date.now() + 3300 * 1000,
  };
  return data.token;
}

async function ensureToken() {
  if (!CONFIG.enabled) return null;
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  return login();
}

function isEnabled() {
  return CONFIG.enabled;
}

async function getSubjects() {
  if (!CONFIG.enabled) {
    return getMockSubjects();
  }
  await ensureToken();
  const { status, data } = await apiRequest(
    'POST',
    `/v2api/${CONFIG.branch}/subject/index`,
    { page: 0, pageSize: 500 }
  );
  if (status !== 200) throw new Error(`AlfaCRM subjects error: ${JSON.stringify(data)}`);
  return (data.items || []).map((s) => ({
    id: s.id,
    name: s.name,
  }));
}

async function getCustomerBonus(customerId) {
  if (!CONFIG.enabled) {
    return getMockBonus(customerId);
  }
  await ensureToken();
  const { status, data } = await apiRequest(
    'POST',
    `/v2api/${CONFIG.branch}/bonus/balance-bonus?customer_id=${customerId}`
  );
  if (status !== 200) throw new Error(`AlfaCRM bonus error: ${JSON.stringify(data)}`);
  return data;
}

function getMockSubjects() {
  return [
    { id: 1, name: 'Математика' },
    { id: 2, name: 'Русский язык' },
    { id: 3, name: 'Английский язык' },
    { id: 4, name: 'Физика' },
    { id: 5, name: 'Химия' },
    { id: 6, name: 'История' },
    { id: 7, name: 'Литература' },
    { id: 8, name: 'Информатика' },
    { id: 9, name: 'Биология' },
    { id: 10, name: 'География' },
  ];
}

function getMockBonus(_customerId) {
  return {
    balance: Math.floor(Math.random() * 500) + 50,
    currency: 'коддикоины',
  };
}

module.exports = {
  isEnabled,
  getSubjects,
  getCustomerBonus,
};
