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

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

// Get conversations list (admin sees all, members see only admin)
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    let conversations;

    if (isAdmin) {
      conversations = queryAll(`
        SELECT u.id, u.name, u.email, u.role,
          (SELECT message FROM messages WHERE (sender_id = u.id AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_time,
          (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ${userId} AND read = 0) as unread
        FROM users u
        WHERE u.organization_id = ? AND u.id != ? AND u.status = 'active'
        ORDER BY last_time DESC
      `, [req.user.organization_id, userId]);
    } else {
      const admin = queryOne(
        `SELECT id, name, email, role FROM users WHERE organization_id = ? AND role IN ('admin','super_admin') AND id != ? AND status = 'active' LIMIT 1`,
        [req.user.organization_id, userId]
      );
      if (!admin) return res.json({ conversations: [] });
      conversations = queryAll(`
        SELECT u.id, u.name, u.email, u.role,
          (SELECT message FROM messages WHERE (sender_id = u.id AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE (sender_id = u.id AND receiver_id = ${userId}) OR (sender_id = ${userId} AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) as last_time,
          (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ${userId} AND read = 0) as unread
        FROM users u WHERE u.id = ?
      `, [admin.id]);
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
      `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC`,
      [userId, otherId, otherId, userId]
    );
    // Mark as read
    runSQL(`UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?`, [otherId, userId]);
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
      `INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
      [req.user.id, receiver_id, message]
    );
    res.status(201).json({ message: 'Message sent.' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
