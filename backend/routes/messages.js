const express = require('express');
const { queryAll, queryOne, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organization_id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    let conversations = [];

    if (isAdmin) {
      const orgName = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
      let members = [];
      if (orgName) {
        const allOrgIds = await queryAll(`SELECT id FROM organizations WHERE name = $1`, [orgName.name]);
        const orgIds = allOrgIds.map(o => o.id);
        if (orgIds.length) {
          members = await queryAll(
            `SELECT u.id, u.name, u.email, u.role FROM users u
             WHERE u.organization_id = ANY($1) AND u.id != $2 AND u.status = 'active'`,
            [orgIds, userId]
          );
        }
      }
      for (const m of members) {
        const last = await queryOne(
          `SELECT message, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1`,
          [m.id, userId]
        );
        const unread = await queryOne(
          `SELECT COUNT(*)::int as c FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND read = 0`,
          [m.id, userId]
        );
        conversations.push({ ...m, last_message: last?.message || null, last_time: last?.created_at || null, unread: unread?.c || 0 });
      }
      conversations.sort((a, b) => (b.last_time || '').localeCompare(a.last_time || ''));
    } else {
      const orgName = await queryOne(`SELECT name FROM organizations WHERE id = $1`, [orgId]);
      let admin = null;
      if (orgName) {
        const allOrgIds = await queryAll(`SELECT id FROM organizations WHERE name = $1`, [orgName.name]);
        const orgIds = allOrgIds.map(o => o.id);
        if (orgIds.length) {
          admin = await queryOne(
            `SELECT u.id, u.name, u.email, u.role FROM users u
             WHERE u.organization_id = ANY($1) AND u.role IN ('admin','super_admin') AND u.id != $2 AND u.status = 'active' LIMIT 1`,
            [orgIds, userId]
          );
        }
      }
      if (admin) {
        const last = await queryOne(
          `SELECT message, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1`,
          [admin.id, userId]
        );
        const unread = await queryOne(
          `SELECT COUNT(*)::int as c FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND read = 0`,
          [admin.id, userId]
        );
        conversations = [{ ...admin, last_message: last?.message || null, last_time: last?.created_at || null, unread: unread?.c || 0 }];
      }
    }
    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = parseInt(req.params.userId);
    const messages = await queryAll(
      `SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC`,
      [userId, otherId]
    );
    await runSQL(`UPDATE messages SET read = 1 WHERE sender_id = $1 AND receiver_id = $2`, [otherId, userId]);
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) return res.status(400).json({ error: 'receiver_id and message are required.' });
    await runSQL(
      `INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)`,
      [req.user.id, receiver_id, message]
    );
    res.status(201).json({ message: 'Message sent.' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
