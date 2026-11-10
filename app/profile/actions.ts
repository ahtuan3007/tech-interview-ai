'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function saveProfile(fullName: string, targetLevel: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Bạn cần đăng nhập.' };
  if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 200 ||
    !['', 'JUNIOR', 'MID', 'SENIOR'].includes(targetLevel)) return { error: 'Tên hoặc cấp độ không hợp lệ.' };
  const { data, error } = await supabase.from('profiles').update({
    full_name: fullName.trim(), target_level: targetLevel || null,
  }).eq('id', user.id).select('id').maybeSingle();
  if (error || !data) return { error: 'Không lưu được hồ sơ. Vui lòng thử lại.' };
  revalidatePath('/', 'layout');
  return { success: true };
}
