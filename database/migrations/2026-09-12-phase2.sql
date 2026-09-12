BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(300),
  source_type VARCHAR(60),
  source_id INTEGER,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_source
  ON notifications(user_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE study_materials
  ADD COLUMN IF NOT EXISTS rag_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rag_chunks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rag_error TEXT,
  ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_study_materials_rag_status ON study_materials(rag_status);

COMMIT;
