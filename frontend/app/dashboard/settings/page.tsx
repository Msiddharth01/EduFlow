'use client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import AppLayout from '@/components/AppLayout';
import { Settings, Moon, Sun, User, Shield, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-[#1b253b]">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <span>Preferences & Settings</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Customize your interface appearance, theme mode, and view account configuration.
          </p>
        </div>

        {/* Section 1: Appearance & Theme */}
        <div className="p-6 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">Interface Theme</h2>
            <p className="text-xs text-gray-400 mt-1">
              Select your preferred appearance mode. Changes apply immediately across all courses, tutor workspaces, and analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Theme Card */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-[#1b263e] bg-[#0c1322] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0B1020] border border-[#263247] flex items-center justify-center text-amber-400 shadow-inner">
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
                {theme === 'dark' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/40">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Dark SaaS Theme</h3>
                <p className="text-xs text-gray-400 mt-1">
                  High-contrast dark palette engineered for low eye fatigue during long study sessions.
                </p>
              </div>
            </button>

            {/* Light Theme Card */}
            <button
              onClick={() => setTheme('light')}
              className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                theme === 'light'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-[#1b263e] bg-[#0c1322] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center text-amber-500 shadow-xs">
                  <Sun className="w-5 h-5 text-amber-500" />
                </div>
                {theme === 'light' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Light Theme</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Clean crisp layout with pure white cards, soft neutral background (#F5F7FC), and deep navy typography.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Account Profile */}
        <div className="p-6 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Profile Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b263e]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</span>
              <div className="text-sm font-bold text-white mt-1">{user?.name || 'Loading...'}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b263e]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</span>
              <div className="text-sm font-bold text-white mt-1">{user?.email || 'Loading...'}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b263e]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</span>
              <div className="text-sm font-bold text-white mt-1">{user?.role || 'STUDENT'}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b263e]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Theme Persistence</span>
              <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> LocalStorage Synced
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
