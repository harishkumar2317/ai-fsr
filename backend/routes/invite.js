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

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

router.post('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { email, role, organization_id, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const orgId = organization_id || req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization is required.' });
    }

    const existing = queryOne("SELECT id, role FROM users WHERE email = ?", [email]);

    if (existing) {
      runSQL(
        "UPDATE users SET organization_id = ?, role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?",
        [orgId, role || null, existing.id]
      );
      return res.json({ message: 'User added to organization.', invited: false });
    }

    const tempPass = bcrypt.hashSync('Welcome@' + Math.random().toString(36).slice(2, 8), 10);
    runSQL(
      "INSERT INTO users (name, email, password, role, organization_id, status) VALUES (?, ?, ?, ?, ?, ?)",
      [name || email.split('@')[0], email, tempPass, role || 'viewer', orgId, 'active']
    );

    res.status(201).json({ message: 'Invitation sent to ' + email, invited: true });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) return res.json({ members: [] });

    const members = queryAll(
      `SELECT id, name, email, role, status, created_at FROM users WHERE organization_id = ? ORDER BY created_at DESC`,
      [orgId]
    );
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself.' });
    }
    runSQL("UPDATE users SET organization_id = NULL, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    res.json({ message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;