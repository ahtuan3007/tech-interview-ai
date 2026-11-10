'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import type { QuestionDifficulty, QuestionTestCase, StarterCode } from '@/types/database';

export interface QuestionInput {
  title: string;
  category: string;
  difficulty: QuestionDifficulty;
  content: string;
  expected_time_complexity: string;
  expected_space_complexity: string;
  test_cases: QuestionTestCase[];
  starter_code: StarterCode;
  hints: string[];
}

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Bạn cần đăng nhập bằng tài khoản Admin.' } as const;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'ADMIN') {
    return { error: 'Bạn không có quyền thực hiện thao tác này.' } as const;
  }

  return { supabase } as const;
}

function validateQuestion(input: QuestionInput) {
  if (!input || typeof input !== 'object') return 'Dữ liệu câu hỏi không hợp lệ.';
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200) return 'Tiêu đề cần có 1–200 ký tự.';
  if (typeof input.category !== 'string' || !input.category.trim() || input.category.length > 100) return 'Danh mục cần có 1–100 ký tự.';
  if (typeof input.content !== 'string' || !input.content.trim() || input.content.length > 15000) return 'Nội dung cần có 1–15.000 ký tự.';
  if (!['EASY', 'MEDIUM', 'HARD'].includes(input.difficulty)) return 'Độ khó không hợp lệ.';
  for (const value of [input.expected_time_complexity, input.expected_space_complexity]) {
    if (typeof value !== 'string' || !value.trim() || value.length > 100) return 'Độ phức tạp không hợp lệ.';
  }
  if (!Array.isArray(input.test_cases) || input.test_cases.length < 1 || input.test_cases.length > 100) return 'Cần có từ 1 đến 100 test case.';
  const ids = new Set<string>();
  for (const [index, item] of input.test_cases.entries()) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim() || item.id.length > 100 || ids.has(item.id) ||
      typeof item.input !== 'string' || typeof item.expected_output !== 'string' || !item.expected_output.trim() ||
      item.input.length > 20000 || item.expected_output.length > 20000 || typeof item.is_hidden !== 'boolean' ||
      (item.explanation !== undefined && (typeof item.explanation !== 'string' || item.explanation.length > 2000))) return `Test case #${index + 1} không hợp lệ.`;
    if (/^TODO\b/i.test(item.expected_output.trim())) return `Hãy xác nhận output test case #${index + 1} trước khi lưu.`;
    ids.add(item.id);
  }
  if (!input.starter_code || typeof input.starter_code !== 'object' ||
    !['typescript', 'javascript', 'python'].every((key) => {
      const value = input.starter_code[key as keyof StarterCode];
      return typeof value === 'string' && value.length <= 20000;
    })) return 'Starter code không hợp lệ (tối đa 20.000 ký tự mỗi ngôn ngữ).';
  if (!Array.isArray(input.hints) || input.hints.length > 20 || input.hints.some((hint) => typeof hint !== 'string' || hint.length > 2000)) return 'Gợi ý tối đa 20 mục, mỗi mục tối đa 2.000 ký tự.';
  return null;
}

export async function saveQuestion(input: QuestionInput, questionId?: string) {
  const auth = await getAdminClient();
  if ('error' in auth) return { success: false as const, error: auth.error };

  const validationError = validateQuestion(input);
  if (validationError) return { success: false as const, error: validationError };
  if (questionId && !/^[0-9a-f-]{36}$/i.test(questionId)) {
    return { success: false as const, error: 'Mã câu hỏi không hợp lệ.' };
  }

  const payload = {
    title: input.title.trim(),
    category: input.category.trim(),
    difficulty: input.difficulty,
    content: input.content.trim(),
    expected_time_complexity: input.expected_time_complexity.trim(),
    expected_space_complexity: input.expected_space_complexity.trim(),
    test_cases: input.test_cases.map((testCase) => ({
      id: testCase.id,
      input: testCase.input,
      expected_output: testCase.expected_output,
      is_hidden: testCase.is_hidden,
      explanation: testCase.explanation?.trim() || undefined,
    })),
    starter_code: { typescript: input.starter_code.typescript, javascript: input.starter_code.javascript, python: input.starter_code.python },
    hints: input.hints.map((hint) => hint.trim()).filter(Boolean),
  };

  const result = questionId
    ? await auth.supabase.from('questions').update(payload).eq('id', questionId).select('id').maybeSingle()
    : await auth.supabase.from('questions').insert(payload).select('id').single();

  if (result.error) return { success: false as const, error: result.error.message };
  if (!result.data?.id) return { success: false as const, error: 'Không tìm thấy đề bài cần cập nhật.' };

  revalidatePath('/questions');
  revalidatePath(`/questions/${result.data.id}`);
  revalidatePath(`/questions/edit/${result.data.id}`);
  revalidatePath(`/questions/${result.data.id}/edit`);
  return { success: true as const, id: result.data.id };
}

export async function deleteQuestion(questionId: string) {
  const auth = await getAdminClient();
  if ('error' in auth) return { success: false as const, error: auth.error };
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) {
    return { success: false as const, error: 'Mã câu hỏi không hợp lệ.' };
  }

  const { data, error } = await auth.supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
    .select('id')
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: 'Không tìm thấy đề bài cần xóa.' };

  revalidatePath('/questions');
  return { success: true as const };
}

export async function signInDemoAccount(role: 'ADMIN' | 'INTERVIEWEE') {
  if (role !== 'ADMIN' && role !== 'INTERVIEWEE') return { success: false as const, error: 'Vai trò demo không hợp lệ.' };
  const prefix = role === 'ADMIN' ? 'DEMO_ADMIN' : 'DEMO_INTERVIEWEE';
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    return {
      success: false as const,
      error: `Tài khoản demo ${role} chưa được cấu hình trên máy chủ (${prefix}_EMAIL / ${prefix}_PASSWORD).`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false as const, error: 'Đăng nhập demo thất bại. Vui lòng kiểm tra tài khoản demo.' };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  if (profile?.role !== role) {
    await supabase.auth.signOut();
    return { success: false as const, error: `Tài khoản demo chưa có quyền ${role} trong profiles.` };
  }

  return { success: true as const, redirectTo: '/questions' };
}
