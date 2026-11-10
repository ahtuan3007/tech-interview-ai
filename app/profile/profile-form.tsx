'use client';

import { useState } from 'react';
import type { Profile } from '@/types/database';
import { saveProfile } from './actions';

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.full_name ?? '');
  const [level, setLevel] = useState(profile.target_level ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  return <main className="relative z-10 mx-auto w-full max-w-xl px-4 py-12 text-white/80">
    <h1 className="mb-8 font-serif text-3xl text-[var(--accent)]">Hồ sơ của bạn</h1>
    <form className="glass-card space-y-6 rounded p-6" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setMessage('');
      try {
        const result = await saveProfile(name, level);
        setMessage(result.error || 'Đã lưu hồ sơ.');
      } catch { setMessage('Không thể kết nối máy chủ. Vui lòng thử lại.'); }
      finally { setPending(false); }
    }}>
      <p className="text-sm">Vai trò: <strong className={profile.role === 'ADMIN' ? 'text-orange-300' : 'text-blue-300'}>{profile.role}</strong>{profile.is_demo_account && ' · Tài khoản demo'}</p>
      <label className="block text-sm">Tên hiển thị<input required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className="luxury-input mt-2 w-full rounded px-4 py-3" /></label>
      <label className="block text-sm">Cấp độ mục tiêu<select value={level} onChange={(event) => setLevel(event.target.value)} className="luxury-input mt-2 w-full rounded px-4 py-3"><option value="">Chưa chọn</option>{['JUNIOR', 'MID', 'SENIOR'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      {message && <p role="status" className="text-sm">{message}</p>}
      <button disabled={pending} className="luxury-btn rounded px-6 py-3 disabled:opacity-50">{pending ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
    </form>
  </main>;
}
