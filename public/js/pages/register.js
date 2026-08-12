// public/js/pages/register.js

(async function redirectIfLoggedIn() {
  try {
    const { user } = await api.get('/api/me');
    window.location.href = user.role === 'student'
      ? '/student/courses.html'
      : user.role === 'parent'
        ? '/parent/courses.html'
        : '/teacher/courses.html';
  } catch (e) { /* не авторизован — остаёмся */ }
})();

const form = document.getElementById('register-form');
const errorsBox = document.getElementById('form-errors');

const birthField = document.getElementById('birth-field');
const birthInput = document.getElementById('birthDate');
const teacherCodeField = document.getElementById('teacher-code-field');
const parentChildrenField = document.getElementById('parent-children-field');
const childLoginsList = document.getElementById('child-logins-list');
const addChildLoginBtn = document.getElementById('add-child-login');

initDatepicker({
  trigger: document.getElementById('datepicker-trigger'),
  popup: document.getElementById('datepicker-popup'),
  input: birthInput,
  label: document.getElementById('datepicker-label'),
  maxDate: new Date().toISOString().slice(0, 10),
});

function addChildLoginRow() {
  const row = document.createElement('div');
  row.className = 'child-login-row';
  row.innerHTML = `
    <input class="input" type="text" name="childLogin" placeholder="Логин (почта) ребёнка" autocomplete="off">
    <button type="button" class="btn btn--sm btn--danger child-login-row__remove" aria-label="Удалить">✕</button>
  `;
  childLoginsList.appendChild(row);
  row.querySelector('.child-login-row__remove').addEventListener('click', () => {
    if (childLoginsList.children.length > 1) row.remove();
  });
}
addChildLoginBtn.addEventListener('click', addChildLoginRow);

function updateRoleVisibility() {
  const role = form.role.value;
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const isParent = role === 'parent';

  birthField.hidden = !isStudent;
  teacherCodeField.hidden = !isTeacher;
  parentChildrenField.hidden = !isParent;

  if (birthField.hidden) {
    birthInput.value = '';
    const label = document.getElementById('datepicker-label');
    label.textContent = 'Выберите дату';
    label.classList.remove('datepicker__value');
    label.classList.add('datepicker__placeholder');
  }
}
document.querySelectorAll('input[name="role"]').forEach((r) => r.addEventListener('change', updateRoleVisibility));
updateRoleVisibility();

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

  if (form.role.value === 'teacher') {
    payload.teacherCode = document.getElementById('teacherCode').value.trim();
  }

  if (form.role.value === 'parent') {
    payload.childLogins = Array.from(form.querySelectorAll('input[name="childLogin"]'))
      .map((el) => el.value.trim())
      .filter(Boolean);
    if (!payload.childLogins.length) {
      renderErrors(errorsBox, ['Укажите логин хотя бы одного ребёнка.']);
      return;
    }
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

  if (!document.getElementById('consent').checked) {
    renderErrors(errorsBox, ['Необходимо согласиться с обработкой персональных данных, Пользовательским соглашением и Договором оферты.']);
    return;
  }
  payload.consent = true;

  try {
    const { user } = await api.postJson('/api/register', payload);
    window.location.href = user.role === 'teacher'
      ? '/teacher/courses.html'
      : user.role === 'parent'
        ? '/parent/courses.html'
        : '/student/courses.html';
  } catch (err) {
    renderErrors(errorsBox, err.errors || [err.message]);
  }
});
