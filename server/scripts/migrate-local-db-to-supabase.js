const { Client } = require('pg');
require('dotenv').config();

const sourceUrl = process.env.LOCAL_DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error('Set LOCAL_DATABASE_URL and SUPABASE_DATABASE_URL in server/.env before running.');
  process.exit(1);
}

const tables = [
  'departments',
  'academic_years',
  'users',
  'courses',
  'semesters',
  'divisions',
  'subjects',
  'students',
  'faculty',
  'faculty_subject_assignments',
  'student_subjects',
  'subject_choices',
  'attendance',
  'marks',
  'marksheets',
  'study_materials',
  'assignments',
  'assignment_submissions',
  'question_banks',
  'achievements',
  'announcements',
  'audit_logs',
  'feedback',
  'exam_schedules',
  'notifications',
  'timetable_entries',
  'leave_requests',
  'password_reset_tokens',
  'ai_chat_sessions',
  'ai_chat_messages',
  'student_faculty_messages',
  'help_desk_tickets',
  'user_notification_preferences'
];

const source = new Client({ connectionString: sourceUrl });
const target = new Client({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false }
});

async function tableExists(client, table) {
  const r = await client.query(
    'SELECT to_regclass($1) AS regclass',
    [`public.${table}`]
  );
  return Boolean(r.rows[0].regclass);
}

async function countRows(client, table) {
  const r = await client.query(`SELECT COUNT(*)::bigint AS count FROM public."${table}"`);
  return Number(r.rows[0].count);
}

async function getColumns(client, table) {
  const r = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position`,
    [table]
  );
  return r.rows.map(x => x.column_name);
}

async function resetSequences(client, table, columns) {
  if (!columns.includes('id')) return;
  const r = await client.query(
    `SELECT pg_get_serial_sequence($1, 'id') AS seq`,
    [`public.${table}`]
  );
  const seq = r.rows[0].seq;
  if (!seq) return;
  await client.query(
    `SELECT setval($1, COALESCE((SELECT MAX(id) FROM public."${table}"), 1), (SELECT COUNT(*) > 0 FROM public."${table}"))`,
    [seq]
  );
}

async function main() {
  console.log('EduNex local PostgreSQL -> Supabase data migration');
  console.log('Safety: target tables must be empty; this script never deletes target data.');

  await source.connect();
  await target.connect();

  const sourceVersion = (await source.query('SHOW server_version')).rows[0].server_version;
  const targetVersion = (await target.query('SHOW server_version')).rows[0].server_version;
  console.log(`Source PostgreSQL: ${sourceVersion}`);
  console.log(`Target PostgreSQL: ${targetVersion}`);

  for (const table of tables) {
    if (!(await tableExists(source, table))) {
      console.log(`SKIP ${table}: not present in source`);
      continue;
    }
    if (!(await tableExists(target, table))) {
      throw new Error(`Target table public.${table} does not exist`);
    }
    const targetCount = await countRows(target, table);
    if (targetCount !== 0) {
      throw new Error(`ABORT: target public.${table} already contains ${targetCount} rows. No data was changed.`);
    }
  }

  await target.query('BEGIN');
  try {
    for (const table of tables) {
      const sourceCount = await countRows(source, table);
      if (!sourceCount) {
        console.log(`SKIP ${table}: 0 source rows`);
        continue;
      }

      const columns = await getColumns(source, table);
      const targetColumns = await getColumns(target, table);
      const commonColumns = columns.filter(c => targetColumns.includes(c));
      if (!commonColumns.length) {
        console.log(`SKIP ${table}: no common columns`);
        continue;
      }

      const sourceRows = (await source.query(
        `SELECT ${commonColumns.map(c => `"${c}"`).join(', ')} FROM public."${table}"`
      )).rows;

      const quotedColumns = commonColumns.map(c => `"${c}"`).join(', ');
      for (const row of sourceRows) {
        const placeholders = commonColumns.map((_, i) => `$${i + 1}`).join(', ');
        const values = commonColumns.map(c => row[c]);
        await target.query(
          `INSERT INTO public."${table}" (${quotedColumns}) VALUES (${placeholders})`,
          values
        );
      }

      await resetSequences(target, table, targetColumns);
      console.log(`COPIED ${table}: ${sourceRows.length} rows`);
    }

    await target.query('COMMIT');
  } catch (error) {
    await target.query('ROLLBACK');
    throw error;
  }

  console.log('Migration completed successfully.');
  console.log('Next: verify row counts, then migrate Supabase Storage files separately.');
}

main()
  .catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([source.end(), target.end()]);
  });
