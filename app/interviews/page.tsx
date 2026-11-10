import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { formatInterviewTime, interviewDatabaseError, MODE_LABELS, SESSION_COLUMNS, STATUS_LABELS } from '@/utils/interviews/validation';
import type { InterviewSession } from '@/types/database';

export default function InterviewsPage() {
  return <Suspense fallback={<p className="p-8 text-white/60">Đang tải lịch hẹn…</p>}><InterviewsContent /></Suspense>;
}

async function InterviewsContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  let query = supabase.from('interview_sessions').select(SESSION_COLUMNS)
    .not('question_id', 'is', null).not('session_mode', 'is', null)
    .order('scheduled_at', { ascending: false }).limit(100);
  if (profile?.role !== 'ADMIN') query = query.or(`interviewer_id.eq.${user.id},interviewee_id.eq.${user.id}`);
  const { data, error } = await query;
  const sessions = (data ?? []) as InterviewSession[];
  const questionIds = [...new Set(sessions.map((session) => session.question_id))];
  const { data: questions } = questionIds.length
    ? await supabase.from('questions').select('id, title').in('id', questionIds)
    : { data: [] };
  const titles = new Map((questions ?? []).map((question) => [question.id, question.title]));

  return <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 text-white/80 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Your Interview Journey</p><h1 className="mt-3 font-serif text-4xl">Lịch phỏng vấn</h1><p className="mt-3 text-sm text-white/45">{profile?.role === 'ADMIN' ? 'Các phiên phỏng vấn trong hệ thống.' : 'Các phiên bạn tham gia với vai trò ứng viên hoặc người phỏng vấn.'} Giờ Việt Nam (UTC+7).</p></div>
      <Link href="/interviews/schedule" className="luxury-btn rounded-sm px-5 py-3 text-sm">+ Đặt lịch mới</Link>
    </div>
    {error ? <p role="alert" className="mt-8 rounded-sm border border-amber-300/30 bg-amber-200/5 p-5 text-sm text-amber-100">{interviewDatabaseError(error)}</p> : !sessions.length ?
      <div className="glass-card mt-8 rounded-sm p-10 text-center"><h2 className="font-serif text-2xl">Lịch hẹn đầu tiên đang chờ bạn</h2><p className="mt-3 text-sm text-white/45">Tạo phòng AI tức thì hoặc hẹn một người phỏng vấn cùng luyện tập.</p><Link href="/interviews/schedule" className="mt-6 inline-block text-sm text-[var(--accent)]">Chọn đề bài và đặt lịch →</Link></div> :
      <div className="mt-8 grid gap-4 md:grid-cols-2">{sessions.map((session) => <article key={session.id} className="glass-card min-w-0 rounded-sm p-6">
        <div className="flex flex-wrap items-center gap-3 text-xs"><span className="text-[var(--accent)]">{MODE_LABELS[session.session_mode]}</span><span className={`ml-auto rounded border px-2 py-1 ${session.status === 'LIVE' ? 'border-emerald-300/30 text-emerald-200' : 'border-white/15 text-white/55'}`}>{STATUS_LABELS[session.status] ?? session.status}</span></div>
        <h2 className="mt-4 font-serif text-xl">{titles.get(session.question_id) ?? 'Đề bài không còn khả dụng'}</h2>
        <p className="mt-3 text-sm text-white/60">{formatInterviewTime(session.scheduled_at)}</p>
        <p className="mt-2 text-xs text-white/40">{session.interviewee_id === user.id ? 'Bạn là ứng viên' : session.interviewer_id === user.id ? 'Bạn là người phỏng vấn' : 'Quản trị viên'}</p>
        <p className="mt-3 break-all font-mono text-[0.65rem] text-white/30">{session.id}</p>
        <Link href={`/room/${session.id}/lobby`} className="mt-5 inline-block text-sm text-[var(--accent)]">Mở phòng chờ →</Link>
      </article>)}</div>}
    {sessions.length === 100 && <p className="mt-6 text-xs text-white/45">Đang hiển thị 100 lịch hẹn gần nhất.</p>}
  </main>;
}
