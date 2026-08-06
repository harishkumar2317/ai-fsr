const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function getOrgId(user) {
  return user.organization_id;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const orgId = getOrgId(req.user);
    if (!orgId) return res.json({ checklists: [] });

    const orgName = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
    if (!orgName) return res.json({ checklists: [] });

    const allOrgIds = await queryAll(`SELECT id FROM organizations WHERE name = $1`, [orgName.name]);
    const orgIds = allOrgIds.map(o => o.id);
    if (!orgIds.length) return res.json({ checklists: [] });

    const { frequency, category } = req.query;
    let sql = `SELECT * FROM checklist WHERE organization_id = ANY($1)`;
    const params = [orgIds];
    let idx = 2;

    if (frequency && frequency !== 'All') {
      sql += ` AND frequency = $${idx}`;
      params.push(frequency);
      idx++;
    }
    if (category && category !== 'All') {
      sql += ` AND category = $${idx}`;
      params.push(category);
      idx++;
    }

    sql += ` ORDER BY id ASC`;
    const checklists = await queryAll(sql, params);
    res.json({ checklists });
  } catch (err) {
    console.error('Get checklists error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const orgId = getOrgId(req.user);
    if (!orgId) return res.json({ compliant: 0, non_compliant: 0, pending: 0, total: 0 });

    const orgName = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
    if (!orgName) return res.json({ compliant: 0, non_compliant: 0, pending: 0, total: 0 });

    const allOrgIds = await queryAll(`SELECT id FROM organizations WHERE name = $1`, [orgName.name]);
    const orgIds = allOrgIds.map(o => o.id);
    if (!orgIds.length) return res.json({ compliant: 0, non_compliant: 0, pending: 0, total: 0 });

    const stats = await queryOne(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE status = 'Compliant')::int as compliant,
         COUNT(*) FILTER (WHERE status = 'Non-Compliant')::int as non_compliant,
         COUNT(*) FILTER (WHERE status = 'Pending')::int as pending
       FROM checklist WHERE organization_id = ANY($1)`,
      [orgIds]
    );
    res.json(stats || { compliant: 0, non_compliant: 0, pending: 0, total: 0 });
  } catch (err) {
    console.error('Get checklist stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin', 'food_safety_officer'), async (req, res) => {
  try {
    const { title, category, frequency, assignee, regulation, action, due_date, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const orgId = getOrgId(req.user);
    if (!orgId) return res.status(400).json({ error: 'Organization required.' });

    const r = await runSQL(
      `INSERT INTO checklist (title, category, frequency, status, assignee, regulation, action, organization_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, category || 'General', frequency || 'Daily', status || 'Pending', assignee || '', regulation || '', action || '', orgId, due_date || null]
    );
    res.status(201).json({ checklist: r.rows[0], message: 'Checklist item added.' });
  } catch (err) {
    console.error('Create checklist error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, authorize('super_admin', 'admin', 'food_safety_officer'), async (req, res) => {
  try {
    const { title, category, frequency, assignee, regulation, action, due_date, status } = req.body;
    const r = await runSQL(
      `UPDATE checklist SET title=$1, category=$2, frequency=$3, assignee=$4, regulation=$5, action=$6, due_date=$7, status=$8, created_at=created_at WHERE id=$9 RETURNING *`,
      [title, category, frequency, assignee, regulation, action, due_date, status, parseInt(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found.' });
    res.json({ checklist: r.rows[0], message: 'Updated.' });
  } catch (err) {
    console.error('Update checklist error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await runSQL(`DELETE FROM checklist WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
