const express = require('express');
const { getDB, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');

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

router.get('/', authenticate, (req, res) => {
  try {
    let sql = `SELECT c.*, o.name as org_name FROM capa c
               LEFT JOIN organizations o ON c.organization_id = o.id ORDER BY c.created_at DESC`;
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT c.*, o.name as org_name FROM capa c
             LEFT JOIN organizations o ON c.organization_id = o.id
             WHERE c.organization_id = ${req.user.organization_id} ORDER BY c.created_at DESC`;
    }
    res.json({ capa: queryAll(sql) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress } = req.body;
    runSQL(
      "INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [capa_id, title, description||'', type||'Corrective', priority||'Medium', status||'Open', organization_id, assigned_to||'', due_date||'', progress||0]
    );
    res.status(201).json({ message: 'CAPA created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress } = req.body;
    runSQL(
      "UPDATE capa SET capa_id=?, title=?, description=?, type=?, priority=?, status=?, organization_id=?, assigned_to=?, due_date=?, progress=? WHERE id=?",
      [capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress, req.params.id]
    );
    res.json({ message: 'CAPA updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    runSQL("DELETE FROM capa WHERE id = ?", [req.params.id]);
    res.json({ message: 'CAPA deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;