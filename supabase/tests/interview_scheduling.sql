-- Run as postgres against a project containing a candidate, an admin and a question.
-- All fixtures, including transitions and profile writes, are rolled back.
BEGIN;
DO $$
DECLARE candidate uuid; administrator uuid; question uuid;
BEGIN
  SELECT id INTO STRICT candidate FROM public.profiles WHERE role = 'INTERVIEWEE' LIMIT 1;
  SELECT id INTO STRICT administrator FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  SELECT id INTO STRICT question FROM public.questions LIMIT 1;
  PERFORM set_config('qa.candidate', candidate::text, true),
          set_config('qa.admin', administrator::text, true),
          set_config('qa.question', question::text, true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE c uuid := current_setting('qa.candidate'); a uuid := current_setting('qa.admin');
        q uuid := current_setting('qa.question'); ai uuid; future_room uuid; peer uuid; n integer;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text,true);
  IF auth.uid() IS DISTINCT FROM c THEN RAISE EXCEPTION 'candidate identity missing'; END IF;
  INSERT INTO public.interview_sessions (interviewee_id,question_id,session_mode,scheduled_at)
    VALUES (c,q,'AI_MOCK_INTERVIEW',now()) RETURNING id INTO STRICT ai;
  INSERT INTO public.interview_sessions (interviewee_id,question_id,session_mode,scheduled_at)
    VALUES (c,q,'AI_MOCK_INTERVIEW',now()+interval '1 hour') RETURNING id INTO STRICT future_room;
  BEGIN
    UPDATE public.interview_sessions SET status='LIVE' WHERE id=future_room;
    RAISE EXCEPTION 'future room opened';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.interview_sessions SET status='LIVE' WHERE id=ai AND status='SCHEDULED';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'candidate could not open AI room'; END IF;
  UPDATE public.interview_sessions SET status='LIVE' WHERE id=ai AND status='SCHEDULED';
  IF FOUND THEN RAISE EXCEPTION 'repeat entry changed state'; END IF;
  UPDATE public.profiles SET full_name=full_name WHERE id=c;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile editing unavailable'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text,true);
  IF NOT EXISTS (SELECT FROM public.interview_sessions WHERE id=ai AND status='LIVE') THEN
    RAISE EXCEPTION 'admin cannot read unrelated room'; END IF;
  UPDATE public.interview_sessions SET status='COMPLETED' WHERE id=ai;
  IF NOT FOUND THEN RAISE EXCEPTION 'admin cannot close room'; END IF;
  INSERT INTO public.interview_sessions (interviewee_id,interviewer_id,question_id,session_mode,scheduled_at)
    VALUES (a,c,q,'PEER_TO_PEER',now()) RETURNING id INTO STRICT peer;

  PERFORM set_config('request.jwt.claims', json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  IF EXISTS (SELECT FROM public.interview_sessions WHERE id IN (peer,ai,future_room)) THEN
    RAISE EXCEPTION 'outsider sees room'; END IF;
  UPDATE public.interview_sessions SET status='LIVE' WHERE id=peer;
  IF FOUND THEN RAISE EXCEPTION 'outsider opened room'; END IF;
  BEGIN
    INSERT INTO public.interview_sessions (interviewee_id,question_id,session_mode,scheduled_at)
      VALUES (c,q,'AI_MOCK_INTERVIEW',now());
    RAISE EXCEPTION 'outsider scheduled for someone else';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text,true);
  UPDATE public.interview_sessions SET status='LIVE' WHERE id=peer AND status='SCHEDULED';
  IF NOT FOUND THEN RAISE EXCEPTION 'assigned interviewer cannot open room'; END IF;
  BEGIN
    UPDATE public.interview_sessions SET status='LIVE' WHERE id=ai;
    RAISE EXCEPTION 'completed room reopened';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'PASS: scheduling, room access and transitions; fixtures rolled back' AS result;
