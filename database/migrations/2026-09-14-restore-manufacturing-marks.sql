BEGIN;

-- Phase 3 introduced the unpublished/draft marks workflow. Restore the
-- previously visible manufacturing subject marks that were unintentionally
-- left unpublished during the transition.
UPDATE marks m
SET published = TRUE
FROM subjects s
WHERE s.id = m.subject_id
  AND LOWER(s.name) LIKE '%manufacturing%'
  AND m.published = FALSE;

-- Once a mark has been published, ordinary mark edits must not silently hide
-- it again. New marks still default to unpublished through the application.
CREATE OR REPLACE FUNCTION edunex_preserve_published_mark()
RETURNS trigger AS $$
BEGIN
  IF OLD.published = TRUE AND NEW.published = FALSE THEN
    NEW.published := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_edunex_preserve_published_mark ON marks;
CREATE TRIGGER trg_edunex_preserve_published_mark
BEFORE UPDATE ON marks
FOR EACH ROW
EXECUTE FUNCTION edunex_preserve_published_mark();

COMMIT;
