import type { InterviewSession, InterviewSessionMode } from '@/types/database';

export const SESSION_COLUMNS = 'id, interviewer_id, interviewee_id, question_id, session_mode, status, scheduled_at, created_at';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScheduleInterviewInput {
  question_id: string;
  session_mode: InterviewSessionMode;
  interviewer_id: string | null;
  scheduled_at: string;
  start_now: boolean;
}

export function validateSchedule(input: ScheduleInterviewInput, userId: string, now: number) {
  if (!input || typeof input !== 'object') return 'Dữ liệu lịch hẹn không hợp lệ.';
  if (typeof input.question_id !== 'string' || !UUID_PATTERN.test(input.question_id)) return 'Hãy chọn một đề bài hợp lệ.';
  if (!['PEER_TO_PEER', 'AI_MOCK_INTERVIEW'].includes(input.session_mode)) return 'Chế độ phỏng vấn không hợp lệ.';
  if (typeof input.start_now !== 'boolean') return 'Lựa chọn thời gian không hợp lệ.';
  if (input.session_mode === 'AI_MOCK_INTERVIEW') {
    if (input.interviewer_id !== null) return 'Phòng AI không có người phỏng vấn thứ hai.';
  } else {
    if (typeof input.interviewer_id !== 'string' || !UUID_PATTERN.test(input.interviewer_id)) return 'Nhập mã hồ sơ UUID của người phỏng vấn.';
    if (input.interviewer_id.toLowerCase() === userId.toLowerCase()) return 'Chọn một người phỏng vấn khác bạn.';
    if (input.start_now) return 'Chế độ bắt đầu ngay dành cho phòng AI.';
  }
  if (!input.start_now) {
    if (typeof input.scheduled_at !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(input.scheduled_at)) return 'Thời gian cần có múi giờ.';
    const scheduled = Date.parse(input.scheduled_at);
    if (!Number.isFinite(scheduled) || scheduled <= now) return 'Chọn thời gian trong tương lai.';
    if (scheduled > now + 366 * 24 * 60 * 60 * 1000) return 'Chỉ có thể đặt lịch trong vòng một năm.';
  }
  return null;
}

export function canAccessInterview(session: InterviewSession, userId: string, role?: string) {
  return role === 'ADMIN' || session.interviewee_id === userId || session.interviewer_id === userId;
}

export function interviewDatabaseError(error: { code?: string }) {
  if (['42703', 'PGRST204', 'PGRST205', '42P01', '22P02'].includes(error.code ?? '')) {
    return 'Hệ thống lịch phỏng vấn chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.';
  }
  if (error.code === '23503') return 'Đề bài hoặc mã hồ sơ người tham gia không tồn tại.';
  if (error.code === '42501') return 'Chính sách RLS chưa cho phép thao tác này với tài khoản của bạn.';
  return 'Không thể xử lý lịch phỏng vấn. Vui lòng thử lại sau.';
}

export const MODE_LABELS = { PEER_TO_PEER: 'Ghép cặp hai người', AI_MOCK_INTERVIEW: 'Phỏng vấn với AI' };
export const STATUS_LABELS = { SCHEDULED: 'Đã đặt lịch', LIVE: 'Đang diễn ra', COMPLETED: 'Đã hoàn thành', EXPIRED: 'Đã hết hạn' };

export function formatInterviewTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}
