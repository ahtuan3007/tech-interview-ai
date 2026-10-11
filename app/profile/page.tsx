'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

// ---------- Data ----------
const TECH_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'FastAPI',
  'Java', 'Spring Boot', 'Go', 'Rust', 'C#', '.NET',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'GCP', 'Azure', 'Git', 'CI/CD', 'GraphQL',
  'TailwindCSS', 'Sass', 'Figma', 'Flutter', 'React Native', 'Swift',
];

const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer',
  'DevOps Engineer', 'Data Engineer', 'ML Engineer',
  'Mobile Developer', 'QA Engineer', 'UI/UX Designer',
  'Tech Lead', 'Engineering Manager', 'Product Manager',
  'System Architect', 'Security Engineer', 'SRE',
];

interface Profile {
  full_name: string;
  tech_stack: string[];
  role: string;
  bio: string;
}

// ---------- Floating Particles ----------
function FloatingParticles() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => {
        const size = Math.random() * 2.5 + 1;
        const left = Math.random() * 100;
        const dur = Math.random() * 25 + 15;
        const delay = Math.random() * 15;
        const opacity = Math.random() * 0.25 + 0.05;
        return (
          <div
            key={i}
            className="particle"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              background: `rgba(201, 169, 110, ${opacity})`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------- Marquee ----------
function MarqueeBar() {
  const text = 'TECH INTERVIEW AI \u2022 PROFILE DASHBOARD \u2022 ELEVATE YOUR CAREER \u2022 AI-POWERED INTERVIEWS \u2022 ';
  return (
    <div className="marquee-container border-b border-[rgba(255,255,255,0.04)] py-2.5">
      <div className="marquee-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="text-[0.6rem] font-medium tracking-[0.3em] uppercase text-[rgba(201,169,110,0.3)] px-4">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const techInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    tech_stack: [],
    role: '',
    bio: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [techInput, setTechInput] = useState('');
  const [showTechSuggestions, setShowTechSuggestions] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ---------- Load user & profile ----------
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, tech_stack, role, bio')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile load error:', error);
        showToast('Failed to load profile', 'error');
      } else if (data) {
        setProfile({
          full_name: data.full_name || '',
          tech_stack: data.tech_stack || [],
          role: data.role || '',
          bio: data.bio || '',
        });
      }
      setIsLoading(false);
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Save ----------
  const handleSave = async () => {
    if (!user) return;
    if (!profile.full_name.trim()) { showToast('Full name is required', 'error'); return; }

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name.trim(),
        tech_stack: profile.tech_stack,
        role: profile.role.trim(),
        bio: profile.bio.trim(),
      })
      .eq('id', user.id);

    if (error) {
      showToast('Save failed: ' + error.message, 'error');
    } else {
      showToast('Profile updated successfully', 'success');
    }
    setIsSaving(false);
  };

  // ---------- Sign out ----------
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ---------- Tech stack ----------
  const addTech = (tech: string) => {
    const trimmed = tech.trim();
    if (trimmed && !profile.tech_stack.includes(trimmed)) {
      setProfile((p) => ({ ...p, tech_stack: [...p.tech_stack, trimmed] }));
    }
    setTechInput('');
    setShowTechSuggestions(false);
  };

  const removeTech = (tech: string) => {
    setProfile((p) => ({ ...p, tech_stack: p.tech_stack.filter((t) => t !== tech) }));
  };

  const filteredTech = TECH_SUGGESTIONS.filter(
    (t) => t.toLowerCase().includes(techInput.toLowerCase()) && !profile.tech_stack.includes(t)
  );

  const filteredRoles = ROLE_SUGGESTIONS.filter((r) =>
    r.toLowerCase().includes(profile.role.toLowerCase())
  );

  // ---------- Loading ----------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="luxury-bg" />
        <div className="grain-overlay" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-10 h-10 border border-[rgba(201,169,110,0.3)] border-t-[rgba(201,169,110,0.8)] rounded-full animate-spin" />
          <span className="text-[0.65rem] tracking-[0.3em] uppercase text-[rgba(201,169,110,0.4)]">
            Loading Profile
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="luxury-bg" />
      <div className="grain-overlay" />
      <FloatingParticles />

      {/* Glowing orbs */}
      <div
        className="glow-orb w-[350px] h-[350px] bg-[rgba(201,169,110,0.03)] top-[5%] right-[15%]"
        style={{
          transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)`,
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm w-full px-5 py-4 rounded-sm toast-luxury ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          <span className="text-sm font-light tracking-widest uppercase">
            {toast.type === 'success' ? '✦ Success' : '✦ Error'}
          </span>
          <p className="text-sm mt-1 font-light leading-relaxed opacity-90">{toast.message}</p>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top marquee */}
        <MarqueeBar />

        {/* Header */}
        <header className="sticky top-0 z-40 bg-[rgba(5,5,5,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-xl sm:text-2xl font-light tracking-wide text-accent-gradient">
                Profile
              </h1>
              <div className="hidden sm:block h-4 w-px bg-[rgba(255,255,255,0.06)]" />
              <span className="hidden sm:block text-[0.6rem] tracking-[0.25em] uppercase text-[rgba(245,240,235,0.25)]">
                Dashboard
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="luxury-btn-outline px-4 py-2 rounded-sm"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

          {/* User identity card */}
          {mounted && (
            <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-1">
              <div className="flex items-center gap-5 sm:gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[rgba(201,169,110,0.2)] to-[rgba(201,169,110,0.05)] border border-[rgba(201,169,110,0.15)] flex items-center justify-center">
                    <span className="font-serif text-2xl sm:text-3xl font-light text-accent-gradient">
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 pulse-dot" />
                </div>
                {/* Info */}
                <div className="min-w-0">
                  <h2 className="font-serif text-xl sm:text-2xl font-light text-[#f5f0eb] truncate">
                    {profile.full_name || 'Unnamed'}
                  </h2>
                  <p className="text-[0.65rem] tracking-[0.15em] text-[rgba(245,240,235,0.3)] mt-1 truncate">
                    {user?.email}
                  </p>
                  {profile.role && (
                    <p className="text-[0.6rem] tracking-[0.2em] uppercase text-[rgba(201,169,110,0.5)] mt-2">
                      {profile.role}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit card */}
          {mounted && (
            <div className="glass-card rounded-sm p-6 sm:p-8 reveal-up delay-3">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-5 bg-gradient-to-b from-[rgba(201,169,110,0.6)] to-transparent rounded-full" />
                <h3 className="text-[0.7rem] tracking-[0.25em] uppercase text-[rgba(201,169,110,0.6)] font-medium">
                  Edit Profile
                </h3>
              </div>

              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="profileFullName" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                    Full Name
                  </label>
                  <input
                    id="profileFullName"
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                    className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                    placeholder="Enter your name..."
                  />
                </div>

                <div className="line-accent" />

                {/* Role */}
                <div className="relative">
                  <label htmlFor="profileRole" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                    Role
                  </label>
                  <input
                    id="profileRole"
                    type="text"
                    value={profile.role}
                    onChange={(e) => { setProfile((p) => ({ ...p, role: e.target.value })); setShowRoleSuggestions(true); }}
                    onFocus={() => setShowRoleSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 200)}
                    className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                    placeholder="e.g. Frontend Developer"
                  />
                  {showRoleSuggestions && profile.role && filteredRoles.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full suggestion-dropdown rounded-sm shadow-2xl max-h-48 overflow-y-auto">
                      {filteredRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onMouseDown={() => { setProfile((p) => ({ ...p, role })); setShowRoleSuggestions(false); }}
                          className="suggestion-item w-full text-left"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="line-accent" />

                {/* Tech Stack */}
                <div>
                  <label htmlFor="techStackInput" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                    Tech Stack
                  </label>

                  {/* Tags */}
                  {profile.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.tech_stack.map((tech, idx) => (
                        <span
                          key={tech}
                          className="tech-tag rounded-sm reveal-scale"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTech(tech)}
                            aria-label={`Remove ${tech}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="relative">
                    <input
                      id="techStackInput"
                      ref={techInputRef}
                      type="text"
                      value={techInput}
                      onChange={(e) => { setTechInput(e.target.value); setShowTechSuggestions(true); }}
                      onFocus={() => setShowTechSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTechSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); if (techInput.trim()) addTech(techInput); }
                      }}
                      className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide"
                      placeholder="Type a technology and press Enter..."
                    />
                    {showTechSuggestions && techInput && filteredTech.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full suggestion-dropdown rounded-sm shadow-2xl max-h-48 overflow-y-auto">
                        {filteredTech.slice(0, 8).map((tech) => (
                          <button
                            key={tech}
                            type="button"
                            onMouseDown={() => addTech(tech)}
                            className="suggestion-item w-full text-left"
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="line-accent" />

                {/* Bio */}
                <div>
                  <label htmlFor="profileBio" className="block text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(245,240,235,0.35)] mb-2">
                    Bio
                  </label>
                  <textarea
                    id="profileBio"
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    className="luxury-input w-full px-4 py-3.5 rounded-sm text-sm tracking-wide resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Decorative line */}
                <div className="line-accent-animate" />

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="luxury-btn w-full py-4 rounded-sm mt-2"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-3">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bottom decorative */}
          {mounted && (
            <div className="text-center py-6 reveal-fade delay-5">
              <div className="line-accent w-12 mx-auto mb-4" />
              <p className="text-[0.55rem] tracking-[0.35em] uppercase text-[rgba(245,240,235,0.1)] font-light">
                &copy; 2026 Tech Interview AI &mdash; All Rights Reserved
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
