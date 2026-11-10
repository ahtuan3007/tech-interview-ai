'use client';

import { useState } from 'react';
import Link from 'next/link';
import Markdown from '@/app/components/markdown';
import { useRouter } from 'next/navigation';
import { deleteQuestion } from '../actions';
import type { Question } from '@/types/database';

const difficultyColors = {
  EASY: { text: '#4ade80', border: 'rgba(74,222,128,0.3)', bg: 'rgba(74,222,128,0.08)' },
  MEDIUM: { text: '#fbbf24', border: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
  HARD: { text: '#f87171', border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)' },
};

export default function QuestionDetailClient({
  question,
  isAdmin,
  publicCount,
  hiddenCount,
}: {
  question: Question;
  isAdmin: boolean;
  publicCount: number;
  hiddenCount: number;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const colors = difficultyColors[question.difficulty];
  const visibleTestCases = Array.isArray(question.test_cases) ? question.test_cases : [];

  const handleDelete = async () => {
    if (!confirm(`Bạn chắc chắn muốn xóa câu hỏi “${question.title}”? Hành động này không thể hoàn tác.`)) return;
    setIsDeleting(true);
    const result = await deleteQuestion(question.id);
    if (!result.success) {
      setErrorMessage(result.error ?? 'Không thể xóa câu hỏi.');
      setIsDeleting(false);
      return;
    }
    router.push('/questions');
    router.refresh();
  };

  return (
    <div className="min-h-screen relative">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(5,5,5,0.85)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <button type="button" onClick={() => router.push('/questions')} aria-label="Quay lại danh sách" className="text-white/50 hover:text-[var(--accent)]">←</button>
              <h1 className="truncate font-serif text-xl text-accent-gradient">{question.title}</h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/interviews/schedule?question=${question.id}`} className="luxury-btn rounded-sm px-4 py-2 text-xs">Đặt lịch</Link>
              {isAdmin && <>
                <button type="button" onClick={() => router.push(`/questions/edit/${question.id}`)} className="luxury-btn-outline rounded-sm px-4 py-2 text-xs">Sửa</button>
                <button type="button" onClick={handleDelete} disabled={isDeleting} className="rounded-sm border border-red-400/30 px-4 py-2 text-xs text-red-300 disabled:opacity-50">{isDeleting ? 'Đang xóa…' : 'Xóa'}</button>
              </>}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
          {errorMessage && <p role="alert" className="rounded border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}
          <section className="glass-card rounded-sm p-5 sm:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-sm border px-3 py-1 text-xs tracking-widest" style={{ color: colors.text, borderColor: colors.border, background: colors.bg }}>{question.difficulty}</span>
              {question.category && <span className="rounded-sm border border-white/10 px-3 py-1 text-xs text-white/55">{question.category}</span>}
              <time className="ml-auto text-xs text-white/35" dateTime={question.created_at}>{new Date(question.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time>
            </div>
            <h2 className="mb-6 font-serif text-2xl text-[#f5f0eb] sm:text-3xl">{question.title}</h2>
            <div className="line-accent mb-6" />
            <Markdown source={question.content || 'Chưa có nội dung đề bài.'} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-white/10 p-4"><p className="mb-2 text-[0.6rem] uppercase tracking-widest text-[var(--accent)]">Time complexity</p><code className="text-sm text-white/75">{question.expected_time_complexity || '—'}</code></div>
              <div className="rounded-sm border border-white/10 p-4"><p className="mb-2 text-[0.6rem] uppercase tracking-widest text-[var(--accent)]">Space complexity</p><code className="text-sm text-white/75">{question.expected_space_complexity || '—'}</code></div>
            </div>
          </section>

          {question.starter_code && <section className="glass-card rounded-sm p-5 sm:p-8"><h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Starter code</h2><div className="grid gap-4 lg:grid-cols-3">{(['typescript', 'javascript', 'python'] as const).map((language) => <div key={language} className="min-w-0"><h3 className="mb-2 text-xs text-white/45">{language}</h3><pre className="overflow-x-auto rounded-sm bg-black/30 p-4 text-xs leading-6 text-emerald-100"><code>{question.starter_code?.[language] || '—'}</code></pre></div>)}</div></section>}

          {question.hints?.length > 0 && <section className="glass-card rounded-sm p-5 sm:p-8"><h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Hints</h2><ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-white/65">{question.hints.map((hint, index) => <li key={`${index}-${hint.slice(0, 20)}`}>{hint}</li>)}</ol></section>}

          <section className="glass-card rounded-sm p-5 sm:p-8">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Test Cases</h2><span className="text-xs text-white/45">Public: {publicCount} · Hidden: {hiddenCount}</span></div>
            <div className="space-y-4">
              {visibleTestCases.filter((testCase) => isAdmin || testCase.is_hidden === false).map((testCase, index) => <article key={testCase.id || index} className="rounded-sm border border-white/10 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-white/45">Test #{index + 1}</span>{testCase.is_hidden && <span className="text-[0.62rem] uppercase tracking-wider text-amber-200">Hidden · Admin</span>}</div><div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-1 text-[0.6rem] uppercase tracking-widest text-white/35">Input</p><pre className="whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-emerald-200">{testCase.input}</pre></div><div><p className="mb-1 text-[0.6rem] uppercase tracking-widest text-white/35">Expected output</p><pre className="whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-amber-100">{testCase.expected_output}</pre></div></div>{testCase.explanation && <p className="mt-3 text-xs leading-5 text-white/50">{testCase.explanation}</p>}</article>)}
              {hiddenCount > 0 && !isAdmin && <p className="rounded-sm border border-amber-200/15 bg-amber-200/5 px-4 py-3 text-xs text-amber-100/70">{hiddenCount} Hidden Edge Case được giữ kín và chỉ dùng khi chấm điểm.</p>}
              {visibleTestCases.length === 0 && <p className="text-sm text-white/40">Chưa có test case công khai.</p>}
            </div>
          </section>

          <div className="text-center py-4"><div className="line-accent mx-auto mb-4 w-12" /><p className="text-[0.55rem] uppercase tracking-[0.25em] text-white/20">© 2026 Tech Interview AI</p></div>
        </main>
      </div>
    </div>
  );
}
