import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { canAccessInterview, interviewDatabaseError, SESSION_COLUMNS, UUID_PATTERN } from './validation';
import type { InterviewSession } from '@/types/database';

export async function getInterviewAccess(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { kind: 'unauthenticated' as const };
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) return { kind: 'not-found' as const };

  const { data, error } = await supabase.from('interview_sessions').select(SESSION_COLUMNS).eq('id', id).maybeSingle();
  if (error) return { kind: 'unavailable' as const, error: interviewDatabaseError(error) };
  if (!data) return { kind: 'not-found' as const };
  const session = data as InterviewSession;
  if (!session.question_id || !['PEER_TO_PEER', 'AI_MOCK_INTERVIEW'].includes(session.session_mode) ||
    !['SCHEDULED', 'LIVE', 'COMPLETED', 'EXPIRED'].includes(session.status) || !Number.isFinite(Date.parse(session.scheduled_at))) {
    return { kind: 'unavailable' as const, error: 'Phiên dùng schema cũ hoặc dữ liệu chưa đầy đủ. Vui lòng liên hệ quản trị viên.' };
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!canAccessInterview(session, user.id, profile?.role)) return { kind: 'not-found' as const };
  return { kind: 'allowed' as const, supabase, userId: user.id, session, loadedAt: Date.now() };
}
