const pool = require('../config/db');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function indexMaterial(material) {
  const response = await fetch(`${AI_SERVICE_URL}/index-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject_id: material.subject_id,
      title: material.title,
      file_path: material.file_path,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || `AI service returned ${response.status}`);
  }

  return Number(data.chunks_indexed || 0);
}

async function main() {
  const result = await pool.query(`
    SELECT id, subject_id, title, file_path
    FROM study_materials
    WHERE file_path IS NOT NULL
    ORDER BY id
  `);

  console.log(`Found ${result.rows.length} study material(s) to index.`);

  let totalChunks = 0;
  let failed = 0;

  for (const material of result.rows) {
    try {
      const chunks = await indexMaterial(material);
      totalChunks += chunks;
      console.log(`[OK] #${material.id} ${material.title}: ${chunks} chunks`);
    } catch (error) {
      failed += 1;
      console.error(`[FAILED] #${material.id} ${material.title}: ${error.message}`);
    }
  }

  console.log(`Finished. Indexed ${totalChunks} chunks. Failed materials: ${failed}.`);
  await pool.end();

  if (failed > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error('Reindex failed:', error);
  await pool.end();
  process.exit(1);
});
