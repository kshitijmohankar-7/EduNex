const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');

// Public self-registration is intentionally disabled. EduNex accounts are provisioned by an administrator.
async function register(req, res) {
  return res.status(403).json({
    error: 'Public registration is disabled. Contact your EduNex administrator for a login ID and password.',
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'login ID and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE', [String(email).trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid login ID or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid login ID or password' });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    });
  } catch (err) { next(err); }
}

async function logout(req, res) {
  res.json({ message: 'Logged out successfully' });
}

module.exports = { register, login, logout };
