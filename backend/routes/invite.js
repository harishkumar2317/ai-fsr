const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { email, role, organization_id, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const orgId = organization_id || req.user.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization is required.' });

    const existing = await queryOne(`SELECT id, role FROM users WHERE email = $1`, [email]);

    if (existing) {
      await runSQL(`UPDATE users SET organization_id = $1, role = $2, updated_at = NOW() WHERE id = $3`, [orgId, role || existing.role, existing.id]);
      return res.json({ message: 'User added to organization.', invited: false });
    }

    const tempPass = bcrypt.hashSync('Welcome@' + Math.random().toString(36).slice(2, 8), 10);
    await runSQL(
      `INSERT INTO users (name, email, password, role, organization_id, status) VALUES ($1, $2, $3, $4, $5, 'active')`,
      [name || email.split('@')[0], email, tempPass, role || 'viewer', orgId]
    );
    res.status(201).json({ message: 'Invitation sent to ' + email, invited: true });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) return res.json({ members: [] });

    const orgName = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
    if (!orgName) return res.json({ members: [] });

    const allOrgIds = await queryAll(`SELECT id FROM organizations WHERE name = $1`, [orgName.name]);
    const orgIds = allOrgIds.map(o => o.id);
    if (!orgIds.length) return res.json({ members: [] });

    const members = await queryAll(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.organization_id,
              o.name as org_name, o.plant as org_plant
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.organization_id = ANY($1)
       ORDER BY u.created_at DESC`,
      [orgIds]
    );
    res.json({ members });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.patch('/:id/role', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const memberId = parseInt(req.params.id);
    if (!role) return res.status(400).json({ error: 'Role is required.' });
    if (memberId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role.' });
    await runSQL(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, [role, memberId]);
    res.json({ message: 'Role updated.' });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself.' });
    await runSQL(`UPDATE users SET organization_id = NULL, updated_at = NOW() WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
