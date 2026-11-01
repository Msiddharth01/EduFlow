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
        <div className="pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Settings className="w-6 h-6 text-indigo-500" />
            <span>Preferences & Settings</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Customize your interface appearance, theme mode, and view account configuration.
          </p>
        </div>

        {/* Section 1: Appearance & Theme */}
        <div className="p-6 app-card space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Interface Theme</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Select your preferred appearance mode. Changes apply immediately across all courses, tutor workspaces, and analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Theme Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                theme === 'dark'
                  ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'hover:border-indigo-500/50'
              }`}
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(99, 91, 238, 0.08)' : 'var(--bg-subtle)',
                borderColor: theme === 'dark' ? 'var(--primary)' : 'var(--border-color)',
              }}
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
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Dark SaaS Theme</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  High-contrast dark palette engineered for low eye fatigue during long study sessions.
                </p>
              </div>
            </button>

            {/* Light Theme Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                theme === 'light'
                  ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'hover:border-indigo-500/50'
              }`}
              style={{
                backgroundColor: theme === 'light' ? 'rgba(99, 91, 238, 0.08)' : 'var(--bg-subtle)',
                borderColor: theme === 'light' ? 'var(--primary)' : 'var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center text-amber-500 shadow-xs">
                  <Sun className="w-5 h-5 text-amber-500" />
                </div>
                {theme === 'light' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Light Theme</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Clean crisp layout with pure white cards, soft neutral background (#F5F7FC), and deep navy typography.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Account Profile */}
        <div className="p-6 app-card space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Profile Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Full Name</span>
              <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-main)' }}>{user?.name || 'Loading...'}</div>
            </div>

            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email Address</span>
              <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-main)' }}>{user?.email || 'Loading...'}</div>
            </div>

            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</span>
              <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-main)' }}>{user?.role || 'STUDENT'}</div>
            </div>

            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Theme Persistence</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> LocalStorage Synced
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
