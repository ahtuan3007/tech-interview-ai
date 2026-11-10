import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import QuestionsListClient, { type QuestionSummary } from './questions-list-client';

interface QuestionRecord {
  id: string;
  title: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  created_at: string;
  expected_time_complexity: string | null;
  expected_space_complexity: string | null;
  test_cases: unknown;
}

function countTestCases(value: unknown) {
  const cases: unknown[] = Array.isArray(value) ? value : [];
  const isHidden = (testCase: unknown, hidden: boolean) =>
    typeof testCase === 'object' &&
    testCase !== null &&
    'is_hidden' in testCase &&
    testCase.is_hidden === hidden;

  return {
    testCaseCount: cases.length,
    publicTestCaseCount: cases.filter((testCase) => isHidden(testCase, false)).length,
    hiddenTestCaseCount: cases.filter((testCase) => isHidden(testCase, true)).length,
  };
}

function QuestionsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-10 h-10 border border-[rgba(201,169,110,0.3)] border-t-[rgba(201,169,110,0.8)] rounded-full animate-spin" />
        <span className="text-[0.65rem] tracking-[0.3em] uppercase text-[rgba(201,169,110,0.4)]">
          Loading Questions
        </span>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<QuestionsLoading />}>
      <QuestionsPageContent />
    </Suspense>
  );
}

async function QuestionsPageContent() {
  const supabase = await createClient();
  const [
    { data: { user } },
    { data, error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('questions')
      .select(
        'id, title, category, difficulty, created_at, expected_time_complexity, expected_space_complexity, test_cases'
      )
      .order('created_at', { ascending: false }),
  ]);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'ADMIN';
  }

  if (error) console.error('Questions fetch error:', error);

  const questions: QuestionSummary[] = ((data ?? []) as QuestionRecord[]).map((question) => ({
    id: question.id,
    title: question.title,
    category: question.category,
    difficulty: question.difficulty,
    created_at: question.created_at,
    expected_time_complexity: question.expected_time_complexity,
    expected_space_complexity: question.expected_space_complexity,
    ...countTestCases(question.test_cases),
  }));

  return (
    <QuestionsListClient
      initialQuestions={questions}
      isAdmin={isAdmin}
      hasLoadError={Boolean(error)}
    />
  );
}
