const express = require('express');
const { getDB, runSQL } = require('../db/database');
const { authenticate } = require('../middleware/auth');
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

// Get conversations list (MUST be before /:userId to avoid route conflict)
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organization_id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    let conversations = [];

    if (isAdmin) {
      const orgName = queryOne(`SELECT name FROM organizations WHERE id = ${orgId}`);
      const members = orgName ? queryAll(
        `SELECT u.id, u.name, u.email, u.role FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE o.name = '${esc(orgName.name)}' AND u.id != ${userId} AND u.status = 'active'`
      ) : [];
      conversations = members.map(m => {
        const last = queryOne(
          `SELECT message, created_at FROM messages WHERE (sender_id = ${m.id} AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = ${m.id}) ORDER BY created_at DESC LIMIT 1`
        );
        const unread = queryOne(
          `SELECT COUNT(*) as c FROM messages WHERE sender_id = ${m.id} AND receiver_id = ${userId} AND read = 0`
        );
        return { ...m, last_message: last?.message || null, last_time: last?.created_at || null, unread: unread?.c || 0 };
      });
      conversations.sort((a, b) => (b.last_time || '').localeCompare(a.last_time || ''));
    } else {
      const orgName = queryOne(`SELECT name FROM organizations WHERE id = ${orgId}`);
      const admin = orgName ? queryOne(
        `SELECT u.id, u.name, u.email, u.role FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE o.name = '${esc(orgName.name)}' AND u.role IN ('admin','super_admin') AND u.id != ${userId} AND u.status = 'active' LIMIT 1`
      ) : null;
      if (admin) {
        const last = queryOne(
          `SELECT message, created_at FROM messages WHERE (sender_id = ${admin.id} AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = ${admin.id}) ORDER BY created_at DESC LIMIT 1`
        );
        const unread = queryOne(
          `SELECT COUNT(*) as c FROM messages WHERE sender_id = ${admin.id} AND receiver_id = ${userId} AND read = 0`
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

// Get messages with a specific user
router.get('/:userId', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = parseInt(req.params.userId);
    const messages = queryAll(
      `SELECT * FROM messages WHERE (sender_id = ${userId} AND receiver_id = ${otherId}) OR (sender_id = ${otherId} AND receiver_id = ${userId}) ORDER BY created_at ASC`
    );
    runSQL(`UPDATE messages SET read = 1 WHERE sender_id = ${otherId} AND receiver_id = ${userId}`);
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Send a message
router.post('/', authenticate, (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) {
      return res.status(400).json({ error: 'receiver_id and message are required.' });
    }
    runSQL(
      `INSERT INTO messages (sender_id, receiver_id, message) VALUES (${req.user.id}, ${receiver_id}, '${message.replace(/'/g, "''")}')`
    );
    res.status(201).json({ message: 'Message sent.' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
