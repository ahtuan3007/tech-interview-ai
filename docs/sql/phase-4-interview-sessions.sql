-- REVIEW DRAFT ONLY. Not executed by the application or the implementation agent.
-- Target: the existing public.interview_sessions table and public.session_status enum.
-- Review existing constraints, policies, triggers and column grants before applying.
-- Historical sessions are not assigned invented questions or modes.

-- Commit enum additions before using their values in later statements.
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

BEGIN;
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES public.questions(id),
  ADD COLUMN IF NOT EXISTS session_mode public.interview_session_mode;
ALTER TABLE public.interview_sessions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'SCHEDULED';

-- NOT VALID preserves historical rows but enforces the contract for new writes.
-- Backfill historical sessions explicitly before validating these constraints.
ALTER TABLE public.interview_sessions
  ADD CONSTRAINT phase4_question_required CHECK (question_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT phase4_mode_required CHECK (session_mode IS NOT NULL) NOT VALID,
  ADD CONSTRAINT phase4_schedule_required CHECK (scheduled_at IS NOT NULL) NOT VALID,
  ADD CONSTRAINT phase4_participants_valid CHECK (
    interviewee_id IS NOT NULL AND (
      (session_mode = 'AI_MOCK_INTERVIEW' AND interviewer_id IS NULL) OR
      (session_mode = 'PEER_TO_PEER' AND interviewer_id IS NOT NULL AND interviewer_id <> interviewee_id)
    )
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS phase4_sessions_candidate_time
  ON public.interview_sessions (interviewee_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS phase4_sessions_interviewer_time
  ON public.interview_sessions (interviewer_id, scheduled_at DESC);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.interview_sessions TO authenticated;
GRANT INSERT (interviewer_id, interviewee_id, question_id, session_mode, status, scheduled_at)
  ON public.interview_sessions TO authenticated;
REVOKE UPDATE ON public.interview_sessions FROM authenticated;
GRANT UPDATE (status) ON public.interview_sessions TO authenticated;

-- A restrictive policy prevents a pre-existing permissive policy from broadening access.
CREATE POLICY phase4_read_scope ON public.interview_sessions AS RESTRICTIVE FOR SELECT TO public
  USING (auth.uid() = interviewee_id OR auth.uid() = interviewer_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));
CREATE POLICY phase4_read_participants ON public.interview_sessions FOR SELECT TO authenticated
  USING (auth.uid() = interviewee_id OR auth.uid() = interviewer_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY phase4_insert_scope ON public.interview_sessions AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (auth.uid() = interviewee_id AND status = 'SCHEDULED'
    AND scheduled_at >= now() - interval '1 minute' AND scheduled_at <= now() + interval '366 days');
CREATE POLICY phase4_insert_own ON public.interview_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = interviewee_id AND status = 'SCHEDULED');

CREATE POLICY phase4_update_scope ON public.interview_sessions AS RESTRICTIVE FOR UPDATE TO public
  USING (auth.uid() = interviewee_id OR auth.uid() = interviewer_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ))
  WITH CHECK (auth.uid() = interviewee_id OR auth.uid() = interviewer_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));
CREATE POLICY phase4_update_participants ON public.interview_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = interviewee_id OR auth.uid() = interviewer_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Prevent direct REST updates from reassigning participants or bypassing the start time.
CREATE OR REPLACE FUNCTION public.phase4_guard_session_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.id, NEW.interviewer_id, NEW.interviewee_id, NEW.question_id, NEW.session_mode, NEW.scheduled_at, NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id, OLD.interviewer_id, OLD.interviewee_id, OLD.question_id, OLD.session_mode, OLD.scheduled_at, OLD.created_at) THEN
    RAISE EXCEPTION 'Session identity, participants and schedule are immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'SCHEDULED' AND NEW.status = 'LIVE' AND NEW.scheduled_at <= now() THEN RETURN NEW; END IF;
  IF OLD.status = 'LIVE' AND NEW.status = 'COMPLETED' THEN RETURN NEW; END IF;
  IF OLD.status IN ('SCHEDULED', 'LIVE') AND NEW.status = 'EXPIRED' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Invalid session status transition' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER phase4_guard_session_transition BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.phase4_guard_session_transition();
COMMIT;

-- After reviewing/backfilling historical records, validate the constraints and set
-- question_id/session_mode NOT NULL in a separate change. Do not invent backfill data.
-- This draft is intended for a single reviewed application; policy/constraint names
-- are deliberately not dropped/replaced if already installed.
