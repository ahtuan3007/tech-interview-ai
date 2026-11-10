'use client';

import { useState } from 'react';
import MarkdownPreview from '@/app/components/markdown';
import { useRouter } from 'next/navigation';
import { saveQuestion, type QuestionInput } from './actions';
import type { Question, QuestionDifficulty, QuestionTestCase, StarterCode } from '@/types/database';

const EMPTY_STARTER: StarterCode = {
  typescript: 'function solution(input: unknown): unknown {\n  // TODO: implement\n}\n',
  javascript: 'function solution(input) {\n  // TODO: implement\n}\n',
  python: 'def solution(input_data):\n    # TODO: implement\n    pass\n',
};

function newTestCase(): QuestionTestCase {
  return {
    id: crypto.randomUUID(),
    input: '',
    expected_output: '',
    is_hidden: false,
    explanation: '',
  };
}

export default function QuestionFormClient({ question }: { question?: Question }) {
  const router = useRouter();
  const [title, setTitle] = useState(question?.title ?? '');
  const [category, setCategory] = useState(question?.category ?? '');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question?.difficulty ?? 'EASY');
  const [content, setContent] = useState(question?.content ?? '');
  const [timeComplexity, setTimeComplexity] = useState(question?.expected_time_complexity ?? 'O(n)');
  const [spaceComplexity, setSpaceComplexity] = useState(question?.expected_space_complexity ?? 'O(1)');
  const [testCases, setTestCases] = useState<QuestionTestCase[]>(
    question?.test_cases?.length
      ? question.test_cases
      : [{ id: 'initial-test-case', input: '', expected_output: '', is_hidden: false }]
  );
  const [starterCode, setStarterCode] = useState<StarterCode>(question?.starter_code ?? EMPTY_STARTER);
  const [hints, setHints] = useState<string[]>(question?.hints ?? ['']);
  const [showJson, setShowJson] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<keyof StarterCode>('typescript');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  const updateTestCase = (index: number, changes: Partial<QuestionTestCase>) => {
    setTestCases((current) => current.map((testCase, itemIndex) =>
      itemIndex === index ? { ...testCase, ...changes } : testCase
    ));
  };

  const generateWithAI = async () => {
    if (title.trim().length < 2 || content.trim().length < 10) {
      setNotice({ text: 'Nhập tiêu đề và mô tả đề bài trước khi tạo gợi ý.', error: true });
      return;
    }
    setIsGenerating(true);
    setNotice(null);
    try {
      const response = await fetch('/api/ai/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, expected_time_complexity: timeComplexity }),
      });
      const result = await response.json() as {
        test_cases?: QuestionTestCase[];
        starter_code?: StarterCode;
        hints?: string[];
        warning?: string;
        error?: string;
      };
      if (!response.ok || !result.test_cases || !result.starter_code || !result.hints) {
        throw new Error(result.error || 'Không thể tạo gợi ý lúc này.');
      }
      setTestCases(result.test_cases);
      setStarterCode(result.starter_code);
      setHints(result.hints.length ? result.hints : ['']);
      setNotice({ text: result.warning ?? 'Đã tạo gợi ý. Hãy kiểm tra tính đúng đắn trước khi lưu.', error: false });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Không thể tạo gợi ý lúc này.', error: true });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: QuestionInput = {
      title,
      category,
      difficulty,
      content,
      expected_time_complexity: timeComplexity,
      expected_space_complexity: spaceComplexity,
      test_cases: testCases,
      starter_code: starterCode,
      hints: hints.filter((hint) => hint.trim()),
    };

    setIsSaving(true);
    setNotice(null);
    let result: Awaited<ReturnType<typeof saveQuestion>>;
    try {
      result = await saveQuestion(input, question?.id);
    } catch {
      setNotice({ text: 'Không thể kết nối máy chủ. Vui lòng thử lại.', error: true });
      return;
    } finally {
      setIsSaving(false);
    }
    if (!result.success) {
      setNotice({ text: result.error ?? 'Không thể lưu đề bài.', error: true });
      return;
    }
    router.push(`/questions/${result.id}`);
    router.refresh();
  };

  const labelClass = 'mb-2 block text-[0.62rem] font-medium uppercase tracking-[0.16em] text-[rgba(245,240,235,0.48)]';
  const inputClass = 'luxury-input w-full rounded-sm px-4 py-3 text-sm';

  return (
    <div className="min-h-screen relative">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(5,5,5,0.85)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => router.push('/questions')} className="text-white/50 hover:text-[var(--accent)]" aria-label="Quay lại danh sách">←</button>
              <div>
                <h1 className="font-serif text-xl text-accent-gradient">{question ? 'Sửa đề thi' : 'Tạo đề thi mới'}</h1>
                <p className="text-[0.58rem] uppercase tracking-[0.18em] text-white/30">Admin Question Builder</p>
              </div>
            </div>
            <button type="button" onClick={generateWithAI} disabled={isGenerating || isSaving} className="luxury-btn-outline rounded-sm px-3 py-2 text-xs disabled:opacity-50 sm:px-5">
              {isGenerating ? 'Đang tạo gợi ý…' : '✨ AI Auto-Generate Edge Cases & Starter Code'}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {notice && (
            <div role={notice.error ? 'alert' : 'status'} className={`mb-6 rounded-sm border px-4 py-3 text-sm ${notice.error ? 'border-red-400/30 bg-red-950/30 text-red-200' : 'border-amber-300/20 bg-amber-950/20 text-amber-100'}`}>
              {notice.text}
            </div>
          )}

          <datalist id="complexity-options">{['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'].map((value) => <option key={value} value={value} />)}</datalist>
          <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-2">
            <section className="glass-card min-w-0 rounded-sm p-5 sm:p-7">
              <div className="mb-6 flex items-center gap-3"><span className="h-5 w-1 rounded bg-[var(--accent)]" /><h2 className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">1. Thông tin & đề bài</h2></div>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2"><span className={labelClass}>Tiêu đề *</span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="VD: Two Sum" /></label>
                <label><span className={labelClass}>Danh mục</span><input required maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} placeholder="Arrays & Hashing" /></label>
                <fieldset className="md:col-span-2"><legend className={labelClass}>Độ khó</legend><div className="flex gap-2">{(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => <button key={level} type="button" onClick={() => setDifficulty(level)} aria-pressed={difficulty === level} className={`flex-1 rounded-sm border px-4 py-3 text-xs tracking-widest ${difficulty === level ? level === 'EASY' ? 'border-green-400/40 bg-green-400/10 text-green-300' : level === 'MEDIUM' ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-white/10 text-white/40'}`}>{level}</button>)}</div></fieldset>
                <label><span className={labelClass}>Expected time complexity</span><input required maxLength={100} list="complexity-options" value={timeComplexity} onChange={(event) => setTimeComplexity(event.target.value)} className={inputClass} placeholder="O(n)" /></label>
                <label><span className={labelClass}>Expected space complexity</span><input required maxLength={100} list="complexity-options" value={spaceComplexity} onChange={(event) => setSpaceComplexity(event.target.value)} className={inputClass} placeholder="O(1)" /></label>
                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-3"><span className={labelClass}>Mô tả đề bài (Markdown) *</span><div className="flex gap-2"><button type="button" onClick={() => setPreviewMode(false)} className={`rounded border px-3 py-1 text-xs ${!previewMode ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/40'}`}>Soạn thảo</button><button type="button" onClick={() => setPreviewMode(true)} className={`rounded border px-3 py-1 text-xs ${previewMode ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/40'}`}>Xem trước</button></div></div>
                  {previewMode ? <div className="min-h-48 rounded-sm border border-white/10 bg-black/20 p-4"><MarkdownPreview source={content || 'Chưa có nội dung.'} /></div> : <textarea required value={content} onChange={(event) => setContent(event.target.value)} rows={10} maxLength={15000} className={`${inputClass} resize-y font-mono`} placeholder={'## Mô tả\n\nNêu yêu cầu, định dạng input/output và ràng buộc…'} />}
                </div>
              </div>
            </section>

            <section className="glass-card min-w-0 rounded-sm p-5 sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="h-5 w-1 rounded bg-[var(--accent)]" /><div><h2 className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">2. Bộ kiểm thử</h2><p className="mt-1 text-xs text-white/35">Public hiện cho ứng viên; Hidden chỉ giữ ở server khi xem đề.</p></div></div><button type="button" disabled={testCases.length >= 100} onClick={() => setTestCases((current) => [...current, newTestCase()])} className="luxury-btn-outline rounded-sm px-4 py-2 text-xs">+ Thêm Test Case</button></div>
              <button type="button" onClick={() => setShowJson(!showJson)} className="mb-4 text-xs text-[var(--accent)]">{showJson ? 'Ẩn cấu trúc JSONB' : 'Xem cấu trúc JSONB'}</button>
              {showJson && <pre className="mb-4 max-h-80 overflow-auto rounded bg-black/40 p-4 text-xs text-emerald-200">{JSON.stringify(testCases, null, 2)}</pre>}
              <div className="space-y-4">
                {testCases.map((testCase, index) => (
                  <article key={testCase.id} className="rounded-sm border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-xs uppercase tracking-widest text-white/55">Test Case #{index + 1}</h3><div className="flex gap-3">{([-1, 1] as const).map((direction) => <button type="button" key={direction} disabled={index + direction < 0 || index + direction >= testCases.length} aria-label={`${direction < 0 ? 'Đưa lên' : 'Đưa xuống'} test case ${index + 1}`} className="text-white/60 disabled:opacity-20" onClick={() => setTestCases((current) => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; })}>{direction < 0 ? '↑' : '↓'}</button>)}</div>{testCases.length > 1 && <button type="button" onClick={() => setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-300/70 hover:text-red-200">Xóa</button>}</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label><span className={labelClass}>Input</span><textarea maxLength={20000} value={testCase.input} onChange={(event) => updateTestCase(index, { input: event.target.value })} rows={4} className={`${inputClass} resize-y font-mono`} /></label>
                      <label><span className={labelClass}>Expected output</span><textarea required maxLength={20000} value={testCase.expected_output} onChange={(event) => updateTestCase(index, { expected_output: event.target.value })} rows={4} className={`${inputClass} resize-y font-mono`} /></label>
                      <label className="md:col-span-2"><span className={labelClass}>Giải thích (tùy chọn)</span><input value={testCase.explanation ?? ''} onChange={(event) => updateTestCase(index, { explanation: event.target.value })} className={inputClass} /></label>
                      <label className="flex items-center gap-3 rounded-sm border border-white/10 px-4 py-3"><input type="checkbox" checked={testCase.is_hidden} onChange={(event) => updateTestCase(index, { is_hidden: event.target.checked })} className="accent-amber-400" /><span className="text-sm text-white/70">Hidden Test Case</span></label>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-sm p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3"><span className="h-5 w-1 rounded bg-[var(--accent)]" /><h2 className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">3. Starter code & gợi ý</h2></div>
              <div className="mb-3 flex gap-2">{(['typescript', 'javascript', 'python'] as const).map((language) => <button key={language} type="button" onClick={() => setActiveLanguage(language)} className={`rounded border px-4 py-2 text-xs ${activeLanguage === language ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/45'}`}>{language}</button>)}</div>
              <textarea aria-label={`Starter code ${activeLanguage}`} value={starterCode[activeLanguage]} onChange={(event) => setStarterCode((current) => ({ ...current, [activeLanguage]: event.target.value }))} rows={8} className={`${inputClass} resize-y font-mono`} />
              <div className="mt-6 flex items-center justify-between gap-3"><h3 className={labelClass}>Hints (từ gợi ý tổng quan đến chi tiết)</h3><button type="button" onClick={() => setHints((current) => [...current, ''])} className="text-xs text-[var(--accent)]">+ Thêm gợi ý</button></div>
              <div className="mt-3 space-y-3">{hints.map((hint, index) => <div key={`hint-${index}`} className="flex gap-2"><span className="pt-3 text-xs text-white/35">{index + 1}.</span><textarea value={hint} onChange={(event) => setHints((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} rows={2} className={`${inputClass} resize-y`} placeholder="Nhập gợi ý…" />{hints.length > 1 && <button type="button" onClick={() => setHints((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa gợi ý ${index + 1}`} className="px-2 text-red-300">×</button>}</div>)}</div>
            </section>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row lg:col-span-2"><button type="button" onClick={() => router.push('/questions')} className="luxury-btn-outline rounded-sm px-6 py-3 text-sm">Hủy</button><button type="submit" disabled={isSaving || isGenerating} className="luxury-btn rounded-sm px-8 py-3 text-sm disabled:opacity-50">{isSaving ? 'Đang lưu…' : question ? 'Lưu thay đổi' : 'Tạo đề thi'}</button></div>
          </form>
        </main>
      </div>
    </div>
  );
}
