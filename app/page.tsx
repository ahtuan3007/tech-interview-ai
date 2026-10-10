'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function Home() {
  const [status, setStatus] = useState<string>('Chưa test');

  const testConnection = async () => {
    setStatus('Đang gọi API Supabase...');
    try {
      // Gọi thử vào bảng profiles xem có bị vướng kết nối không
      const { data, error } = await supabase.from('profiles').select('*').limit(1);

      if (error) {
        setStatus('LỖI KẾT NỐI: ' + error.message);
      } else {
        setStatus('KẾT NỐI THÀNH CÔNG! Dữ liệu trả về: ' + JSON.stringify(data));
      }
    } catch (err: any) {
      setStatus('LỖI HỆ THỐNG: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gray-950 text-white">
      <h1 className="text-3xl font-bold">Công cụ Test Supabase</h1>

      <button
        onClick={testConnection}
        className="px-6 py-3 font-semibold bg-green-600 rounded-lg hover:bg-green-500 active:scale-95 transition-all"
      >
        Bấm để Test Kết Nối
      </button>

      <div className="mt-4 p-4 w-full max-w-2xl border border-gray-700 rounded-lg bg-gray-900">
        <p className="text-gray-400 mb-2">Trạng thái phản hồi:</p>
        <code className="block w-full p-4 bg-black rounded text-green-400 whitespace-pre-wrap break-words">
          {status}
        </code>
      </div>
    </div>
  );
}