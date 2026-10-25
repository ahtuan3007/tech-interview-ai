'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface Question {
  id: string;
  title: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
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
      {Array.from({ length: 12 }).map((_, i) => {
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

export default function QuestionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---------- Load data ----------
  useEffect(() => {
    const load = async () => {
      // Check admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'ADMIN') setIsAdmin(true);
      }

      // Fetch questions
      const { data, error } = await supabase
        .from('questions')
        .select('id, title, category, difficulty, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Questions fetch error:', error);
        showToast('Không thể tải danh sách câu hỏi', 'error');
      } else {
        setQuestions(data || []);
      }
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Delete ----------
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn chắc chắn muốn xóa câu hỏi "${title}"?`)) return;

    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      showToast('Xóa thất bại: ' + error.message, 'error');
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      showToast('Đã xóa câu hỏi thành công', 'success');
    }
  };

  // ---------- Filtering ----------
  const filtered = questions.filter((q) => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchDiff = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;
    return matchSearch && matchDiff;
  });

  // ---------- Loading ----------
  if (isLoading) {
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-[rgba(245,240,235,0.3)] hover:text-[rgba(201,169,110,0.7)] transition-colors text-sm"
                aria-label="Go home"
              >
                ←
              </button>
              <h1 className="font-serif text-xl sm:text-2xl font-light tracking-wide text-accent-gradient">
                Questions
              </h1>
              <div className="hidden sm:block h-4 w-px bg-[rgba(255,255,255,0.06)]" />
              <span className="hidden sm:block text-[0.6rem] tracking-[0.25em] uppercase text-[rgba(245,240,235,0.25)]">
                Bank
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => router.push('/questions/create')}
                  className="luxury-btn px-5 py-2.5 rounded-sm text-[0.7rem]"
                >
                  + Thêm câu hỏi
                </button>
              )}
              <button
                onClick={() => router.push('/profile')}
                className="luxury-btn-outline px-4 py-2 rounded-sm"
              >
                Profile
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Filters */}
          {mounted && (
            <div className="glass-card rounded-sm p-5 sm:p-6 mb-8 reveal-up delay-1">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <input
                    id="searchQuestions"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm theo tiêu đề..."
                    className="luxury-input w-full px-4 py-3 rounded-sm text-sm tracking-wide"
                  />
                </div>

                {/* Difficulty filter */}
                <div className="flex gap-2 flex-wrap">
                  {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficultyFilter(level)}
                      className={`px-4 py-2.5 rounded-sm text-[0.65rem] tracking-[0.15em] uppercase font-medium transition-all duration-300 border ${
                        difficultyFilter === level
                          ? 'bg-[rgba(201,169,110,0.12)] border-[rgba(201,169,110,0.3)] text-[var(--accent)]'
                          : 'bg-transparent border-[rgba(255,255,255,0.06)] text-[rgba(245,240,235,0.35)] hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(245,240,235,0.5)]'
                      }`}
                    >
                      {level === 'ALL' ? 'Tất cả' : level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Questions count */}
          {mounted && (
            <div className="flex items-center gap-3 mb-6 reveal-fade delay-2">
              <div className="w-1 h-4 bg-gradient-to-b from-[rgba(201,169,110,0.5)] to-transparent rounded-full" />
              <span className="text-[0.65rem] tracking-[0.2em] uppercase text-[rgba(245,240,235,0.3)]">
                {filtered.length} câu hỏi
              </span>
            </div>
          )}

          {/* Table */}
          {mounted && (
            <div className="glass-card rounded-sm overflow-hidden reveal-up delay-3">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[0.7rem] tracking-[0.2em] uppercase text-[rgba(245,240,235,0.25)]">
                    Không tìm thấy câu hỏi nào
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        <th className="text-left px-5 py-4 text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] font-medium">
                          Tiêu đề
                        </th>
                        <th className="text-left px-5 py-4 text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] font-medium hidden sm:table-cell">
                          Danh mục
                        </th>
                        <th className="text-left px-5 py-4 text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] font-medium">
                          Độ khó
                        </th>
                        <th className="text-left px-5 py-4 text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] font-medium hidden md:table-cell">
                          Ngày tạo
                        </th>
                        {isAdmin && (
                          <th className="text-right px-5 py-4 text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] font-medium">
                            Thao tác
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((q, idx) => {
                        const dc = DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.EASY;
                        return (
                          <tr
                            key={q.id}
                            className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(201,169,110,0.03)] transition-colors duration-300 cursor-pointer group"
                            onClick={() => router.push(`/questions/${q.id}`)}
                          >
                            <td className="px-5 py-4">
                              <span className="text-sm text-[#f5f0eb] group-hover:text-[var(--accent-light)] transition-colors font-light tracking-wide">
                                {q.title}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className="text-[0.7rem] text-[rgba(245,240,235,0.4)] tracking-wide">
                                {q.category || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className="inline-block px-3 py-1 rounded-sm text-[0.6rem] tracking-[0.15em] uppercase font-medium border"
                                style={{
                                  background: dc.bg,
                                  color: dc.text,
                                  borderColor: dc.border,
                                }}
                              >
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <span className="text-[0.7rem] text-[rgba(245,240,235,0.3)]">
                                {new Date(q.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => router.push(`/questions/${q.id}`)}
                                    className="px-3 py-1.5 rounded-sm text-[0.6rem] tracking-[0.1em] uppercase border border-[rgba(201,169,110,0.2)] text-[rgba(201,169,110,0.6)] hover:border-[rgba(201,169,110,0.4)] hover:text-[var(--accent)] transition-all"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDelete(q.id, q.title)}
                                    className="px-3 py-1.5 rounded-sm text-[0.6rem] tracking-[0.1em] uppercase border border-[rgba(220,80,70,0.2)] text-[rgba(220,80,70,0.6)] hover:border-[rgba(220,80,70,0.4)] hover:text-[#f87171] hover:bg-[rgba(220,80,70,0.06)] transition-all"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bottom decorative */}
          {mounted && (
            <div className="text-center py-8 reveal-fade delay-5">
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
