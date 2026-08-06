const express = require('express');
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

router.get('/', authenticate, (req, res) => {
  try {
    let sql = "SELECT * FROM organizations ORDER BY created_at DESC";
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.organization_id) {
      sql = `SELECT * FROM organizations WHERE id = ${req.user.organization_id}`;
    }
    const orgs = queryAll(sql);
    res.json({ organizations: orgs, total: orgs.length });
  } catch (err) {
    console.error('Get organizations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const org = queryOne(`SELECT * FROM organizations WHERE id = ${parseInt(req.params.id)}`);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });
    res.json({ organization: org });
  } catch (err) {
    console.error('Get organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score } = req.body;
    if (!name || !plant || !fssai_license) {
      return res.status(400).json({ error: 'Name, plant, and FSSAI license are required.' });
    }

    runSQL(
      `INSERT INTO organizations (name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score)
       VALUES ('${esc(name)}', '${esc(plant)}', '${esc(code||'')}', '${esc(address||'')}', '${esc(fssai_license)}', '${esc(fssai_category||'State')}', '${esc(contact_person||'')}', '${esc(designation||'')}', '${esc(email||'')}', '${esc(phone||'')}', '${esc(status||'Active')}', ${parseInt(compliance_score)||0})`
    );

    const org = queryOne("SELECT * FROM organizations ORDER BY id DESC LIMIT 1");
    if (org && !req.user.organization_id) {
      runSQL(`UPDATE users SET organization_id = ${org.id} WHERE id = ${req.user.id}`);
    }
    res.status(201).json({ organization: org, message: 'Organization created.' });
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  try {
    const { name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score } = req.params.id ? req.body : {};
    const id = parseInt(req.params.id);

    runSQL(
      `UPDATE organizations SET name='${esc(name)}', plant='${esc(plant)}', code='${esc(code||'')}', address='${esc(address||'')}', fssai_license='${esc(fssai_license)}', fssai_category='${esc(fssai_category||'State')}', contact_person='${esc(contact_person||'')}', designation='${esc(designation||'')}', email='${esc(email||'')}', phone='${esc(phone||'')}', status='${esc(status||'Active')}', compliance_score=${parseInt(compliance_score)||0}, updated_at=datetime('now') WHERE id=${id}`
    );

    const org = queryOne(`SELECT * FROM organizations WHERE id = ${id}`);
    res.json({ organization: org, message: 'Organization updated.' });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  try {
    runSQL(`DELETE FROM organizations WHERE id = ${parseInt(req.params.id)}`);
    res.json({ message: 'Organization deleted.' });
  } catch (err) {
    console.error('Delete organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
