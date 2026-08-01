// public/js/api.js
// Единая обёртка над fetch: всегда шлёт куки сессии, разбирает JSON,
// бросает Error с понятным списком ошибок при неуспешном ответе.

const api = {
  async request(method, url, body, isMultipart) {
    const opts = { method, credentials: 'include', headers: {} };
    if (body !== undefined) {
      if (isMultipart) {
        opts.body = body; // FormData — заголовок Content-Type браузер выставит сам
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }

    const res = await fetch(url, opts);
    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = null; }
    }

    if (!res.ok) {
      const message = (data && data.message) || `Ошибка запроса (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.errors = (data && data.errors) || [message];
      throw err;
    }

    return data;
  },

  get(url) {
    return this.request('GET', url);
  },
  postJson(url, body) {
    return this.request('POST', url, body, false);
  },
  postForm(url, formData) {
    return this.request('POST', url, formData, true);
  },
  delete(url) {
    return this.request('DELETE', url);
  },
  putJson(url, body) {
    return this.request('PUT', url, body, false);
  },
  putForm(url, formData) {
    return this.request('PUT', url, formData, true);
  },
};
