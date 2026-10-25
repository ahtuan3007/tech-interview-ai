'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface TestCase {
  input: string;
  expected_output: string;
}

// ---------- Floating Particles ----------
function FloatingParticles() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => {
        const size = Math.random() * 2.5 + 1;
        const left = Math.random() * 100;
        const dur = Math.random() * 25 + 15;
        const delay = Math.random() * 15;
        const opacity = Math.random() * 0.2 + 0.05;
        return (
          <div
            key={i}
            className="particle"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              background: `rgba(201, 169, 110, ${opacity})`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function CreateQuestionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [content, setContent] = useState('');
  const [expectedTimeComplexity, setExpectedTimeComplexity] = useState('');
  const [expectedSpaceComplexity, setExpectedSpaceComplexity] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expected_output: '' }]);

  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---------- Auth check ----------
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/questions');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'ADMIN') {
        router.push('/questions');
        return;
      }

      setIsLoading(false);
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Test cases ----------
  const addTestCase = () => {
    setTestCases((prev) => [...prev, { input: '', expected_output: '' }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    setTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { showToast('Vui lòng nhập tiêu đề', 'error'); return; }
    if (!content.trim()) { showToast('Vui lòng nhập nội dung đề bài', 'error'); return; }

    setIsSaving(true);

    const { error } = await supabase.from('questions').insert({
      title: title.trim(),
      category: category.trim(),
      difficulty,
      content: content.trim(),
      expected_time_complexity: expectedTimeComplexity.trim() || null,
      expected_space_complexity: expectedSpaceComplexity.trim() || null,
      test_cases: testCases.filter((tc) => tc.input.trim() || tc.expected_output.trim()),
    });

    if (error) {
      showToast('Lỗi khi tạo câu hỏi: ' + error.message, 'error');
      setIsSaving(false);
      return;
    }

    showToast('Tạo câu hỏi thành công!', 'success');
    setTimeout(() => router.push('/questions'), 1000);
  };

  // ---------- Loading ----------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="luxury-bg" />
        <div className="grain-overlay" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-10 h-10 border border-[rgba(201,169,110,0.3)] border-t-[rgba(201,169,110,0.8)] rounded-full animate-spin" />
          <span className="text-[0.65rem] tracking-[0.3em] uppercase text-[rgba(201,169,110,0.4)]">
            Verifying Access
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <FloatingParticles />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] max-w-sm w-full px-5 py-4 rounded-sm toast-luxury ${
            toast.type === 'success' ? 'toast-success' : 'toast-error'
          }`}
        >
          <span className="text-sm font-light tracking-widest uppercase">
            {toast.type === 'success' ? '✦ Success' : '✦ Error'}
          </span>
          <p className="text-sm mt-1 font-light leading-relaxed opacity-90">{toast.message}</p>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[rgba(5,5,5,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/questions')}
                className="text-[rgba(245,240,235,0.3)] hover:text-[rgba(201,169,110,0.7)] transition-colors text-sm"
                aria-label="Back to questions"
              >
                ←
              </button>
              <h1 className="font-serif text-xl sm:text-2xl font-light tracking-wide text-accent-gradient">
                Tạo câu hỏi
              </h1>
              <div className="hidden sm:block h-4 w-px bg-[rgba(255,255,255,0.06)]" />
              <span className="hidden sm:block text-[0.6rem] tracking-[0.25em] uppercase text-[rgba(245,240,235,0.25)]">
                New Question
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {mounted && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic info card */}
              <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-1">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-5 bg-gradient-to-b from-[rgba(201,169,110,0.6)] to-transparent rounded-full" />
                  <h3 className="text-[0.7rem] tracking-[0.25em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                    Thông tin cơ bản
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="questionTitle" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                      Tiêu đề *
                    </label>
                    <input
                      id="questionTitle"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Two Sum, Binary Search..."
                      className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                    />
                  </div>

                  <div className="line-accent" />

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="questionCategory" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Danh mục
                      </label>
                      <input
                        id="questionCategory"
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="VD: Array, String, Tree..."
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Độ khó *
                      </label>
                      <div className="flex gap-2">
                        {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setDifficulty(level)}
                            className={`flex-1 py-3 rounded-sm text-[0.65rem] tracking-[0.15em] uppercase font-medium transition-all duration-300 border ${
                              difficulty === level
                                ? level === 'EASY'
                                  ? 'bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ade80]'
                                  : level === 'MEDIUM'
                                  ? 'bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.3)] text-[#fbbf24]'
                                  : 'bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.3)] text-[#f87171]'
                                : 'bg-transparent border-[rgba(255,255,255,0.06)] text-[rgba(245,240,235,0.35)] hover:border-[rgba(255,255,255,0.12)]'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="line-accent" />

                  {/* Content */}
                  <div>
                    <label htmlFor="questionContent" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                      Nội dung đề bài *
                    </label>
                    <textarea
                      id="questionContent"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      placeholder="Mô tả chi tiết đề bài..."
                      className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide resize-none"
                    />
                  </div>

                  <div className="line-accent" />

                  {/* Complexity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="timeComplexity" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Time Complexity
                      </label>
                      <input
                        id="timeComplexity"
                        type="text"
                        value={expectedTimeComplexity}
                        onChange={(e) => setExpectedTimeComplexity(e.target.value)}
                        placeholder="VD: O(n), O(n log n)..."
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>
                    <div>
                      <label htmlFor="spaceComplexity" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Space Complexity
                      </label>
                      <input
                        id="spaceComplexity"
                        type="text"
                        value={expectedSpaceComplexity}
                        onChange={(e) => setExpectedSpaceComplexity(e.target.value)}
                        placeholder="VD: O(1), O(n)..."
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Test cases card */}
              <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-3">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-gradient-to-b from-[rgba(201,169,110,0.6)] to-transparent rounded-full" />
                    <h3 className="text-[0.7rem] tracking-[0.25em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                      Test Cases
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="luxury-btn-outline px-4 py-2 rounded-sm text-[0.6rem]"
                  >
                    + Thêm test case
                  </button>
                </div>

                <div className="space-y-6">
                  {testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="relative p-5 rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] hover:border-[rgba(201,169,110,0.1)] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.4)] font-medium">
                          Test Case #{idx + 1}
                        </span>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestCase(idx)}
                            className="text-[0.6rem] tracking-[0.1em] uppercase text-[rgba(220,80,70,0.5)] hover:text-[#f87171] transition-colors"
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[0.6rem] font-medium tracking-[0.15em] uppercase text-[rgba(245,240,235,0.3)] mb-1.5">
                            Input
                          </label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                            rows={3}
                            placeholder="Dữ liệu đầu vào..."
                            className="luxury-input w-full px-3 py-2.5 rounded-sm text-[0.8rem] tracking-wide resize-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.6rem] font-medium tracking-[0.15em] uppercase text-[rgba(245,240,235,0.3)] mb-1.5">
                            Expected Output
                          </label>
                          <textarea
                            value={tc.expected_output}
                            onChange={(e) => updateTestCase(idx, 'expected_output', e.target.value)}
                            rows={3}
                            placeholder="Kết quả mong đợi..."
                            className="luxury-input w-full px-3 py-2.5 rounded-sm text-[0.8rem] tracking-wide resize-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="reveal-up delay-4">
                <div className="line-accent-animate mb-6" />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="luxury-btn w-full py-4 rounded-sm"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-3">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang lưu
                    </span>
                  ) : (
                    'Lưu câu hỏi'
                  )}
                </button>
              </div>

              {/* Bottom decorative */}
              <div className="text-center py-4 reveal-fade delay-5">
                <div className="line-accent w-12 mx-auto mb-4" />
                <p className="text-[0.55rem] tracking-[0.35em] uppercase text-[rgba(245,240,235,0.1)] font-light">
                  &copy; 2026 Tech Interview AI &mdash; All Rights Reserved
                </p>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
