const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = `SELECT c.*, o.name as org_name FROM capa c
               LEFT JOIN organizations o ON c.organization_id = o.id ORDER BY c.created_at DESC`;
    let params = [];
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT c.*, o.name as org_name FROM capa c
             LEFT JOIN organizations o ON c.organization_id = o.id
             WHERE c.organization_id = $1 ORDER BY c.created_at DESC`;
      params = [req.user.organization_id];
    }
    const capa = await queryAll(sql, params);
    res.json({ capa });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress } = req.body;
    await runSQL(
      "INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [capa_id, title, description||'', type||'Corrective', priority||'Medium', status||'Open', organization_id, assigned_to||'', due_date||'', progress||0]
    );
    res.status(201).json({ message: 'CAPA created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress } = req.body;
    await runSQL(
      "UPDATE capa SET capa_id=$1, title=$2, description=$3, type=$4, priority=$5, status=$6, organization_id=$7, assigned_to=$8, due_date=$9, progress=$10 WHERE id=$11",
      [capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress, req.params.id]
    );
    res.json({ message: 'CAPA updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await runSQL("DELETE FROM capa WHERE id = $1", [req.params.id]);
    res.json({ message: 'CAPA deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
