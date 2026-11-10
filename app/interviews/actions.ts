'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getInterviewAccess } from '@/utils/interviews/server';
import { interviewDatabaseError, validateSchedule, type ScheduleInterviewInput } from '@/utils/interviews/validation';

export async function scheduleInterview(input: ScheduleInterviewInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false as const, error: 'Bạn cần đăng nhập để đặt lịch.' };
  const now = Date.now();
  const errorMessage = validateSchedule(input, user.id, now);
  if (errorMessage) return { success: false as const, error: errorMessage };

  const { data: question, error: questionError } = await supabase.from('questions').select('id').eq('id', input.question_id).maybeSingle();
  if (questionError || !question) return { success: false as const, error: 'Đề bài không còn khả dụng. Hãy chọn đề khác.' };

  const { data, error } = await supabase.from('interview_sessions').insert({
    interviewer_id: input.session_mode === 'AI_MOCK_INTERVIEW' ? null : input.interviewer_id,
    interviewee_id: user.id,
    question_id: input.question_id,
    session_mode: input.session_mode,
    status: 'SCHEDULED',
    scheduled_at: new Date(input.start_now ? now : input.scheduled_at).toISOString(),
  }).select('id').single();
  if (error) return { success: false as const, error: interviewDatabaseError(error) };
  if (!data?.id) return { success: false as const, error: 'Không tạo được phòng phỏng vấn. Vui lòng thử lại.' };
  revalidatePath('/interviews');
  return { success: true as const, id: data.id as string, roomPath: `/room/${data.id}`, lobbyPath: `/room/${data.id}/lobby` };
}

export async function enterInterview(id: string) {
  const access = await getInterviewAccess(id);
  if (access.kind !== 'allowed') return {
    success: false as const,
    error: access.kind === 'unavailable' ? access.error : 'Phiên không tồn tại hoặc bạn không có quyền tham gia.',
  };
  const { session, supabase } = access;
  if (!['SCHEDULED', 'LIVE'].includes(session.status)) return { success: false as const, error: 'Phiên đã kết thúc hoặc hết hạn.' };
  const now = Date.now();
  if (!Number.isFinite(Date.parse(session.scheduled_at)) || Date.parse(session.scheduled_at) > now) {
    return { success: false as const, error: 'Chưa đến giờ hẹn. Vui lòng chờ tại phòng chờ.' };
  }

  if (session.status === 'SCHEDULED') {
    const { data, error } = await supabase.from('interview_sessions').update({ status: 'LIVE' })
      .eq('id', id).eq('status', 'SCHEDULED').lte('scheduled_at', new Date(now).toISOString()).select('id').maybeSingle();
    if (error) return { success: false as const, error: interviewDatabaseError(error) };
    if (!data) {
      // Another participant may have started the session at the same moment.
      const latest = await getInterviewAccess(id);
      if (latest.kind !== 'allowed' || latest.session.status !== 'LIVE') return { success: false as const, error: 'Trạng thái phiên đã thay đổi. Hãy tải lại phòng chờ.' };
    }
  }
  revalidatePath('/interviews');
  revalidatePath(`/room/${id}/lobby`);
  revalidatePath(`/room/${id}`);
  return { success: true as const, roomPath: `/room/${id}` };
}
