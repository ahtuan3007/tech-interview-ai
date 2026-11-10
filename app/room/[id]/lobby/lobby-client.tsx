'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterInterview } from '@/app/interviews/actions';
import { formatInterviewTime, MODE_LABELS, STATUS_LABELS } from '@/utils/interviews/validation';
import type { InterviewSession } from '@/types/database';

export default function LobbyClient({ session, question, hasQuestionError, userId, initialNow }: {
  session: InterviewSession; question: { id: string; title: string; category: string; difficulty: string } | null;
  hasQuestionError: boolean; userId: string; initialNow: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const [microphone, setMicrophone] = useState(true);
  const [camera, setCamera] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = Math.max(0, Math.ceil((Date.parse(session.scheduled_at) - now) / 1000));
  const active = session.status === 'SCHEDULED' || session.status === 'LIVE';
  const ai = session.session_mode === 'AI_MOCK_INTERVIEW';

  return <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 text-white/80 sm:px-6">
    <Link href="/interviews" className="text-sm text-[var(--accent)]">← Lịch phỏng vấn</Link>
    <div className="mt-8 flex flex-wrap items-center gap-4"><p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Interview Lobby</p><span className="rounded border border-white/15 px-3 py-1 text-xs text-white/55">{STATUS_LABELS[session.status] ?? session.status}</span></div>
    <h1 className="mt-4 font-serif text-3xl sm:text-4xl">{ai ? 'Phòng chờ phỏng vấn AI' : 'Sẵn sàng cho cuộc phỏng vấn'}</h1>
    <div className="mt-8 grid items-start gap-6 md:grid-cols-2">
      <section className="glass-card space-y-5 rounded-sm p-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--accent)]">Thông tin phiên</h2>
        <div><p className="text-xs text-white/40">Đề bài</p><p className="mt-2 font-serif text-2xl">{question?.title ?? 'Không tải được đề bài'}</p>{question && <p className="mt-2 text-xs text-white/45">{question.category} · {question.difficulty}</p>}</div>
        <div><p className="text-xs text-white/40">Chế độ</p><p className="mt-2 text-sm">{MODE_LABELS[session.session_mode]}</p></div>
        <div><p className="text-xs text-white/40">Giờ hẹn · Việt Nam (UTC+7)</p><p className="mt-2 text-sm">{formatInterviewTime(session.scheduled_at)}</p></div>
        <div><p className="text-xs text-white/40">Vai trò của bạn</p><p className="mt-2 text-sm">{session.interviewee_id === userId ? 'Ứng viên' : session.interviewer_id === userId ? 'Người phỏng vấn' : 'Quản trị viên'}</p></div>
        {!ai && <div><p className="text-xs text-white/40">Người phỏng vấn được chỉ định</p><code className="mt-2 block break-all text-xs">{session.interviewer_id ?? 'Chưa chỉ định'}</code></div>}
        <label className="block text-xs text-white/40">Mã phòng<input readOnly value={session.id} className="luxury-input mt-2 w-full rounded px-3 py-2 font-mono text-xs" /></label>
        <button type="button" className="text-xs text-[var(--accent)]" onClick={async () => {
          try { await navigator.clipboard.writeText(`${window.location.origin}/room/${session.id}/lobby`); setMessage('Đã sao chép liên kết phòng chờ.'); }
          catch { setMessage('Không sao chép được tự động. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.'); }
        }}>Sao chép liên kết phòng chờ</button>
        <p className="text-xs leading-5 text-white/40">Liên kết chỉ mở được với người tham gia đã chỉ định hoặc ADMIN.</p>
      </section>
      <section className="glass-card space-y-6 rounded-sm p-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--accent)]">Kiểm tra trước khi vào phòng</h2>
        <div className="flex aspect-video items-center justify-center rounded border border-white/10 bg-black/40 text-sm text-white/45">{camera ? 'Camera mô phỏng đang bật' : 'Camera mô phỏng đang tắt'}</div>
        <div className="flex flex-wrap gap-3"><button type="button" aria-pressed={microphone} onClick={() => setMicrophone(!microphone)} className="luxury-btn-outline rounded px-4 py-3 text-xs">Micro: {microphone ? 'Bật' : 'Tắt'}</button><button type="button" aria-pressed={camera} onClick={() => setCamera(!camera)} className="luxury-btn-outline rounded px-4 py-3 text-xs">Camera: {camera ? 'Bật' : 'Tắt'}</button></div>
        <p className="text-xs leading-5 text-white/40">Kiểm tra thiết bị hiện là mô phỏng; trang này chưa truy cập micro/camera thật.</p>
        {ai && <div className="rounded border border-[var(--accent)]/30 bg-amber-200/5 p-4 text-sm leading-6 text-amber-100">Phiên AI khởi tạo độc lập, không cần chờ người phỏng vấn thứ hai. Khung code và chấm điểm AI sẽ được tích hợp ở các giai đoạn tiếp theo.</div>}
        {!active && <p className="text-sm text-amber-200">Phiên đã kết thúc hoặc hết hạn. Bạn có thể đặt một lịch mới.</p>}
        {active && remaining > 0 && <p role="status" className="text-sm text-amber-200">Còn {Math.floor(remaining / 3600)} giờ {Math.floor(remaining % 3600 / 60)} phút {remaining % 60} giây đến lịch hẹn.</p>}
        {hasQuestionError && <p role="alert" className="text-sm text-red-300">Đề bài không còn khả dụng. Hãy tải lại hoặc tạo lịch khác.</p>}
        {message && <p role="status" className="text-sm text-amber-100">{message}</p>}
        <button disabled={!active || remaining > 0 || pending || hasQuestionError} className="luxury-btn w-full rounded px-5 py-4 text-sm disabled:opacity-40" onClick={async () => {
          setPending(true); setMessage('');
          try {
            const result = await enterInterview(session.id);
            if (!result.success) { setMessage(result.error); return; }
            router.push(result.roomPath); router.refresh();
          } catch { setMessage('Không thể vào phòng. Kiểm tra kết nối rồi thử lại.'); }
          finally { setPending(false); }
        }}>{pending ? 'Đang mở phòng…' : ai ? 'Khởi tạo phiên AI và vào phòng' : 'Vào phòng trực tuyến'}</button>
      </section>
    </div>
  </main>;
}
