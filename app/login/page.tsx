'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { signInDemoAccount } from '@/app/questions/actions';

type AuthMode = 'login' | 'register';

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

// ---------- Floating Particles Component ----------
function FloatingParticles() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 1 + (i % 4) * 0.65;
        const left = (i * 29) % 100;
        const duration = 15 + (i % 5) * 2.5;
        const delay = (i * 1.3) % 15;
        const opacity = 0.1 + (i % 4) * 0.06;
        return (
          <div
            key={i}
            className="particle"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              background: `rgba(201, 169, 110, ${opacity})`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Marquee Component ----------
function MarqueeBar() {
  const text = 'TECH INTERVIEW AI \u2022 ELEVATE YOUR CAREER \u2022 AI-POWERED MOCK INTERVIEWS \u2022 MASTER THE ART OF CODING \u2022 ';
  return (
    <div className="marquee-container border-b border-[rgba(255,255,255,0.04)] py-2.5">
      <div className="marquee-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className="text-[0.6rem] sm:text-[0.65rem] font-medium tracking-[0.3em] uppercase text-[rgba(201,169,110,0.35)] px-4"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mounted = true;
  const [demoLoading, setDemoLoading] = useState<'ADMIN' | 'INTERVIEWEE' | null>(null);

  // Track mouse for subtle parallax
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ---------- Validation ----------
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 characters';
    }

    if (mode === 'register' && !fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Sign In ----------
  const handleSignIn = async () => {
    if (!validate()) return;
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(error.message || 'Authentication failed', 'error');
      setIsLoading(false);
      return;
    }

    showToast('Welcome back', 'success');
    router.push('/profile');
  };

  // ---------- Sign Up ----------
  const handleSignUp = async () => {
    if (!validate()) return;
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });

    if (error) {
      showToast(error.message || 'Registration failed', 'error');
      setIsLoading(false);
      return;
    }

    if (data.user && !data.session) {
      showToast('Please check your email to verify your account', 'success');
      setIsLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName.trim() || 'New User',
        });

      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation error:', profileError);
        showToast('Account created but profile setup failed', 'error');
        setIsLoading(false);
        return;
      }
    }

    showToast('Account created successfully', 'success');
    router.push('/profile');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      void handleSignIn();
    } else {
      void handleSignUp();
    }
  };

  const handleDemoSignIn = async (role: 'ADMIN' | 'INTERVIEWEE') => {
    setDemoLoading(role);
    try {
      const result = await signInDemoAccount(role);
      if (!result.success) { showToast(result.error, 'error'); return; }
      router.push(result.redirectTo);
      router.refresh();
    } catch { showToast('Không thể kết nối máy chủ. Vui lòng thử lại.', 'error'); }
    finally { setDemoLoading(null); }
  };

  return (
    <div className="min-h-screen relative">
      {/* Animated background */}
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <FloatingParticles />

      {/* Glowing orbs */}
      <div
        className="glow-orb w-[400px] h-[400px] bg-[rgba(201,169,110,0.04)] top-[10%] right-[10%]"
        style={{
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      <div
        className="glow-orb w-[300px] h-[300px] bg-[rgba(120,100,160,0.03)] bottom-[20%] left-[5%]"
        style={{
          transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)`,
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] max-w-sm w-full px-5 py-4 rounded-sm toast-luxury ${
            toast.type === 'success' ? 'toast-success' : 'toast-error'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-light tracking-widest uppercase">
              {toast.type === 'success' ? '✦ Success' : '✦ Error'}
            </span>
          </div>
          <p className="text-sm mt-1 font-light leading-relaxed opacity-90">{toast.message}</p>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Marquee top bar */}
        <MarqueeBar />

        {/* Main layout */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-[480px]">

            {/* Logo & brand */}
            {mounted && (
              <div className="text-center mb-10 sm:mb-14">
                {/* Decorative top line */}
                <div className="line-accent-animate w-16 mx-auto mb-8 reveal-fade delay-1" />

                <h1
                  className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-wide text-accent-gradient reveal-up delay-2"
                  style={{
                    transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)`,
                    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  Tech Interview
                </h1>
                <p className="text-[0.65rem] sm:text-xs tracking-[0.4em] uppercase text-[rgba(201,169,110,0.4)] mt-3 font-light reveal-fade delay-3">
                  Artificial Intelligence
                </p>

                <div className="line-accent w-8 mx-auto mt-6 reveal-fade delay-4" />

                <p className="text-[0.7rem] tracking-[0.15em] text-[rgba(245,240,235,0.25)] mt-5 font-light reveal-fade delay-5">
                  {mode === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your account to begin.'}
                </p>
              </div>
            )}

            {/* Card */}
            {mounted && (
              <div className="glass-card rounded-sm p-6 sm:p-8 reveal-scale delay-4">
                {/* Tabs */}
                <div className="flex justify-center border-b border-[rgba(255,255,255,0.05)] mb-8">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrors({}); }}
                    className={`tab-luxury ${mode === 'login' ? 'active' : ''}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrors({}); }}
                    className={`tab-luxury ${mode === 'register' ? 'active' : ''}`}
                  >
                    Register
                  </button>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Full name (register only) */}
                  {mode === 'register' && (
                    <div className="reveal-up">
                      <label htmlFor="fullName" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.4)] mb-2">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                        placeholder="Your name"
                        className={`luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide ${errors.fullName ? 'input-error' : ''}`}
                      />
                      {errors.fullName && (
                        <p className="mt-1.5 text-[0.65rem] text-[#dc5046] tracking-wide">{errors.fullName}</p>
                      )}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.4)] mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                      placeholder="you@example.com"
                      className={`luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide ${errors.email ? 'input-error' : ''}`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-[0.65rem] text-[#dc5046] tracking-wide">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.4)] mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                      placeholder="Min. 6 characters"
                      className={`luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide ${errors.password ? 'input-error' : ''}`}
                    />
                    {errors.password && (
                      <p className="mt-1.5 text-[0.65rem] text-[#dc5046] tracking-wide">{errors.password}</p>
                    )}
                  </div>

                  {/* Decorative line */}
                  <div className="line-accent my-6" />

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading || Boolean(demoLoading)}
                    className="luxury-btn w-full py-4 rounded-sm"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing
                      </span>
                    ) : mode === 'login' ? (
                      'Sign In'
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                {mode === 'login' && (
                  <section className="mt-7 rounded-sm border border-[rgba(201,169,110,0.16)] bg-[rgba(201,169,110,0.035)] p-4 sm:p-5" aria-label="1-Click Recruiter Demo">
                    <div className="mb-4">
                      <h2 className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">1-Click Recruiter Demo</h2>
                      <p className="mt-1.5 text-xs leading-5 text-[rgba(245,240,235,0.38)]">Đăng nhập mẫu để xem giao diện theo từng vai trò. Tài khoản và mật khẩu được cấu hình riêng trên máy chủ.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => handleDemoSignIn('ADMIN')} disabled={Boolean(demoLoading) || isLoading} className="rounded-sm border border-[rgba(251,191,36,0.25)] px-3 py-3 text-[0.62rem] font-medium uppercase tracking-[0.1em] text-amber-200 transition-colors hover:bg-amber-300/10 disabled:opacity-45">
                        {demoLoading === 'ADMIN' ? 'Đang đăng nhập…' : 'Vào nhanh vai trò ADMIN'}
                      </button>
                      <button type="button" onClick={() => handleDemoSignIn('INTERVIEWEE')} disabled={Boolean(demoLoading) || isLoading} className="rounded-sm border border-[rgba(96,165,250,0.25)] px-3 py-3 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-blue-200 transition-colors hover:bg-blue-300/10 disabled:opacity-45">
                        {demoLoading === 'INTERVIEWEE' ? 'Đang đăng nhập…' : 'Vào nhanh vai trò ỨNG VIÊN'}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Bottom decorative */}
            {mounted && (
              <div className="text-center mt-8 sm:mt-10 reveal-fade delay-7">
                <div className="line-accent w-12 mx-auto mb-4" />
                <p className="text-[0.55rem] tracking-[0.35em] uppercase text-[rgba(245,240,235,0.12)] font-light">
                  &copy; 2026 Tech Interview AI &mdash; All Rights Reserved
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Bottom marquee */}
        <MarqueeBar />
      </div>
    </div>
  );
}
