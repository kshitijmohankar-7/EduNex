const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register
// In production this should be restricted to admins for faculty/admin accounts.
async function register(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'email, password, fullName and role are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name`,
      [email, passwordHash, role, fullName]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
// Stateless JWT: logout is handled client-side by discarding the token.
// This endpoint exists for symmetry / future token-blacklist support.
async function logout(req, res) {
  res.json({ message: 'Logged out successfully' });
}

module.exports = { register, login, logout };
