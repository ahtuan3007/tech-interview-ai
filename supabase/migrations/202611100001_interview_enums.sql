BEGIN;
ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'LIVE';
ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'EXPIRED';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'interview_session_mode'
  ) THEN
    CREATE TYPE public.interview_session_mode AS ENUM ('PEER_TO_PEER', 'AI_MOCK_INTERVIEW');
  END IF;
END $$;
COMMIT;
