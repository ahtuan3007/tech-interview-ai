BEGIN;
-- The existing sessions table was empty. Fail atomically if data needs a backfill.
ALTER TABLE public.interview_sessions
  ADD COLUMN question_id uuid NOT NULL REFERENCES public.questions(id),
  ADD COLUMN session_mode public.interview_session_mode NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN scheduled_at SET NOT NULL,
  ADD CONSTRAINT phase4_participants_valid CHECK (
    (session_mode = 'AI_MOCK_INTERVIEW' AND interviewer_id IS NULL) OR
    (session_mode = 'PEER_TO_PEER' AND interviewer_id IS NOT NULL AND interviewer_id <> interviewee_id)
  );

-- Keep role assignments in trusted server/administrator hands.
CREATE FUNCTION public.phase4_guard_profile_role() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF (TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'INTERVIEWEE') OR
       (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Profile role is managed by administrators' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER phase4_guard_profile_role BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.phase4_guard_profile_role();

CREATE INDEX IF NOT EXISTS phase4_sessions_candidate_time
  ON public.interview_sessions (interviewee_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS phase4_sessions_interviewer_time
  ON public.interview_sessions (interviewer_id, scheduled_at DESC);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.interview_sessions TO authenticated;
REVOKE INSERT ON public.interview_sessions FROM authenticated;
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
CREATE FUNCTION public.phase4_guard_session_transition()
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
