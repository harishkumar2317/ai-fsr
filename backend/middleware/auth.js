const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-fsr-fallback-secret-2026';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const result = db.exec("SELECT id, name, email, role, organization_id, status FROM users WHERE id = " + decoded.userId);
    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }
    const user = {};
    const cols = result[0].columns;
    const vals = result[0].values[0];
    cols.forEach((c, i) => user[c] = vals[i]);
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

function logActivity(userId, action, details, ipAddress) {
  try {
    const db = getDB();
    db.run(
      "INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
      [userId, action, details, ipAddress || '']
    );
  } catch (e) {}
}

module.exports = { authenticate, authorize, logActivity };