import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import QuestionDetailClient from './question-detail-client';
import type { Question, QuestionTestCase } from '@/types/database';

export default function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<Loading />}><QuestionDetailContent params={params} /></Suspense>;
}

function Loading() {
  return <div className="min-h-screen bg-[#050505] p-10 text-center text-sm tracking-widest text-[var(--accent)]">Đang tải đề bài…</div>;
}

async function QuestionDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('questions').select('*').eq('id', id).maybeSingle(),
  ]);
  if (error || !data) notFound();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isAdmin = profile?.role === 'ADMIN';
  }

  const question = data as unknown as Question;
  const allCases = Array.isArray(question.test_cases) ? question.test_cases : [];
  const visibleCases = isAdmin ? allCases : allCases.filter((testCase) => testCase.is_hidden === false);
  const hiddenCount = allCases.filter((testCase) => testCase.is_hidden).length;
  const publicCount = allCases.length - hiddenCount;

  return (
    <QuestionDetailClient
      question={{ ...question, test_cases: visibleCases as QuestionTestCase[] }}
      isAdmin={isAdmin}
      publicCount={publicCount}
      hiddenCount={hiddenCount}
    />
  );
}
