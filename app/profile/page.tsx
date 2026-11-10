import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileForm from './profile-form';
import type { Profile } from '@/types/database';

export default function ProfilePage() {
  return <Suspense fallback={<p className="p-8 text-white/60">Đang tải hồ sơ…</p>}><ProfileContent /></Suspense>;
}

async function ProfileContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('profiles')
    .select('id, full_name, avatar_url, target_level, role, is_demo_account').eq('id', user.id).maybeSingle();
  if (error || !data) return <p role="alert" className="p-8 text-red-300">Không tải được hồ sơ. Vui lòng thử lại sau.</p>;
  return <ProfileForm profile={data as Profile} />;
}
