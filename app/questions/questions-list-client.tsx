'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteQuestion } from './actions';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionSummary {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  created_at: string;
  expected_time_complexity: string | null;
  expected_space_complexity: string | null;
  testCaseCount: number;
  publicTestCaseCount: number;
  hiddenTestCaseCount: number;
}

interface QuestionsListClientProps {
  initialQuestions: QuestionSummary[];
  isAdmin: boolean;
  hasLoadError: boolean;
}

const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; text: string; border: string }> = {
  EASY: { bg: 'rgba(74,222,128,0.08)', text: '#4ade80', border: 'rgba(74,222,128,0.2)' },
  MEDIUM: { bg: 'rgba(251,191,36,0.08)', text: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
  HARD: { bg: 'rgba(248,113,113,0.08)', text: '#f87171', border: 'rgba(248,113,113,0.2)' },
};

function FloatingParticles() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => {
        const size = 1 + (index % 3) * 0.7;
        const left = (index * 37) % 100;
        const duration = 15 + (index % 5) * 2.5;
        const delay = (index * 1.7) % 15;
        const opacity = 0.05 + (index % 4) * 0.05;
        return (
          <div
            key={index}
            className="particle"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              background: `rgba(201, 169, 110, ${opacity})`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function QuestionsListClient({
  initialQuestions,
  isAdmin,
  hasLoadError,
}: QuestionsListClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | Difficulty>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(questions.map((question) => question.category.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [questions]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    return questions.filter((question) => {
      const matchesSearch = question.title.toLocaleLowerCase('vi').includes(normalizedSearch);
      const matchesCategory =
        categoryFilter === 'ALL' || question.category.trim() === categoryFilter;
      const matchesDifficulty =
        difficultyFilter === 'ALL' || question.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [categoryFilter, difficultyFilter, questions, search]);

  const statistics = useMemo(
    () => ({
      total: questions.length,
      easy: questions.filter((question) => question.difficulty === 'EASY').length,
      medium: questions.filter((question) => question.difficulty === 'MEDIUM').length,
      hard: questions.filter((question) => question.difficulty === 'HARD').length,
      testCases: questions.reduce((total, question) => total + question.testCaseCount, 0),
    }),
    [questions]
  );

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn chắc chắn muốn xóa câu hỏi "${title}"?`)) return;

    const result = await deleteQuestion(id);
    if (!result.success) {
      showToast(`Xóa thất bại: ${result.error}`, 'error');
      return;
    }

    setQuestions((current) => current.filter((question) => question.id !== id));
    showToast('Đã xóa câu hỏi thành công', 'success');
  };

  const difficultyOptions: Array<'ALL' | Difficulty> = ['ALL', 'EASY', 'MEDIUM', 'HARD'];

  return (
    <div className="min-h-screen relative">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <FloatingParticles />

      {toast && (
        <div
          role="status"
          className={`fixed top-6 right-6 z-[100] max-w-sm w-full px-5 py-4 rounded-sm toast-luxury ${
            toast.type === 'success' ? 'toast-success' : 'toast-error'
          }`}
        >
          <span className="text-sm font-light tracking-widest uppercase">
            {toast.type === 'success' ? 'Success' : 'Error'}
          </span>
          <p className="text-sm mt-1 font-light leading-relaxed opacity-90">{toast.message}</p>
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-[rgba(5,5,5,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push('/')}
                className="text-[rgba(245,240,235,0.3)] hover:text-[rgba(201,169,110,0.7)] transition-colors text-sm"
                aria-label="Về trang chủ"
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

            <div className="flex items-center gap-3 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => router.push('/questions/create')}
                  className="luxury-btn px-4 sm:px-5 py-2.5 rounded-sm text-[0.7rem]"
                >
                  + Tạo đề thi mới
                </button>
              )}
              <button
                onClick={() => router.push('/profile')}
                className="luxury-btn-outline px-4 py-2 rounded-sm text-xs"
              >
                Profile
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <section aria-label="Thống kê câu hỏi" className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            {[
              { label: 'Tổng câu hỏi', value: statistics.total, color: 'text-[#f5f0eb]' },
              { label: 'Easy', value: statistics.easy, color: 'text-[#4ade80]' },
              { label: 'Medium', value: statistics.medium, color: 'text-[#fbbf24]' },
              { label: 'Hard', value: statistics.hard, color: 'text-[#f87171]' },
              { label: 'Test cases', value: statistics.testCases, color: 'text-[var(--accent)]' },
            ].map((statistic) => (
              <div key={statistic.label} className="glass-card rounded-sm px-4 py-4 sm:px-5">
                <p className="text-[0.58rem] sm:text-[0.62rem] tracking-[0.15em] uppercase text-[rgba(245,240,235,0.35)]">
                  {statistic.label}
                </p>
                <p className={`mt-2 text-2xl font-light tabular-nums ${statistic.color}`}>
                  {statistic.value}
                </p>
              </div>
            ))}
          </section>

          <section aria-label="Bộ lọc câu hỏi" className="glass-card rounded-sm p-5 sm:p-6 mb-7">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              <label className="flex-1">
                <span className="sr-only">Tìm theo tiêu đề</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm kiếm theo tiêu đề..."
                  className="luxury-input w-full px-4 py-3 rounded-sm text-sm tracking-wide"
                />
              </label>

              <label className="w-full lg:w-56">
                <span className="sr-only">Lọc theo danh mục</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="luxury-input w-full px-4 py-3 rounded-sm text-sm tracking-wide"
                >
                  <option value="ALL">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2 flex-wrap" role="group" aria-label="Lọc theo độ khó">
                {difficultyOptions.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficultyFilter(level)}
                    aria-pressed={difficultyFilter === level}
                    className={`px-3 sm:px-4 py-2.5 rounded-sm text-[0.62rem] tracking-[0.12em] uppercase font-medium transition-all duration-300 border ${
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
          </section>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-4 bg-gradient-to-b from-[rgba(201,169,110,0.5)] to-transparent rounded-full" />
            <span className="text-[0.65rem] tracking-[0.2em] uppercase text-[rgba(245,240,235,0.4)]">
              {filtered.length} / {questions.length} câu hỏi
            </span>
          </div>

          {hasLoadError && (
            <p role="alert" className="mb-4 text-sm text-[#f87171]">
              Không thể tải danh sách câu hỏi. Vui lòng tải lại trang.
            </p>
          )}

          <div className="glass-card rounded-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[0.7rem] tracking-[0.15em] uppercase text-[rgba(245,240,235,0.35)]">
                  {hasLoadError ? 'Dữ liệu tạm thời không khả dụng' : 'Không tìm thấy câu hỏi nào'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px]">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                        Tiêu đề
                      </th>
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium hidden sm:table-cell">
                        Danh mục
                      </th>
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                        Độ khó
                      </th>
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium hidden lg:table-cell">
                        Độ phức tạp
                      </th>
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                        Test cases
                      </th>
                      <th scope="col" className="text-left px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium hidden md:table-cell">
                        Ngày tạo
                      </th>
                      <th scope="col" className="text-right px-5 py-4 text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                        {isAdmin ? 'Thao tác' : 'Chi tiết'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((question) => {
                      const colors = DIFFICULTY_COLORS[question.difficulty];
                      return (
                        <tr
                          key={question.id}
                          className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(201,169,110,0.03)] transition-colors duration-300 group"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => router.push(`/questions/${question.id}`)}
                              className="text-left text-sm text-[#f5f0eb] group-hover:text-[var(--accent-light)] transition-colors font-light tracking-wide"
                            >
                              {question.title}
                            </button>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-[0.7rem] text-[rgba(245,240,235,0.5)] tracking-wide">
                              {question.category || 'Chưa phân loại'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className="inline-block px-3 py-1 rounded-sm text-[0.6rem] tracking-[0.12em] uppercase font-medium border"
                              style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                            >
                              {question.difficulty}
                            </span>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <div className="space-y-1 text-[0.68rem] text-[rgba(245,240,235,0.55)]">
                              <p>Time: <code>{question.expected_time_complexity || '—'}</code></p>
                              <p>Space: <code>{question.expected_space_complexity || '—'}</code></p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1 text-[0.65rem] tabular-nums whitespace-nowrap">
                              <p className="text-[rgba(245,240,235,0.6)]">Public: {question.publicTestCaseCount}</p>
                              <p className="text-[rgba(245,240,235,0.4)]">Hidden: {question.hiddenTestCaseCount}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-[0.7rem] text-[rgba(245,240,235,0.4)] whitespace-nowrap">
                              {new Date(question.created_at).toLocaleDateString('vi-VN', {
                                timeZone: 'UTC',
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/questions/edit/${question.id}`)}
                                    className="px-3 py-1.5 rounded-sm text-[0.6rem] tracking-[0.1em] uppercase border border-[rgba(201,169,110,0.2)] text-[rgba(201,169,110,0.75)] hover:border-[rgba(201,169,110,0.4)] hover:text-[var(--accent)] transition-all"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(question.id, question.title)}
                                    className="px-3 py-1.5 rounded-sm text-[0.6rem] tracking-[0.1em] uppercase border border-[rgba(220,80,70,0.2)] text-[rgba(220,80,70,0.75)] hover:border-[rgba(220,80,70,0.4)] hover:text-[#f87171] hover:bg-[rgba(220,80,70,0.06)] transition-all"
                                  >
                                    Xóa
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/questions/${question.id}`)}
                                  className="px-3 py-1.5 rounded-sm text-[0.6rem] tracking-[0.08em] uppercase border border-[rgba(255,255,255,0.1)] text-[rgba(245,240,235,0.65)] hover:border-[rgba(201,169,110,0.3)] hover:text-[var(--accent)] transition-all"
                                >
                                  Xem chi tiết
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-center py-8">
            <div className="line-accent w-12 mx-auto mb-4" />
            <p className="text-[0.55rem] tracking-[0.25em] uppercase text-[rgba(245,240,235,0.2)] font-light">
              &copy; 2026 Tech Interview AI &mdash; All Rights Reserved
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
