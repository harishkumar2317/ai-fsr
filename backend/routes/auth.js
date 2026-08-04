const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, runSQL } = require('../db/database');
const { authenticate, logActivity } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ai-fsr-fallback-secret-2026';

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

router.post('/signup', (req, res) => {
  try {
    const { email, password, name, organization } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = queryOne("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    let orgId = null;

    if (organization) {
      runSQL(
        "INSERT INTO organizations (name, plant, fssai_license, status, compliance_score) VALUES (?, ?, ?, ?, ?)",
        [organization, 'Main Plant', 'PENDING', 'Pending', 0]
      );
      const newOrg = queryOne("SELECT id FROM organizations ORDER BY id DESC LIMIT 1");
      orgId = newOrg ? newOrg.id : null;
    }

    runSQL(
      "INSERT INTO users (name, email, password, role, organization_id) VALUES (?, ?, ?, ?, ?)",
      [name, email, hash, organization ? 'admin' : 'viewer', orgId]
    );

    const user = queryOne("SELECT id, name, email, role, organization_id FROM users WHERE email = ?", [email]);
    const org = orgId ? queryOne("SELECT name, plant FROM organizations WHERE id = ?", [orgId]) : null;

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logActivity(user.id, 'signup', 'New account created', req.ip);

    res.status(201).json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        organization_id: orgId,
        organization: org ? org.name : null,
        plant: org ? org.plant : null
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = queryOne("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Contact administrator.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logActivity(user.id, 'login', 'User logged in', req.ip);

    const org = user.organization_id ? queryOne("SELECT name, plant FROM organizations WHERE id = ?", [user.organization_id]) : null;

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organization_id: user.organization_id,
        organization: org ? org.name : null,
        plant: org ? org.plant : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/verify', authenticate, (req, res) => {
  const org = req.user.organization_id
    ? queryOne("SELECT name, plant FROM organizations WHERE id = ?", [req.user.organization_id])
    : null;

  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organization_id: req.user.organization_id,
      organization: org ? org.name : null,
      plant: org ? org.plant : null
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  const org = req.user.organization_id
    ? queryOne("SELECT * FROM organizations WHERE id = ?", [req.user.organization_id])
    : null;

  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      organization_id: req.user.organization_id,
      organization: org,
      status: 'active'
    }
  });
});

router.post('/change-password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    const user = queryOne("SELECT password FROM users WHERE id = ?", [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    runSQL("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hash, req.user.id]);

    logActivity(req.user.id, 'password_change', 'Password changed', req.ip);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/reset-password', (req, res) => {
  try {
    const { email, newPassword, reset_token } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!reset_token) {
      return res.status(400).json({ error: 'Reset token is required. Please complete OTP verification first.' });
    }

    try {
      const decoded = jwt.verify(reset_token, JWT_SECRET);
      if (decoded.email !== email || decoded.purpose !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid reset token.' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Reset token expired or invalid. Please start over.' });
    }

    const user = queryOne("SELECT id FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    runSQL("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hash, user.id]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const forgotOtpStore = {};

router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = queryOne("SELECT id FROM users WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ error: 'No account found with this email.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    forgotOtpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    console.log(`[FORGOT PASSWORD] OTP for ${email}: ${otp}`);

    res.json({ message: 'Reset code sent to your email.', _dev_otp: otp });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/verify-reset-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const record = forgotOtpStore[email];
    if (!record) return res.status(400).json({ error: 'No reset request found. Please try again.' });
    if (Date.now() > record.expires) { delete forgotOtpStore[email]; return res.status(400).json({ error: 'OTP expired. Please request a new one.' }); }
    if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

    const resetToken = jwt.sign({ email, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });
    delete forgotOtpStore[email];

    res.json({ message: 'OTP verified.', reset_token: resetToken });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;