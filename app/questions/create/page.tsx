import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import QuestionFormClient from '../question-form-client';

export default function CreateQuestionPage() {
  return <Suspense fallback={<Loading />}><GuardedCreatePage /></Suspense>;
}

function Loading() {
  return <div className="min-h-screen bg-[#050505] p-10 text-center text-sm tracking-widest text-[var(--accent)]">Đang kiểm tra quyền Admin…</div>;
}

async function GuardedCreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/questions');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ADMIN') redirect('/questions');

  return <QuestionFormClient />;
}
