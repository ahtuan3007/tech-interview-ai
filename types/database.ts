export type UserRole = 'ADMIN' | 'INTERVIEWEE';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type InterviewSessionMode = 'PEER_TO_PEER' | 'AI_MOCK_INTERVIEW';
export type InterviewSessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'EXPIRED';

export interface InterviewSession {
  id: string;
  interviewer_id: string | null;
  interviewee_id: string;
  question_id: string;
  session_mode: InterviewSessionMode;
  status: InterviewSessionStatus;
  scheduled_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  target_level: string | null;
  is_demo_account: boolean | null;
}

export interface QuestionTestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  explanation?: string;
}

export interface StarterCode {
  typescript: string;
  javascript: string;
  python: string;
}

export interface Question {
  id: string;
  title: string;
  category: string;
  difficulty: QuestionDifficulty;
  content: string;
  expected_time_complexity: string;
  expected_space_complexity: string;
  test_cases: QuestionTestCase[];
  starter_code: StarterCode;
  hints: string[];
  created_at: string;
  updated_at: string;
}
