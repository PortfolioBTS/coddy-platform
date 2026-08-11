// public/js/pages/teacher-test-form.js

(async function () {
  const user = await bootPage('teacher');
  if (!user) return;

  let lessonId = qs('lessonId');
  const testId = qs('testId');
  if (!lessonId && !testId) { window.location.href = '/teacher/courses.html'; return; }

  let lesson = null;
  let existingTest = null;

  const container = document.getElementById('questions-container');
  let qCounter = 0;

  function esc(s) { return escapeHtml(s || ''); }

  function makeOptionHtml(questionEl, qid, option) {
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-option';
    wrapper.dataset.optionId = option.id;
    wrapper.innerHTML = `
      <input class="input quiz-option__text" type="text" value="${esc(option.text)}" placeholder="Вариант ответа">
      <label class="quiz-option__correct">
        <input type="checkbox" ${option.isCorrect ? 'checked' : ''} title="Отметить как правильный">
        <span>правильный</span>
      </label>
      <button class="btn btn--sm quiz-option__remove" type="button" title="Удалить вариант">×</button>
    `;
    const checkbox = wrapper.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      const type = questionEl.querySelector('.quiz-question__type').value;
      if (type === 'single' && checkbox.checked) {
        questionEl.querySelectorAll('.quiz-option__correct input').forEach((cb) => {
          if (cb !== checkbox) cb.checked = false;
        });
      }
    });
    wrapper.querySelector('.quiz-option__remove').addEventListener('click', () => {
      wrapper.remove();
    });
    return wrapper;
  }

  function addOption(questionEl, qid, option) {
    questionEl.querySelector('.quiz-options').appendChild(
      makeOptionHtml(questionEl, qid, option)
    );
  }

  function makeQuestionHtml(qid, q) {
    const div = document.createElement('div');
    div.className = 'quiz-question';
    div.dataset.qid = qid;
    div.innerHTML = `
      <div class="quiz-question__head">
        <span class="quiz-question__num">Вопрос ${qCounter}</span>
        <button class="btn btn--sm btn--danger quiz-question__remove" type="button" title="Удалить вопрос">×</button>
      </div>
      <div class="field">
        <label class="field__label" for="${qid}-text">Текст вопроса</label>
        <textarea class="textarea" id="${qid}-text" rows="2">${esc(q ? q.text : '')}</textarea>
      </div>
      <div class="form-grid">
        <div class="field">
          <label class="field__label" for="${qid}-type">Тип вопроса</label>
          <select class="select quiz-question__type" id="${qid}-type">
            <option value="single">Один из многих</option>
            <option value="multiple">Несколько из многих</option>
          </select>
        </div>
        <div class="field quiz-options-head">
          <span class="field__label">Варианты ответа</span>
          <button class="btn btn--sm quiz-option__add" type="button">+ Вариант</button>
        </div>
      </div>
      <div class="quiz-options"></div>
    `;

    const typeSelect = div.querySelector('.quiz-question__type');
    if (q && q.type === 'multiple') typeSelect.value = 'multiple';

    const optionsBox = div.querySelector('.quiz-options');
    const optionList = q && q.options && q.options.length
      ? q.options
      : [{ id: 'n1', text: '' }, { id: 'n2', text: '' }];

    const correctSet = q && q.correct ? q.correct : [];
    optionList.forEach((o, idx) => {
      addOption(div, qid, {
        id: `${qid}_o${idx + 1}`,
        text: o.text || '',
        isCorrect: correctSet.includes(o.id),
      });
    });

    div.querySelector('.quiz-option__add').addEventListener('click', () => {
      addOption(div, qid, { id: `o_${Math.random().toString(36).slice(2, 8)}`, text: '', isCorrect: false });
    });

    div.querySelector('.quiz-question__remove').addEventListener('click', () => {
      div.remove();
      renumberQuestions();
    });

    return div;
  }

  function addQuestion(q) {
    qCounter += 1;
    const el = makeQuestionHtml(`q_${Date.now()}_${qCounter}`, q);
    container.appendChild(el);
  }

  function renumberQuestions() {
    container.querySelectorAll('.quiz-question').forEach((el, i) => {
      el.querySelector('.quiz-question__num').textContent = `Вопрос ${i + 1}`;
    });
  }

  // При импорте из Google-формы удаляем заранее созданные пустые вопросы,
  // чтобы после переноса не оставался одинокий пустой вопрос в конце.
  function removeEmptyQuestions() {
    container.querySelectorAll('.quiz-question').forEach((el) => {
      const text = el.querySelector('textarea').value.trim();
      const hasOptionText = [...el.querySelectorAll('.quiz-option__text')].some((i) => i.value.trim());
      if (!text && !hasOptionText) el.remove();
    });
    renumberQuestions();
  }

  function collectQuestions() {
    const questions = [];
    container.querySelectorAll('.quiz-question').forEach((el) => {
      const text = el.querySelector('textarea').value.trim();
      const type = el.querySelector('.quiz-question__type').value;
      const options = [];
      el.querySelectorAll('.quiz-option').forEach((opt) => {
        const t = opt.querySelector('.quiz-option__text').value.trim();
        if (!t) return;
        options.push({
          id: opt.dataset.optionId,
          text: t,
          isCorrect: opt.querySelector('input[type="checkbox"]').checked,
        });
      });
      if (!text) return;
      if (options.length < 2) return;
      const correct = options.filter((o) => o.isCorrect).map((o) => o.id);
      if (!correct.length) return;
      questions.push({ id: el.dataset.qid, type, text, options, correct });
    });
    return questions;
  }

  document.getElementById('add-question-btn').addEventListener('click', () => addQuestion(null));

  // Импорт вопросов из Google-формы (ссылка или iframe-код).
  const importBtn = document.getElementById('import-google-btn');
  const importModal = document.getElementById('import-google-modal');
  const importInput = document.getElementById('import-google-input');
  const importErrors = document.getElementById('import-google-errors');
  const importSubmit = document.getElementById('import-google-submit');

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      importInput.value = '';
      renderErrors(importErrors, null);
      openModal('import-google-modal');
    });

    importSubmit.addEventListener('click', async () => {
      const input = importInput.value.trim();
      if (!input) {
        renderErrors(importErrors, ['Вставьте ссылку на Google-форму или её iframe-код.']);
        return;
      }
      importSubmit.disabled = true;
      try {
        const form = await api.postJson('/api/teacher/tests/import-google', { input });
        removeEmptyQuestions();
        form.questions.forEach((q) => {
          addQuestion({
            text: q.text,
            type: q.type,
            options: q.options.map((t, i) => ({ id: `g_${i + 1}`, text: t })),
            correct: [],
          });
        });
        closeModal('import-google-modal');
        renderErrors(importErrors, null);
        alert(`Добавлено вопросов: ${form.questions.length}. Отметьте правильные ответы в каждом вопросе, иначе они не сохранятся.`);
      } catch (err) {
        renderErrors(importErrors, err.errors || [err.message]);
      } finally {
        importSubmit.disabled = false;
      }
    });
  }

  const form = document.getElementById('test-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = [];

    const title = document.getElementById('title').value.trim();
    if (!title) errors.push('Укажите название теста.');

    const questions = collectQuestions();
    if (!questions.length) errors.push('Добавьте хотя бы один вопрос с вариантами и правильным ответом.');

    // Валидация: в каждом вопросе должен быть правильный ответ.
    container.querySelectorAll('.quiz-question').forEach((el) => {
      const hasCorrect = [...el.querySelectorAll('.quiz-option__correct input')].some((cb) => cb.checked);
      if (!hasCorrect) {
        const num = el.querySelector('.quiz-question__num').textContent;
        errors.push(`В вопросе «${num}» не отмечен правильный ответ.`);
      }
    });

    renderErrors(document.getElementById('form-errors'), errors);
    if (errors.length) {
      document.getElementById('form-errors').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    try {
      const payload = {
        title,
        description: document.getElementById('description').value.trim(),
        showResults: document.getElementById('showResults').checked,
        attempts: document.getElementById('attempts').value,
        questions,
      };
      if (existingTest) {
        await api.putJson(`/api/teacher/tests/${existingTest.id}`, payload);
      } else {
        await api.postJson(`/api/teacher/lessons/${lessonId}/test`, payload);
      }
      window.location.href = `/teacher/lesson.html?id=${encodeURIComponent(lessonId)}`;
    } catch (err) {
      renderErrors(document.getElementById('form-errors'), err.errors || [err.message]);
      document.getElementById('form-errors').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      submitBtn.disabled = false;
    }
  });

  // Загрузка режима редактирования или курса для ссылки «Назад»
  try {
    if (testId) {
      const data = await api.get(`/api/teacher/tests/${testId}`);
      existingTest = data.test;
      lesson = data.lesson;
      lessonId = lesson.id;
      document.title = `${existingTest.title} · Классный журнал`;
      document.getElementById('eyebrow').textContent = 'Редактирование теста';
      document.getElementById('heading').textContent = 'Редактировать тест';
      document.getElementById('title').value = existingTest.title;
      document.getElementById('description').value = existingTest.description || '';
      document.getElementById('showResults').checked = !!existingTest.showResults;
      document.getElementById('attempts').value = String(existingTest.attempts || 1);
      existingTest.questions.forEach((q) => addQuestion(q));
    } else {
      const data = await api.get(`/api/teacher/lessons/${lessonId}`);
      lesson = data.lesson;
      addQuestion(null);
    }
    document.getElementById('back-link').href = `/teacher/lesson.html?id=${encodeURIComponent(lessonId)}`;
    document.getElementById('back-link').textContent = `← ${lesson ? lesson.title : 'Урок'}`;
  } catch (err) {
    renderErrors(document.getElementById('form-errors'), [err.message]);
  }
})();
