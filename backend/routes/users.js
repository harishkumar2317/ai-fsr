const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let sql = `SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.organization_id,
               o.name as organization_name, o.plant as organization_plant, u.created_at
               FROM users u LEFT JOIN organizations o ON u.organization_id = o.id ORDER BY u.created_at DESC`;
    let params = [];
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.organization_id,
             o.name as organization_name, o.plant as organization_plant, u.created_at
             FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
             WHERE u.organization_id = $1 ORDER BY u.created_at DESC`;
      params = [req.user.organization_id];
    }
    const users = await queryAll(sql, params);
    res.json({ users, total: users.length });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, organization_id, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await runSQL(
      "INSERT INTO users (name, email, password, role, organization_id, phone) VALUES ($1, $2, $3, $4, $5, $6)",
      [name, email, hash, role || 'viewer', organization_id || null, phone || '']
    );

    res.status(201).json({ message: 'User created.' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, role, organization_id, phone, status, password } = req.body;

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await runSQL("UPDATE users SET name=$1, email=$2, role=$3, organization_id=$4, phone=$5, status=$6, password=$7, updated_at=NOW() WHERE id=$8",
        [name, email, role, organization_id||null, phone||'', status||'active', hash, req.params.id]);
    } else {
      await runSQL("UPDATE users SET name=$1, email=$2, role=$3, organization_id=$4, phone=$5, status=$6, updated_at=NOW() WHERE id=$7",
        [name, email, role, organization_id||null, phone||'', status||'active', req.params.id]);
    }

    res.json({ message: 'User updated.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    await runSQL("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
