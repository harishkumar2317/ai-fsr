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
    let sql = `SELECT a.*, o.name as org_name FROM audits a
               LEFT JOIN organizations o ON a.organization_id = o.id ORDER BY a.created_at DESC`;
    if (req.user.role !== 'super_admin' && req.user.organization_id) {
      sql = `SELECT a.*, o.name as org_name FROM audits a
             LEFT JOIN organizations o ON a.organization_id = o.id
             WHERE a.organization_id = ${req.user.organization_id} ORDER BY a.created_at DESC`;
    }
    res.json({ audits: queryAll(sql) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { audit_id, type, organization_id, plant, auditor, date, score, status, findings } = req.body;
    runSQL(
      "INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status, findings) VALUES (?,?,?,?,?,?,?,?,?)",
      [audit_id, type, organization_id, plant||'', auditor||'', date||'', score||null, status||'Scheduled', findings||'']
    );
    res.status(201).json({ message: 'Audit created.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, (req, res) => {
  try {
    const { audit_id, type, organization_id, plant, auditor, date, score, status, findings } = req.body;
    runSQL(
      "UPDATE audits SET audit_id=?, type=?, organization_id=?, plant=?, auditor=?, date=?, score=?, status=?, findings=? WHERE id=?",
      [audit_id, type, organization_id, plant, auditor, date, score, status, findings, req.params.id]
    );
    res.json({ message: 'Audit updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, (req, res) => {
  try {
    runSQL("DELETE FROM audits WHERE id = ?", [req.params.id]);
    res.json({ message: 'Audit deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;