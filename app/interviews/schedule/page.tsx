import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ScheduleForm from './schedule-form';
import { interviewDatabaseError, SESSION_COLUMNS } from '@/utils/interviews/validation';

export default function SchedulePage({ searchParams }: { searchParams: Promise<{ question?: string }> }) {
  return <Suspense fallback={<p className="p-8 text-white/60">Đang tải đề bài…</p>}><ScheduleContent searchParams={searchParams} /></Suspense>;
}

async function ScheduleContent({ searchParams }: { searchParams: Promise<{ question?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data, error }, { error: schemaError }] = await Promise.all([
    supabase.from('questions').select('id, title, category, difficulty').order('title'),
    supabase.from('interview_sessions').select(SESSION_COLUMNS)
      .in('status', ['SCHEDULED', 'LIVE', 'COMPLETED', 'EXPIRED'])
      .in('session_mode', ['PEER_TO_PEER', 'AI_MOCK_INTERVIEW']).limit(0),
  ]);
  const { question } = await searchParams;
  return <ScheduleForm questions={data ?? []} userId={user.id} initialQuestion={question} hasLoadError={Boolean(error)} schemaError={schemaError ? interviewDatabaseError(schemaError) : null} />;
}
