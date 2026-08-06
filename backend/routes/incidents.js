const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = `SELECT i.*, o.name as org_name FROM incidents i
               LEFT JOIN organizations o ON i.organization_id = o.id ORDER BY i.created_at DESC`;
    let params = [];
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT i.*, o.name as org_name FROM incidents i
             LEFT JOIN organizations o ON i.organization_id = o.id
             WHERE i.organization_id = $1 ORDER BY i.created_at DESC`;
      params = [req.user.organization_id];
    }
    const incidents = await queryAll(sql, params);
    res.json({ incidents });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date } = req.body;
    await runSQL(
      "INSERT INTO incidents (incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [incident_id, title, description||'', severity||'Medium', status||'Open', organization_id, reported_by||req.user.name, assigned_to||'', date||'']
    );
    res.status(201).json({ message: 'Incident created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date } = req.body;
    await runSQL(
      "UPDATE incidents SET incident_id=$1, title=$2, description=$3, severity=$4, status=$5, organization_id=$6, reported_by=$7, assigned_to=$8, date=$9 WHERE id=$10",
      [incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date, req.params.id]
    );
    res.json({ message: 'Incident updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await runSQL("DELETE FROM incidents WHERE id = $1", [req.params.id]);
    res.json({ message: 'Incident deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
