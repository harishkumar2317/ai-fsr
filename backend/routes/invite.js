const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function queryAll(sql) {
  const db = getDB();
  const result = db.exec(sql);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

function queryOne(sql) {
  const rows = queryAll(sql);
  return rows.length ? rows[0] : null;
}

function esc(s) { return (s || '').replace(/'/g, "''"); }

router.post('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { email, role, organization_id, name, plant } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const orgId = organization_id || req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization is required.' });
    }

    const existing = queryOne(`SELECT id, role FROM users WHERE email = '${esc(email)}'`);

    if (existing) {
      runSQL(
        `UPDATE users SET organization_id = ${orgId}, role = '${esc(role || existing.role)}', updated_at = datetime('now') WHERE id = ${existing.id}`
      );
      return res.json({ message: 'User added to organization.', invited: false });
    }

    const tempPass = bcrypt.hashSync('Welcome@' + Math.random().toString(36).slice(2, 8), 10);
    runSQL(
      `INSERT INTO users (name, email, password, role, organization_id, status) VALUES ('${esc(name || email.split('@')[0])}', '${esc(email)}', '${tempPass}', '${esc(role || 'viewer')}', ${orgId}, 'active')`
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
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.organization_id,
              o.name as org_name, o.plant as org_plant
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.organization_id = ${orgId}
       ORDER BY u.created_at DESC`
    );
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.patch('/:id/role', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { role } = req.body;
    const memberId = parseInt(req.params.id);
    if (!role) return res.status(400).json({ error: 'Role is required.' });
    if (memberId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role.' });

    runSQL(`UPDATE users SET role = '${esc(role)}', updated_at = datetime('now') WHERE id = ${memberId}`);
    res.json({ message: 'Role updated.' });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself.' });
    }
    runSQL(`UPDATE users SET organization_id = NULL, updated_at = datetime('now') WHERE id = ${req.params.id}`);
    res.json({ message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
