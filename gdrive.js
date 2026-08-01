const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

function assignNumbers(orders) {
  let changed = false;
  let next = orders.reduce((m, o) => (typeof o.number === 'number' ? Math.max(m, o.number) : m), 0) + 1;
  for (const o of orders) {
    if (typeof o.number !== 'number') {
      o.number = next++;
      changed = true;
    }
  }
  return changed;
}

function readOrders() {
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    if (assignNumbers(orders)) {
      writeOrders(orders);
    }
    return orders;
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

function appendOrder(order) {
  const orders = readOrders();
  order.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  order.number = orders.reduce((m, o) => (typeof o.number === 'number' ? Math.max(m, o.number) : m), 0) + 1;
  order.createdAt = new Date().toISOString();
  order.status = 'не выдан';
  order.dateIssued = null;
  order.actualCost = null;
  orders.push(order);
  writeOrders(orders);
  return order;
}

function updateOrder(id, fields) {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  Object.assign(orders[idx], fields);
  writeOrders(orders);
  return orders[idx];
}

function getOrdersForStudent(studentId) {
  return readOrders().filter((o) => o.studentId === studentId);
}

function getAllOrders() {
  return readOrders();
}

function removeOrder(id) {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  writeOrders(orders);
  return true;
}

module.exports = { appendOrder, updateOrder, removeOrder, getOrdersForStudent, getAllOrders };
