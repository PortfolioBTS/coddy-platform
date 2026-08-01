// public/js/pages/login.js

(async function redirectIfLoggedIn() {
  try {
    const { user } = await api.get('/api/me');
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
  } catch (e) {
    // не авторизован — остаёмся на странице входа
  }
})();

const form = document.getElementById('login-form');
const errorsBox = document.getElementById('form-errors');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  renderErrors(errorsBox, null);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const { user } = await api.postJson('/api/login', { email, password });
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
  } catch (err) {
    renderErrors(errorsBox, err.errors || [err.message]);
  }
});
