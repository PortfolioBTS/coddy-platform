// public/js/pages/login.js

(async function redirectIfLoggedIn() {
  try {
    const { user } = await api.get('/api/me');
<<<<<<< HEAD
    redirectByRole(user.role);
=======
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  } catch (e) {
    // не авторизован — остаёмся на странице входа
  }
})();

const form = document.getElementById('login-form');
const errorsBox = document.getElementById('form-errors');

<<<<<<< HEAD
function redirectByRole(role) {
  window.location.href = role === 'student'
    ? '/student/courses.html'
    : role === 'parent'
      ? '/parent/courses.html'
      : '/teacher/courses.html';
}

=======
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  renderErrors(errorsBox, null);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const { user } = await api.postJson('/api/login', { email, password });
<<<<<<< HEAD
    redirectByRole(user.role);
=======
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
>>>>>>> af2d912928c4cd95ff2d6c055fda57dd8c4254a3
  } catch (err) {
    renderErrors(errorsBox, err.errors || [err.message]);
  }
});
