'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';

interface TestCase {
  input: string;
  expected_output: string;
}

interface Question {
  id: string;
  title: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  content: string;
  expected_time_complexity: string | null;
  expected_space_complexity: string | null;
  test_cases: TestCase[];
  created_at: string;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  EASY: { bg: 'rgba(74,222,128,0.08)', text: '#4ade80', border: 'rgba(74,222,128,0.2)' },
  MEDIUM: { bg: 'rgba(251,191,36,0.08)', text: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
  HARD: { bg: 'rgba(248,113,113,0.08)', text: '#f87171', border: 'rgba(248,113,113,0.2)' },
};

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

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;
  const supabase = createClient();

  const [question, setQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [editContent, setEditContent] = useState('');
  const [editTimeComplexity, setEditTimeComplexity] = useState('');
  const [editSpaceComplexity, setEditSpaceComplexity] = useState('');
  const [editTestCases, setEditTestCases] = useState<TestCase[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---------- Load question ----------
  useEffect(() => {
    const load = async () => {
      // Check admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'ADMIN') setIsAdmin(true);
      }

      // Fetch question
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error || !data) {
        showToast('Không tìm thấy câu hỏi', 'error');
        setTimeout(() => router.push('/questions'), 1500);
        return;
      }

      setQuestion(data as Question);
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // ---------- Start editing ----------
  const startEditing = () => {
    if (!question) return;
    setEditTitle(question.title);
    setEditCategory(question.category || '');
    setEditDifficulty(question.difficulty);
    setEditContent(question.content || '');
    setEditTimeComplexity(question.expected_time_complexity || '');
    setEditSpaceComplexity(question.expected_space_complexity || '');
    setEditTestCases(
      question.test_cases && question.test_cases.length > 0
        ? [...question.test_cases]
        : [{ input: '', expected_output: '' }]
    );
    setIsEditing(true);
  };

  // ---------- Save edit ----------
  const handleSave = async () => {
    if (!editTitle.trim()) { showToast('Tiêu đề không được để trống', 'error'); return; }

    setIsSaving(true);

    const { data, error } = await supabase
      .from('questions')
      .update({
        title: editTitle.trim(),
        category: editCategory.trim(),
        difficulty: editDifficulty,
        content: editContent.trim(),
        expected_time_complexity: editTimeComplexity.trim() || null,
        expected_space_complexity: editSpaceComplexity.trim() || null,
        test_cases: editTestCases.filter((tc) => tc.input.trim() || tc.expected_output.trim()),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      showToast('Lưu thất bại: ' + error.message, 'error');
    } else {
      setQuestion(data as Question);
      setIsEditing(false);
      showToast('Cập nhật thành công!', 'success');
    }
    setIsSaving(false);
  };

  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!confirm('Bạn chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.')) return;

    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) {
      showToast('Xóa thất bại: ' + error.message, 'error');
    } else {
      showToast('Đã xóa câu hỏi', 'success');
      setTimeout(() => router.push('/questions'), 1000);
    }
  };

  // ---------- Test case helpers ----------
  const addEditTestCase = () => {
    setEditTestCases((prev) => [...prev, { input: '', expected_output: '' }]);
  };

  const removeEditTestCase = (index: number) => {
    setEditTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditTestCase = (index: number, field: keyof TestCase, value: string) => {
    setEditTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
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
            Loading Question
          </span>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const dc = DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.EASY;

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
              <h1 className="font-serif text-xl sm:text-2xl font-light tracking-wide text-accent-gradient truncate max-w-[200px] sm:max-w-none">
                {isEditing ? 'Chỉnh sửa' : question.title}
              </h1>
            </div>

            {isAdmin && !isEditing && (
              <div className="flex items-center gap-3">
                <button
                  onClick={startEditing}
                  className="luxury-btn-outline px-4 py-2 rounded-sm"
                >
                  Sửa
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-sm text-[0.75rem] tracking-[0.15em] uppercase border border-[rgba(220,80,70,0.3)] text-[rgba(220,80,70,0.7)] hover:bg-[rgba(220,80,70,0.06)] hover:border-[rgba(220,80,70,0.5)] transition-all"
                >
                  Xóa
                </button>
              </div>
            )}

            {isEditing && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="luxury-btn-outline px-4 py-2 rounded-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="luxury-btn px-5 py-2.5 rounded-sm text-[0.7rem]"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

          {/* ---------- VIEW MODE ---------- */}
          {!isEditing && mounted && (
            <>
              {/* Meta info */}
              <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-1">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span
                    className="inline-block px-4 py-1.5 rounded-sm text-[0.65rem] tracking-[0.15em] uppercase font-medium border"
                    style={{ background: dc.bg, color: dc.text, borderColor: dc.border }}
                  >
                    {question.difficulty}
                  </span>
                  {question.category && (
                    <span className="text-[0.7rem] tracking-[0.1em] text-[rgba(245,240,235,0.4)] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-sm">
                      {question.category}
                    </span>
                  )}
                  <span className="text-[0.65rem] text-[rgba(245,240,235,0.25)] ml-auto">
                    {new Date(question.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#f5f0eb] mb-6 tracking-wide">
                  {question.title}
                </h2>

                <div className="line-accent mb-6" />

                {/* Content */}
                <div className="text-sm text-[rgba(245,240,235,0.6)] leading-relaxed tracking-wide whitespace-pre-wrap">
                  {question.content || 'Chưa có nội dung đề bài.'}
                </div>

                {/* Complexity */}
                {(question.expected_time_complexity || question.expected_space_complexity) && (
                  <>
                    <div className="line-accent my-6" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {question.expected_time_complexity && (
                        <div className="p-4 rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]">
                          <span className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.4)] font-medium block mb-2">
                            Time Complexity
                          </span>
                          <span className="text-sm text-[rgba(245,240,235,0.7)] font-mono">
                            {question.expected_time_complexity}
                          </span>
                        </div>
                      )}
                      {question.expected_space_complexity && (
                        <div className="p-4 rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]">
                          <span className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.4)] font-medium block mb-2">
                            Space Complexity
                          </span>
                          <span className="text-sm text-[rgba(245,240,235,0.7)] font-mono">
                            {question.expected_space_complexity}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Test cases */}
              {question.test_cases && question.test_cases.length > 0 && (
                <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-3">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-5 bg-gradient-to-b from-[rgba(201,169,110,0.6)] to-transparent rounded-full" />
                    <h3 className="text-[0.7rem] tracking-[0.25em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                      Test Cases ({question.test_cases.length})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {question.test_cases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]"
                      >
                        <span className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.35)] font-medium mb-3 block">
                          Test #{idx + 1}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[0.6rem] tracking-[0.15em] uppercase text-[rgba(245,240,235,0.3)] block mb-1">
                              Input
                            </span>
                            <code className="block p-3 rounded-sm bg-[rgba(0,0,0,0.3)] text-[0.8rem] text-[rgba(74,222,128,0.8)] font-mono whitespace-pre-wrap break-words">
                              {tc.input || '—'}
                            </code>
                          </div>
                          <div>
                            <span className="text-[0.6rem] tracking-[0.15em] uppercase text-[rgba(245,240,235,0.3)] block mb-1">
                              Expected Output
                            </span>
                            <code className="block p-3 rounded-sm bg-[rgba(0,0,0,0.3)] text-[0.8rem] text-[rgba(251,191,36,0.8)] font-mono whitespace-pre-wrap break-words">
                              {tc.expected_output || '—'}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------- EDIT MODE ---------- */}
          {isEditing && mounted && (
            <>
              {/* Basic info */}
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
                    <label htmlFor="editTitle" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                      Tiêu đề *
                    </label>
                    <input
                      id="editTitle"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                    />
                  </div>

                  <div className="line-accent" />

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="editCategory" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Danh mục
                      </label>
                      <input
                        id="editCategory"
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Độ khó
                      </label>
                      <div className="flex gap-2">
                        {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setEditDifficulty(level)}
                            className={`flex-1 py-3 rounded-sm text-[0.65rem] tracking-[0.15em] uppercase font-medium transition-all duration-300 border ${
                              editDifficulty === level
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
                    <label htmlFor="editContent" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                      Nội dung đề bài
                    </label>
                    <textarea
                      id="editContent"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide resize-none"
                    />
                  </div>

                  <div className="line-accent" />

                  {/* Complexity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="editTimeComplexity" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Time Complexity
                      </label>
                      <input
                        id="editTimeComplexity"
                        type="text"
                        value={editTimeComplexity}
                        onChange={(e) => setEditTimeComplexity(e.target.value)}
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>
                    <div>
                      <label htmlFor="editSpaceComplexity" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                        Space Complexity
                      </label>
                      <input
                        id="editSpaceComplexity"
                        type="text"
                        value={editSpaceComplexity}
                        onChange={(e) => setEditSpaceComplexity(e.target.value)}
                        className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Test cases */}
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
                    onClick={addEditTestCase}
                    className="luxury-btn-outline px-4 py-2 rounded-sm text-[0.6rem]"
                  >
                    + Thêm
                  </button>
                </div>

                <div className="space-y-6">
                  {editTestCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="relative p-5 rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.4)] font-medium">
                          Test Case #{idx + 1}
                        </span>
                        {editTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditTestCase(idx)}
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
                            onChange={(e) => updateEditTestCase(idx, 'input', e.target.value)}
                            rows={3}
                            className="luxury-input w-full px-3 py-2.5 rounded-sm text-[0.8rem] tracking-wide resize-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.6rem] font-medium tracking-[0.15em] uppercase text-[rgba(245,240,235,0.3)] mb-1.5">
                            Expected Output
                          </label>
                          <textarea
                            value={tc.expected_output}
                            onChange={(e) => updateEditTestCase(idx, 'expected_output', e.target.value)}
                            rows={3}
                            className="luxury-input w-full px-3 py-2.5 rounded-sm text-[0.8rem] tracking-wide resize-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Bottom decorative */}
          {mounted && (
            <div className="text-center py-6 reveal-fade delay-5">
              <div className="line-accent w-12 mx-auto mb-4" />
              <p className="text-[0.55rem] tracking-[0.35em] uppercase text-[rgba(245,240,235,0.1)] font-light">
                &copy; 2026 Tech Interview AI &mdash; All Rights Reserved
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
