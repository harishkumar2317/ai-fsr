const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = `SELECT a.*, o.name as org_name FROM audits a
               LEFT JOIN organizations o ON a.organization_id = o.id ORDER BY a.created_at DESC`;
    let params = [];
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT a.*, o.name as org_name FROM audits a
             LEFT JOIN organizations o ON a.organization_id = o.id
             WHERE a.organization_id = $1 ORDER BY a.created_at DESC`;
      params = [req.user.organization_id];
    }
    const audits = await queryAll(sql, params);
    res.json({ audits });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { audit_id, type, organization_id, plant, auditor, date, score, status, findings } = req.body;
    await runSQL(
      "INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status, findings) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [audit_id, type, organization_id, plant||'', auditor||'', date||'', score||null, status||'Scheduled', findings||'']
    );
    res.status(201).json({ message: 'Audit created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { audit_id, type, organization_id, plant, auditor, date, score, status, findings } = req.body;
    await runSQL(
      "UPDATE audits SET audit_id=$1, type=$2, organization_id=$3, plant=$4, auditor=$5, date=$6, score=$7, status=$8, findings=$9 WHERE id=$10",
      [audit_id, type, organization_id, plant, auditor, date, score, status, findings, req.params.id]
    );
    res.json({ message: 'Audit updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await runSQL("DELETE FROM audits WHERE id = $1", [req.params.id]);
    res.json({ message: 'Audit deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
