// public/js/pages/register.js

(async function redirectIfLoggedIn() {
  try {
    const { user } = await api.get('/api/me');
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
  } catch (e) { /* не авторизован — остаёмся */ }
})();

const form = document.getElementById('register-form');
const errorsBox = document.getElementById('form-errors');

const birthField = document.getElementById('birth-field');
const birthInput = document.getElementById('birthDate');

initDatepicker({
  trigger: document.getElementById('datepicker-trigger'),
  popup: document.getElementById('datepicker-popup'),
  input: birthInput,
  label: document.getElementById('datepicker-label'),
  maxDate: new Date().toISOString().slice(0, 10),
});

function updateBirthVisibility() {
  birthField.hidden = form.role.value !== 'student';
  if (birthField.hidden) {
    birthInput.value = '';
    const label = document.getElementById('datepicker-label');
    label.textContent = 'Выберите дату';
    label.classList.remove('datepicker__value');
    label.classList.add('datepicker__placeholder');
  }
}
document.querySelectorAll('input[name="role"]').forEach((r) => r.addEventListener('change', updateBirthVisibility));
updateBirthVisibility();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  renderErrors(errorsBox, null);

  const payload = {
    role: form.role.value,
    firstName: form.firstName.value,
    lastName: form.lastName.value,
    city: form.city.value,
    phone: form.phone.value,
    email: form.email.value,
    password: form.password.value,
    passwordConfirm: form.passwordConfirm.value,
  };

  if (form.role.value === 'student' && birthInput.value) {
    payload.birthDate = birthInput.value;
  }

  if (payload.password !== payload.passwordConfirm) {
    renderErrors(errorsBox, ['Пароли не совпадают.']);
    return;
  }

  const phone = (payload.phone || '').trim();
  if (!/^[\d+\-() ]{5,20}$/.test(phone)) {
    renderErrors(errorsBox, ['Телефон может содержать только цифры, +, -, пробелы и скобки (от 5 символов).']);
    return;
  }
  payload.phone = phone;

  try {
    const { user } = await api.postJson('/api/register', payload);
    window.location.href = user.role === 'teacher' ? '/teacher/courses.html' : '/student/courses.html';
  } catch (err) {
    renderErrors(errorsBox, err.errors || [err.message]);
  }
});
