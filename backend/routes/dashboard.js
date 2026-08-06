const express = require('express');
const { queryAll, queryOne } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const orgId = req.user.organization_id;

    let totalOrgs;
    if (isSuperAdmin) {
      const row = await queryOne("SELECT COUNT(*)::int as c FROM organizations");
      totalOrgs = row ? row.c : 0;
    } else {
      totalOrgs = orgId ? 1 : 0;
    }

    let activeOrgs;
    if (isSuperAdmin) {
      const row = await queryOne("SELECT COUNT(*)::int as c FROM organizations WHERE status='Active'");
      activeOrgs = row ? row.c : 0;
    } else {
      activeOrgs = orgId ? 1 : 0;
    }

    let totalAudits;
    let pendingAudits;
    let openIncidents;
    let openCapa;

    if (orgId) {
      const ta = await queryOne("SELECT COUNT(*)::int as c FROM audits WHERE organization_id = $1", [orgId]);
      totalAudits = ta ? ta.c : 0;
      const pa = await queryOne("SELECT COUNT(*)::int as c FROM audits WHERE organization_id = $1 AND status='Scheduled'", [orgId]);
      pendingAudits = pa ? pa.c : 0;
      const oi = await queryOne("SELECT COUNT(*)::int as c FROM incidents WHERE organization_id = $1 AND status IN ('Open','In Progress')", [orgId]);
      openIncidents = oi ? oi.c : 0;
      const oc = await queryOne("SELECT COUNT(*)::int as c FROM capa WHERE organization_id = $1 AND status IN ('Open','In Progress')", [orgId]);
      openCapa = oc ? oc.c : 0;
    } else {
      const ta = await queryOne("SELECT COUNT(*)::int as c FROM audits");
      totalAudits = ta ? ta.c : 0;
      const pa = await queryOne("SELECT COUNT(*)::int as c FROM audits WHERE status='Scheduled'");
      pendingAudits = pa ? pa.c : 0;
      const oi = await queryOne("SELECT COUNT(*)::int as c FROM incidents WHERE status IN ('Open','In Progress')");
      openIncidents = oi ? oi.c : 0;
      const oc = await queryOne("SELECT COUNT(*)::int as c FROM capa WHERE status IN ('Open','In Progress')");
      openCapa = oc ? oc.c : 0;
    }

    let avgScore;
    if (orgId) {
      const row = await queryOne("SELECT AVG(compliance_score) as avg FROM organizations WHERE id = $1", [orgId]);
      avgScore = row ? row.avg || 0 : 0;
    } else {
      const row = await queryOne("SELECT AVG(compliance_score) as avg FROM organizations");
      avgScore = row ? row.avg || 0 : 0;
    }

    let recentAudits;
    let recentIncidents;
    if (orgId) {
      recentAudits = await queryAll(`SELECT a.*, o.name as org_name FROM audits a
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE a.organization_id = $1
        ORDER BY a.created_at DESC LIMIT 5`, [orgId]);
      recentIncidents = await queryAll(`SELECT i.*, o.name as org_name FROM incidents i
        LEFT JOIN organizations o ON i.organization_id = o.id
        WHERE i.organization_id = $1
        ORDER BY i.created_at DESC LIMIT 5`, [orgId]);
    } else {
      recentAudits = await queryAll(`SELECT a.*, o.name as org_name FROM audits a
        LEFT JOIN organizations o ON a.organization_id = o.id
        ORDER BY a.created_at DESC LIMIT 5`);
      recentIncidents = await queryAll(`SELECT i.*, o.name as org_name FROM incidents i
        LEFT JOIN organizations o ON i.organization_id = o.id
        ORDER BY i.created_at DESC LIMIT 5`);
    }

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
