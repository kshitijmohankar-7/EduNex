const express = require('express');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const pool = require('../config/db');

// GET /api/subjects
// Used by faculty to select a subject when creating an assignment.
router.get(
  '/',
  authenticate,
  authorize('faculty'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, code, credits
         FROM subjects
         ORDER BY id`
      );

      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;