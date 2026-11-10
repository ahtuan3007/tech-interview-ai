import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Markdown from '@/app/components/markdown';
import { getInterviewAccess } from '@/utils/interviews/server';
import { MODE_LABELS } from '@/utils/interviews/validation';

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="p-8 text-white/60">Đang mở phòng…</p>}><RoomContent params={params} /></Suspense>;
}

async function RoomContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getInterviewAccess(id);
  if (access.kind === 'unauthenticated') redirect('/login');
  if (access.kind === 'not-found') notFound();
  if (access.kind === 'unavailable') return <p role="alert" className="relative z-10 p-8 text-amber-200">{access.error}</p>;
  if (access.session.status !== 'LIVE') redirect(`/room/${id}/lobby`);
  const { data: question, error } = await access.supabase.from('questions')
    .select('title, content, expected_time_complexity, expected_space_complexity').eq('id', access.session.question_id).maybeSingle();
  return <main className="relative z-10 mx-auto w-full max-w-5xl space-y-6 px-4 py-10 text-white/80 sm:px-6">
    <Link href={`/room/${id}/lobby`} className="text-sm text-[var(--accent)]">← Thông tin phòng</Link>
    <div className="flex flex-wrap items-center gap-4"><span className="rounded border border-emerald-300/30 px-3 py-1 text-xs text-emerald-200">LIVE</span><span className="text-xs text-white/50">{MODE_LABELS[access.session.session_mode]}</span></div>
    <h1 className="font-serif text-3xl">{question?.title ?? 'Phòng phỏng vấn'}</h1>
    <p className="break-all font-mono text-xs text-white/35">Mã phòng: {id}</p>
    <div className="rounded border border-amber-200/20 bg-amber-200/5 p-5 text-sm leading-6 text-amber-100">Phiên đã được mở. Giai đoạn 4 hoàn thiện luồng đặt lịch và quyền vào phòng. Trình soạn thảo cộng tác, chạy code và trợ lý AI thuộc các giai đoạn 5–6.</div>
    {error || !question ? <p role="alert" className="text-red-300">Không tải được đề bài. Vui lòng thử lại sau.</p> : <section className="glass-card space-y-6 rounded p-6 sm:p-8"><Markdown source={question.content} /><div className="flex flex-wrap gap-6 border-t border-white/10 pt-5 text-xs text-white/55"><code>Time: {question.expected_time_complexity}</code><code>Space: {question.expected_space_complexity}</code></div></section>}
  </main>;
}
