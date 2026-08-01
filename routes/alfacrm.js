const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const alfacrm = require('../alfacrm');

const router = express.Router();

router.get('/api/teacher/alfacrm/subjects', requireAuth, requireRole('teacher'), async (req, res) => {
  try {
    const subjects = await alfacrm.getSubjects();
    res.json({ subjects });
  } catch (err) {
    console.error('AlfaCRM subjects error:', err.message);
    res.status(502).json({ message: 'Не удалось загрузить темы из CRM.', error: err.message });
  }
});

router.get('/api/student/alfacrm/balance', requireAuth, requireRole('student'), async (req, res) => {
  const customerId = req.user.alfacrmCustomerId;
  if (!customerId) {
    return res.json({ balance: null, message: 'Клиент не привязан к CRM.' });
  }
  try {
    const result = await alfacrm.getCustomerBonus(customerId);
    res.json({ balance: result.balance ?? result, message: null });
  } catch (err) {
    console.error('AlfaCRM balance error:', err.message);
    res.status(502).json({ message: 'Не удалось загрузить баланс из CRM.', error: err.message });
  }
});

module.exports = router;
