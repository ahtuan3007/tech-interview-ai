import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getInterviewAccess } from '@/utils/interviews/server';
import LobbyClient from './lobby-client';

export default function LobbyPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="p-8 text-white/60">Đang kiểm tra quyền vào phòng…</p>}><LobbyContent params={params} /></Suspense>;
}

async function LobbyContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getInterviewAccess(id);
  if (access.kind === 'unauthenticated') redirect('/login');
  if (access.kind === 'not-found') notFound();
  if (access.kind === 'unavailable') return <main className="relative z-10 mx-auto max-w-3xl p-8 text-white/70"><p role="alert">{access.error}</p><Link href="/interviews" className="mt-5 block text-[var(--accent)]">← Lịch phỏng vấn</Link></main>;
  const { data: question, error } = await access.supabase.from('questions').select('id, title, category, difficulty').eq('id', access.session.question_id).maybeSingle();
  return <LobbyClient session={access.session} question={question} hasQuestionError={Boolean(error) || !question} userId={access.userId} initialNow={access.loadedAt} />;
}
