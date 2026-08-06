const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-fsr-fallback-secret-2026';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await queryOne(`SELECT id, name, email, role, organization_id, status FROM users WHERE id = $1`, [decoded.userId]);
    if (!user) return res.status(401).json({ error: 'Invalid token. User not found.' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions.' });
    next();
  };
}

module.exports = { authenticate, authorize };
