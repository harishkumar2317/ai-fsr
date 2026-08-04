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
    let sql = `SELECT i.*, o.name as org_name FROM incidents i
               LEFT JOIN organizations o ON i.organization_id = o.id ORDER BY i.created_at DESC`;
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT i.*, o.name as org_name FROM incidents i
             LEFT JOIN organizations o ON i.organization_id = o.id
             WHERE i.organization_id = ${req.user.organization_id} ORDER BY i.created_at DESC`;
    }
    res.json({ incidents: queryAll(sql) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date } = req.body;
    runSQL(
      "INSERT INTO incidents (incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date) VALUES (?,?,?,?,?,?,?,?,?)",
      [incident_id, title, description||'', severity||'Medium', status||'Open', organization_id, reported_by||req.user.name, assigned_to||'', date||'']
    );
    res.status(201).json({ message: 'Incident created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date } = req.body;
    runSQL(
      "UPDATE incidents SET incident_id=?, title=?, description=?, severity=?, status=?, organization_id=?, reported_by=?, assigned_to=?, date=? WHERE id=?",
      [incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date, req.params.id]
    );
    res.json({ message: 'Incident updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    runSQL("DELETE FROM incidents WHERE id = ?", [req.params.id]);
    res.json({ message: 'Incident deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;