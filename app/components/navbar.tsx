import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
    : { data: null };

  return (
    <nav aria-label="Điều hướng chính" className="relative z-50 border-b border-white/10 bg-[#090909] px-4 py-3 text-sm text-white/75">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <Link href="/questions" className="font-serif text-lg text-[var(--accent)]">Tech Interview AI</Link>
        <Link href="/questions" className="hover:text-white">Đề thi</Link>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-xs text-emerald-300">RLS Guard: Active</span>
          {user ? <>
            <Link href="/profile" className="max-w-52 truncate">{profile?.full_name || user.email || 'Kỹ sư Phần mềm'}</Link>
            {profile?.role && <span className={`rounded border px-2 py-1 text-xs ${profile.role === 'ADMIN' ? 'border-orange-400/30 text-orange-300' : 'border-blue-400/30 text-blue-300'}`}>ROLE: {profile.role}</span>}
            <form action={async () => {
              'use server';
              const client = await createClient();
              await client.auth.signOut();
              const { redirect } = await import('next/navigation');
              redirect('/login');
            }}><button className="text-xs hover:text-white">Đăng xuất</button></form>
          </> : <Link href="/login">Đăng nhập</Link>}
        </div>
      </div>
    </nav>
  );
}
