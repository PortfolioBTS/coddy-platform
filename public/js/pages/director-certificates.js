// public/js/pages/director-certificates.js

(async function () {
  const user = await bootPage('director');
  if (!user) return;

  const errorsBox = document.getElementById('cert-errors');
  const studentsInput = document.getElementById('student-search');
  const studentHint = document.getElementById('student-hint');
  let students = [];
  let selectedStudent = null;

  try {
    const data = await api.get('/api/director/students');
    students = data.students || [];
    const list = document.getElementById('students-list');
    list.innerHTML = students
      .map((s) => `<option value="${escapeHtml(`${s.firstName} ${s.lastName}`)}">`)
      .join('');
  } catch (err) {
    renderErrors(errorsBox, [err.message]);
  }

  // При выборе ученика из datalist — запоминаем его (имя и фамилия подтянутся).
  studentsInput.addEventListener('change', () => {
    const value = studentsInput.value.trim();
    selectedStudent = students.find((s) => `${s.firstName} ${s.lastName}` === value) || null;
    if (selectedStudent) {
      studentHint.textContent = `Выбран: ${selectedStudent.firstName} ${selectedStudent.lastName} · ${selectedStudent.city}`;
      studentHint.style.color = 'var(--ok)';
      updateCertificate();
    } else {
      studentHint.textContent = 'Выберите ученика из списка';
      studentHint.style.color = '';
      updateCertificate();
    }
  });

  // ---------- Звёзды ----------
  function generateStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 3 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.opacity = Math.random() * 0.8 + 0.2;
      starsContainer.appendChild(star);
    }
  }
  generateStars();

  function field(id) {
    return document.getElementById(id).value;
  }

  function updateCertificate() {
    const num = field('certNum');
    const date = field('certDate');
    const course = field('courseName');
    const start = field('startDate');
    const duration = field('duration');

    const name = selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Имя Фамилия';

    document.getElementById('certNumber').textContent = `№ ${num} от ${date}`;
    document.getElementById('certName').textContent = name;
    document.getElementById('certCourse').textContent = course || 'Название курса';
    document.getElementById('certStart').textContent = start;
    document.getElementById('certDuration').textContent = duration;
    document.getElementById('qrNumber').textContent = `№ ${num}`;
  }

  ['certNum', 'certDate', 'courseName', 'startDate', 'duration'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateCertificate);
  });

  function captureCanvas() {
    // Рендерим полный размер A4 (794×1123 px), сбросив transform scale,
    // которым превью уменьшено на экране. scale: 3 даёт ~288 DPI при печати.
    return html2canvas(document.getElementById('certificate'), {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      width: 794,
      height: 1123,
      onclone: (clonedDoc) => {
        const cert = clonedDoc.getElementById('certificate');
        if (cert) {
          cert.style.transform = 'none';
          cert.style.width = '794px';
          cert.style.height = '1123px';
        }
      },
    });
  }

  document.getElementById('download-cert-btn').addEventListener('click', () => {
    const name = selectedStudent ? `${selectedStudent.firstName}_${selectedStudent.lastName}` : 'сертификат';
    captureCanvas().then((canvas) => {
      const link = document.createElement('a');
      link.download = `Сертификат_${name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });

  document.getElementById('save-cert-btn').addEventListener('click', async () => {
    renderErrors(errorsBox, null);
    const errors = [];
    if (!selectedStudent) errors.push('Выберите ученика — имя и фамилия подтянутся автоматически.');
    if (!field('certNum').trim()) errors.push('Укажите номер сертификата.');
    if (!field('courseName').trim()) errors.push('Укажите название курса.');
    if (errors.length) {
      renderErrors(errorsBox, errors);
      return;
    }

    const btn = document.getElementById('save-cert-btn');
    btn.disabled = true;
    try {
      const canvas = await captureCanvas();
      const imageData = canvas.toDataURL('image/png');
      await api.postJson('/api/director/certificates', {
        studentId: selectedStudent.id,
        certNumber: field('certNum').trim(),
        issueDate: field('certDate').trim(),
        courseName: field('courseName').trim(),
        startDate: field('startDate').trim(),
        duration: field('duration').trim(),
        imageData,
      });
      alert('Сертификат сохранён. Ученик найдёт его в разделе сертификатов своего профиля.');
    } catch (err) {
      renderErrors(errorsBox, err.errors || [err.message]);
    } finally {
      btn.disabled = false;
    }
  });

  updateCertificate();
})();
