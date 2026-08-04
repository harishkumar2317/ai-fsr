const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function queryAll(sql, params = []) {
  const db = getDB();
  if (params.length) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  const result = db.exec(sql);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

router.get('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    let sql = `SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.organization_id,
               o.name as organization_name, o.plant as organization_plant, u.created_at
               FROM users u LEFT JOIN organizations o ON u.organization_id = o.id ORDER BY u.created_at DESC`;
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.organization_id,
             o.name as organization_name, o.plant as organization_plant, u.created_at
             FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
             WHERE u.organization_id = ${req.user.organization_id} ORDER BY u.created_at DESC`;
    }
    const users = queryAll(sql);
    res.json({ users, total: users.length });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { name, email, password, role, organization_id, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = queryAll("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    runSQL(
      "INSERT INTO users (name, email, password, role, organization_id, phone) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hash, role || 'viewer', organization_id || null, phone || '']
    );

    res.status(201).json({ message: 'User created.' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { name, email, role, organization_id, phone, status, password } = req.body;

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      runSQL("UPDATE users SET name=?, email=?, role=?, organization_id=?, phone=?, status=?, password=?, updated_at=datetime('now') WHERE id=?",
        [name, email, role, organization_id||null, phone||'', status||'active', hash, req.params.id]);
    } else {
      runSQL("UPDATE users SET name=?, email=?, role=?, organization_id=?, phone=?, status=?, updated_at=datetime('now') WHERE id=?",
        [name, email, role, organization_id||null, phone||'', status||'active', req.params.id]);
    }

    res.json({ message: 'User updated.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    runSQL("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;