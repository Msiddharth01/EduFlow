'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  BrainCircuit,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

function RegisterForm() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'PROFESSOR' ? 'PROFESSOR' : 'STUDENT';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'PROFESSOR' || roleParam === 'STUDENT') {
      setForm((p) => ({ ...p, role: roleParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await register(form.name, form.email, form.password, form.role);
    setLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'PROFESSOR' || res.user.role === 'ADMIN') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col lg:grid lg:grid-cols-12 relative overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-[#F5F7FC] text-[#172033]' : 'bg-[#080d1a] text-slate-100'
      }`}
    >
      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            isLight
              ? 'bg-white/95 hover:bg-white text-[#172033] border-[#CBD5E1] shadow-slate-200/50 hover:border-slate-400'
              : 'bg-[#0c1322]/95 hover:bg-[#152038] text-slate-200 border-[#1b2742] shadow-black/40 hover:border-slate-600'
          }`}
        >
          {isLight ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline text-[#334155]">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-slate-200">Light Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle Atmospheric Background Gradients */}
      <div
        className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-opacity ${
          isLight ? 'bg-purple-300/20' : 'bg-purple-600/10'
        }`}
      />
      <div
        className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-opacity ${
          isLight ? 'bg-indigo-300/25' : 'bg-indigo-600/10'
        }`}
      />

      {/* ========================================================
          LEFT PANEL: Branding, Value Proposition, AI Visual
         ======================================================== */}
      <div
        className={`hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-10 xl:p-14 relative z-10 border-r transition-colors duration-200 ${
          isLight
            ? 'bg-gradient-to-br from-[#FAFBFF] via-[#F8FAFC] to-[#EEF2FB] border-[#E2E8F0]'
            : 'bg-[#070b16]/70 backdrop-blur-2xl border-[#172238]'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 border border-indigo-400/30 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black tracking-tight ${isLight ? 'text-[#172033]' : 'text-white'}`}>
                EduFlow
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/40'
                }`}
              >
                AI LMS
              </span>
            </div>
            <p className={`text-xs font-medium ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
              Intelligent Learning & Instruction
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-8 max-w-xl space-y-7">
          <div className="space-y-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isLight
                  ? 'bg-purple-50 border border-purple-200 text-purple-700'
                  : 'bg-purple-950/60 border border-purple-800/40 text-purple-300'
              }`}
            >
              <BrainCircuit className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              <span>Personalized Academic Intelligence</span>
            </div>

            <h1
              className={`text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight ${
                isLight ? 'text-[#172033]' : 'text-white'
              }`}
            >
              Start learning with <br />
              <span
                className={
                  isLight
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent'
                    : 'bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-100 bg-clip-text text-transparent'
                }
              >
                intelligent AI.
              </span>
            </h1>

            <p className={`text-sm leading-relaxed max-w-lg font-normal ${isLight ? 'text-[#475569]' : 'text-slate-300'}`}>
              Create your account to access real-time AI tutor assistance, study lecture notes with verified citations, and track class mastery with diagnostic analytics.
            </p>
          </div>

          {/* Compact Feature Highlights */}
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 group ${
                isLight
                  ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-indigo-400/50 hover:shadow-md hover:shadow-indigo-500/5'
                  : 'bg-[#0d1425]/90 border-[#1c2944] hover:border-indigo-500/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  isLight
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                    : 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-xs font-bold ${isLight ? 'text-[#172033]' : 'text-white'}`}>
                  Dynamic RAG Tutor & Notes Index
                </h2>
                <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>
                  Ask conceptual questions directly answered from uploaded course PDF syllabi and notes.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 group ${
                isLight
                  ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-purple-400/50 hover:shadow-md hover:shadow-purple-500/5'
                  : 'bg-[#0d1425]/90 border-[#1c2944] hover:border-indigo-500/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  isLight
                    ? 'bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                    : 'bg-purple-600/15 border-purple-500/30 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-xs font-bold ${isLight ? 'text-[#172033]' : 'text-white'}`}>
                  Automated Material-Linked Quizzes
                </h2>
                <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>
                  Reinforce lecture concepts with auto-graded quizzes and comprehensive answer rationales.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 group ${
                isLight
                  ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/5'
                  : 'bg-[#0d1425]/90 border-[#1c2944] hover:border-indigo-500/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                    : 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-xs font-bold ${isLight ? 'text-[#172033]' : 'text-white'}`}>
                  Topic Mastery & Progress Tracking
                </h2>
                <p className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>
                  Identify weak spots and track retention across courses with real-time analytics.
                </p>
              </div>
            </div>
          </div>

          {/* Abstract Engine Badge */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              isLight
                ? 'bg-white border-[#E2E8F0] shadow-xs'
                : 'bg-gradient-to-r from-[#0c1324] to-[#121c35] border-[#1e2d4d]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <div className="space-y-0.5">
                <div className={`text-[11px] font-bold ${isLight ? 'text-[#172033]' : 'text-slate-200'}`}>
                  EduFlow Academic Cloud
                </div>
                <div className={`text-[10px] font-mono ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                  Real-time vector storage & multi-role LMS
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isLight
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
              }`}
            >
              Active
            </span>
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div
          className={`flex items-center gap-4 text-[11px] pt-4 border-t ${
            isLight ? 'text-[#64748B] border-[#E2E8F0]' : 'text-slate-400 border-[#141e33]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
            Verified Role Access
          </span>
          <span>•</span>
          <span>End-to-End Privacy</span>
          <span>•</span>
          <span>Academic Integrity</span>
        </div>
      </div>

      {/* ========================================================
          RIGHT PANEL: Registration Form
         ======================================================== */}
      <div
        className={`lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative z-10 min-h-screen transition-colors duration-200 ${
          isLight ? 'bg-[#F5F7FC]' : 'bg-transparent'
        }`}
      >
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header (visible only on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-base font-bold ${isLight ? 'text-[#172033]' : 'text-white'}`}>EduFlow</span>
              <p className={`text-[11px] ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                Create an Account
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div
            className={`p-7 sm:p-9 rounded-2xl border transition-all duration-200 space-y-6 ${
              isLight
                ? 'bg-white border-[#E2E8F0] shadow-xl shadow-slate-200/60'
                : 'bg-[#0c1322]/95 border-[#1b2742] shadow-2xl shadow-black/60 backdrop-blur-xl'
            }`}
          >
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-[#172033]' : 'text-white'}`}>
                Create your account
              </h2>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                Select your role and enter your details to get started.
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="space-y-1.5">
              <label
                className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-[#334155]' : 'text-slate-400'
                }`}
              >
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Student Option */}
                <button
                  type="button"
                  id="reg-role-student"
                  onClick={() => setForm((p) => ({ ...p, role: 'STUDENT' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    form.role === 'STUDENT'
                      ? isLight
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/10'
                      : isLight
                      ? 'border-[#CBD5E1] bg-white hover:border-slate-400 hover:bg-slate-50'
                      : 'border-[#1b263e] bg-[#090e1b] hover:border-slate-600 hover:bg-[#0d1425]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <BookOpen
                      className={`w-4 h-4 ${
                        form.role === 'STUDENT'
                          ? isLight
                            ? 'text-indigo-600'
                            : 'text-indigo-400'
                          : isLight
                          ? 'text-[#64748B] group-hover:text-[#334155]'
                          : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        form.role === 'STUDENT'
                          ? isLight
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-indigo-500 bg-indigo-500'
                          : isLight
                          ? 'border-[#CBD5E1] bg-transparent'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {form.role === 'STUDENT' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold mt-2.5 ${
                      form.role === 'STUDENT'
                        ? isLight
                          ? 'text-[#172033]'
                          : 'text-white'
                        : isLight
                        ? 'text-[#172033]'
                        : 'text-slate-300'
                    }`}
                  >
                    Student
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                    I want to learn
                  </div>
                </button>

                {/* Teacher Option */}
                <button
                  type="button"
                  id="reg-role-teacher"
                  onClick={() => setForm((p) => ({ ...p, role: 'PROFESSOR' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    form.role === 'PROFESSOR'
                      ? isLight
                        ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-500/20'
                        : 'border-purple-500 bg-purple-500/15 shadow-md shadow-purple-500/10'
                      : isLight
                      ? 'border-[#CBD5E1] bg-white hover:border-slate-400 hover:bg-slate-50'
                      : 'border-[#1b263e] bg-[#090e1b] hover:border-slate-600 hover:bg-[#0d1425]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <GraduationCap
                      className={`w-4 h-4 ${
                        form.role === 'PROFESSOR'
                          ? isLight
                            ? 'text-purple-600'
                            : 'text-purple-400'
                          : isLight
                          ? 'text-[#64748B] group-hover:text-[#334155]'
                          : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        form.role === 'PROFESSOR'
                          ? isLight
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-purple-500 bg-purple-500'
                          : isLight
                          ? 'border-[#CBD5E1] bg-transparent'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {form.role === 'PROFESSOR' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold mt-2.5 ${
                      form.role === 'PROFESSOR'
                        ? isLight
                          ? 'text-[#172033]'
                          : 'text-white'
                        : isLight
                        ? 'text-[#172033]'
                        : 'text-slate-300'
                    }`}
                  >
                    Teacher
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                    I teach courses
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-name"
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#334155]' : 'text-slate-300'
                  }`}
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-[#64748B]' : 'text-slate-500'
                    }`}
                  />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder={form.role === 'PROFESSOR' ? 'Dr. Alan Turing' : 'Alan Turing'}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] placeholder-[#64748B] focus:border-indigo-600 focus:ring-indigo-600/20'
                        : 'bg-[#080d19] border border-[#1e2a44] text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-email"
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#334155]' : 'text-slate-300'
                  }`}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-[#64748B]' : 'text-slate-500'
                    }`}
                  />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder={
                      form.role === 'PROFESSOR'
                        ? 'professor@university.edu'
                        : 'student@university.edu'
                    }
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] placeholder-[#64748B] focus:border-indigo-600 focus:ring-indigo-600/20'
                        : 'bg-[#080d19] border border-[#1e2a44] text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-password"
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#334155]' : 'text-slate-300'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLight ? 'text-[#64748B]' : 'text-slate-500'
                    }`}
                  />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] placeholder-[#64748B] focus:border-indigo-600 focus:ring-indigo-600/20'
                        : 'bg-[#080d19] border border-[#1e2a44] text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`p-1 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                      isLight
                        ? 'text-[#64748B] hover:text-[#172033]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="reg-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create {form.role === 'PROFESSOR' ? 'Teacher' : 'Student'} Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className={`text-center pt-2 border-t ${isLight ? 'border-[#E2E8F0]' : 'border-[#172238]'}`}>
              <p className={`text-xs ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                Already registered with EduFlow?{' '}
                <Link
                  href="/auth/login"
                  className={`font-bold transition-colors ml-1 ${
                    isLight
                      ? 'text-indigo-600 hover:text-indigo-700'
                      : 'text-indigo-400 hover:text-indigo-300'
                  }`}
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080d1a] flex items-center justify-center text-slate-400 text-xs">
          <span>Loading EduFlow registration...</span>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
