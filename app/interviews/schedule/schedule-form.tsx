'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleInterview } from '../actions';
import type { InterviewSessionMode } from '@/types/database';

interface QuestionOption { id: string; title: string; category: string; difficulty: string }

export default function ScheduleForm({ questions, userId, initialQuestion, hasLoadError, schemaError }: {
  questions: QuestionOption[]; userId: string; initialQuestion?: string; hasLoadError: boolean; schemaError: string | null;
}) {
  const router = useRouter();
  const [questionId, setQuestionId] = useState(questions.some((q) => q.id === initialQuestion) ? initialQuestion! : '');
  const [mode, setMode] = useState<InterviewSessionMode>('AI_MOCK_INTERVIEW');
  const [startNow, setStartNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inputClass = 'luxury-input mt-2 w-full rounded-sm px-4 py-3 text-sm';

  return <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 text-white/80 sm:px-6">
    <Link href="/interviews" className="text-sm text-[var(--accent)]">← Lịch phỏng vấn</Link>
    <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Interview Scheduling</p>
    <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Chuẩn bị cho cuộc phỏng vấn tiếp theo</h1>
    <p className="mt-3 text-sm leading-6 text-white/50">Chọn đề bài, người đồng hành và thời gian. Mỗi lịch hẹn có một mã phòng riêng.</p>
    <form className="glass-card mt-8 space-y-7 rounded-sm p-5 sm:p-8" onSubmit={async (event) => {
      event.preventDefault(); setError(''); setPending(true);
      try {
        const instant = mode === 'AI_MOCK_INTERVIEW' && startNow;
        const date = instant ? '' : new Date(`${scheduledAt}:00+07:00`).toISOString();
        const result = await scheduleInterview({ question_id: questionId, session_mode: mode,
          interviewer_id: mode === 'PEER_TO_PEER' ? interviewerId.trim() : null,
          scheduled_at: date, start_now: instant });
        if (!result.success) { setError(result.error); return; }
        router.push(result.lobbyPath); router.refresh();
      } catch { setError('Không thể tạo lịch. Kiểm tra thời gian và kết nối rồi thử lại.'); }
      finally { setPending(false); }
    }}>
      {hasLoadError && <p role="alert" className="text-sm text-red-300">Không tải được danh sách đề bài. Vui lòng tải lại trang.</p>}
      {schemaError && <p role="alert" className="rounded border border-amber-200/25 bg-amber-200/5 p-4 text-sm text-amber-100">{schemaError}</p>}
      {!hasLoadError && !questions.length && <p className="text-sm text-amber-200">Chưa có đề bài khả dụng. Hãy liên hệ quản trị viên.</p>}
      <label className="block text-sm">Đề bài thuật toán<select required value={questionId} onChange={(e) => setQuestionId(e.target.value)} className={inputClass}>
        <option value="">Chọn đề bài</option>{questions.map((q) => <option key={q.id} value={q.id}>{q.title} · {q.difficulty} · {q.category}</option>)}
      </select></label>
      <fieldset><legend className="mb-3 text-sm">Chế độ tham gia</legend><div className="grid gap-3 sm:grid-cols-2">
        {([{ value: 'AI_MOCK_INTERVIEW', title: '01 · Phỏng vấn với AI', description: 'Phòng độc lập dành cho bạn, có thể khởi tạo ngay.' },
          { value: 'PEER_TO_PEER', title: '02 · Ghép cặp hai người', description: 'Hẹn một người phỏng vấn bằng mã hồ sơ của họ.' }] as const).map((option) =>
          <label key={option.value} className={`cursor-pointer rounded-sm border p-5 ${mode === option.value ? 'border-[var(--accent)] bg-amber-200/5' : 'border-white/10'}`}>
            <input type="radio" name="mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} className="mr-3 accent-amber-300" />
            <span className="text-sm">{option.title}</span><span className="mt-2 block text-xs leading-5 text-white/45">{option.description}</span>
          </label>)}
      </div></fieldset>
      {mode === 'PEER_TO_PEER' && <div className="space-y-3">
        <label className="block text-sm">Mã hồ sơ người phỏng vấn<input required value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} maxLength={36} placeholder="UUID của người bạn mời" className={`${inputClass} font-mono`} /></label>
        <p className="text-xs leading-6 text-white/45">Nhờ người phỏng vấn gửi mã hồ sơ của họ từ trang đặt lịch. Chỉ hai người được chỉ định và ADMIN mới được vào phòng.</p>
      </div>}
      <div className="rounded-sm border border-white/10 p-4"><p className="text-xs text-white/45">Mã hồ sơ của bạn — chia sẻ mã này khi người khác mời bạn phỏng vấn</p><code className="mt-2 block break-all text-xs text-[var(--accent)]">{userId}</code></div>
      {mode === 'AI_MOCK_INTERVIEW' && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="accent-amber-300" />Bắt đầu ngay với AI</label>}
      {(mode === 'PEER_TO_PEER' || !startNow) && <label className="block text-sm">Thời gian hẹn · Giờ Việt Nam (UTC+7)<input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} /><span className="mt-2 block text-xs text-white/45">Chọn thời điểm trong tương lai, tối đa một năm.</span></label>}
      {error && <p role="alert" className="rounded-sm border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
      <button disabled={pending || !questions.length || hasLoadError || Boolean(schemaError)} className="luxury-btn w-full rounded-sm px-6 py-4 disabled:opacity-40">{pending ? 'Đang tạo phòng…' : mode === 'AI_MOCK_INTERVIEW' && startNow ? 'Tạo phòng AI và vào phòng chờ' : 'Tạo lịch phỏng vấn'}</button>
    </form>
  </main>;
}
