require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
  const [oldEmail, newEmail, password, fullName] = process.argv.slice(2);

  if (!oldEmail || !newEmail || !password) {
    console.error('Usage: node scripts/update-login-credentials.js <oldEmail> <newEmail> <password> [fullName]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE users
       SET email = $1, password_hash = $2, full_name = COALESCE($3, full_name), updated_at = NOW()
       WHERE LOWER(email) = LOWER($4)
       RETURNING id, email, role, full_name`,
      [newEmail.trim(), hash, fullName || null, oldEmail.trim()]
    );

    if (result.rowCount === 0) {
      throw new Error(`User not found: ${oldEmail}`);
    }

    await client.query('COMMIT');
    console.log(`Updated ${oldEmail} -> ${result.rows[0].email} (${result.rows[0].role})`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Credential update failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Credential update failed:', error.message);
  process.exitCode = 1;
});
