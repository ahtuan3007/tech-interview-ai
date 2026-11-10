import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import QuestionFormClient from '../../question-form-client';
import type { Question } from '@/types/database';

export default function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<Loading />}><GuardedEditPage params={params} /></Suspense>;
}

function Loading() {
  return <div className="min-h-screen bg-[#050505] p-10 text-center text-sm tracking-widest text-[var(--accent)]">Đang tải đề thi…</div>;
}

async function GuardedEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/questions');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ADMIN') redirect('/questions');

  const { data, error } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
  if (error || !data) redirect('/questions');

  return <QuestionFormClient question={data as unknown as Question} />;
}
