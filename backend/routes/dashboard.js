const express = require('express');
const { getDB } = require('../db/database');
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

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

router.get('/', authenticate, (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const orgId = req.user.organization_id;
    const wf = orgId ? ` WHERE organization_id = ${orgId}` : '';

    const totalOrgs = isSuperAdmin
      ? (queryOne("SELECT COUNT(*) as c FROM organizations") || {}).c || 0
      : (orgId ? 1 : 0);
    const activeOrgs = isSuperAdmin
      ? (queryOne("SELECT COUNT(*) as c FROM organizations WHERE status='Active'") || {}).c || 0
      : (orgId ? 1 : 0);
    const totalAudits = (queryOne("SELECT COUNT(*) as c FROM audits" + wf) || {}).c || 0;
    const pendingAudits = (queryOne("SELECT COUNT(*) as c FROM audits" + (wf ? wf + " AND status='Scheduled'" : " WHERE status='Scheduled'")) || {}).c || 0;
    const openIncidents = (queryOne("SELECT COUNT(*) as c FROM incidents" + (wf ? wf + " AND status IN ('Open','In Progress')" : " WHERE status IN ('Open','In Progress')")) || {}).c || 0;
    const openCapa = (queryOne("SELECT COUNT(*) as c FROM capa" + (wf ? wf + " AND status IN ('Open','In Progress')" : " WHERE status IN ('Open','In Progress')")) || {}).c || 0;
    const avgScore = (queryOne("SELECT AVG(compliance_score) as avg FROM organizations" + (orgId ? ` WHERE id=${orgId}` : '')) || {}).avg || 0;

    const recentAudits = queryAll(`SELECT a.*, o.name as org_name FROM audits a
      LEFT JOIN organizations o ON a.organization_id = o.id${wf}
      ORDER BY a.created_at DESC LIMIT 5`);

    const recentIncidents = queryAll(`SELECT i.*, o.name as org_name FROM incidents i
      LEFT JOIN organizations o ON i.organization_id = o.id${wf}
      ORDER BY i.created_at DESC LIMIT 5`);

    res.json({
      stats: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalAudits,
        pendingAudits,
        openIncidents,
        openCapa,
        complianceScore: Math.round(avgScore)
      },
      recentAudits,
      recentIncidents
    });
  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;