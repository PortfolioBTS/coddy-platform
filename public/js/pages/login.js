// public/js/pages/login.js

(async function redirectIfLoggedIn() {
  try {
    const { user } = await api.get('/api/me');
    redirectByRole(user.role);
  } catch (e) {
    // не авторизован — остаёмся на странице входа
  }
})();

const form = document.getElementById('login-form');
const errorsBox = document.getElementById('form-errors');

function redirectByRole(role) {
  window.location.href = role === 'student'
    ? '/student/courses.html'
    : role === 'parent'
      ? '/parent/courses.html'
      : '/teacher/courses.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  renderErrors(errorsBox, null);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const { user } = await api.postJson('/api/login', { email, password });
    redirectByRole(user.role);
  } catch (err) {
    renderErrors(errorsBox, err.errors || [err.message]);
  }
});
