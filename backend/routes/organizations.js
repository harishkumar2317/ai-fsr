const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql = "SELECT * FROM organizations ORDER BY created_at DESC";
    let params = [];
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.organization_id) {
      sql = `SELECT * FROM organizations WHERE id = $1`;
      params = [req.user.organization_id];
    }
    const orgs = await queryAll(sql, params);
    res.json({ organizations: orgs, total: orgs.length });
  } catch (err) {
    console.error('Get organizations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const org = await queryOne(`SELECT * FROM organizations WHERE id = $1`, [parseInt(req.params.id)]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });
    res.json({ organization: org });
  } catch (err) {
    console.error('Get organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score } = req.body;
    if (!name || !plant || !fssai_license) return res.status(400).json({ error: 'Name, plant, and FSSAI license are required.' });

    const r = await runSQL(
      `INSERT INTO organizations (name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [name, plant, code||'', address||'', fssai_license, fssai_category||'State', contact_person||'', designation||'', email||'', phone||'', status||'Active', parseInt(compliance_score)||0]
    );
    const org = r.rows[0];

    if (org && !req.user.organization_id) {
      await runSQL(`UPDATE users SET organization_id = $1 WHERE id = $2`, [org.id, req.user.id]);
    }

    res.status(201).json({ organization: org, message: 'Organization created.' });
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score } = req.body;
    const id = parseInt(req.params.id);

    const r = await runSQL(
      `UPDATE organizations SET name=$1, plant=$2, code=$3, address=$4, fssai_license=$5, fssai_category=$6, contact_person=$7, designation=$8, email=$9, phone=$10, status=$11, compliance_score=$12, updated_at=NOW() WHERE id=$13 RETURNING *`,
      [name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, parseInt(compliance_score)||0, id]
    );
    res.json({ organization: r.rows[0], message: 'Organization updated.' });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await runSQL(`DELETE FROM organizations WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ message: 'Organization deleted.' });
  } catch (err) {
    console.error('Delete organization error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
