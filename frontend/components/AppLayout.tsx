'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FileText,
  CheckCircle,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Users,
  BarChart3,
  User as UserIcon,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';
import { getAvatarUrl } from '../lib/api';

interface SidebarProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isTeacher = user?.role === 'PROFESSOR' || user?.role === 'ADMIN';

  // Teacher-specific sidebar items vs Student sidebar items
  const teacherNavItems = [
    { label: 'Dashboard', href: '/dashboard/teacher', icon: LayoutDashboard },
    { label: 'My Courses', href: '/dashboard/courses', icon: BookOpen },
    { label: 'Students', href: '/dashboard/teacher/students', icon: Users },
    { label: 'Analytics', href: '/dashboard/teacher/analytics', icon: BarChart3 },
    { label: 'Course Materials', href: '/dashboard/teacher/materials', icon: FileText },
    { label: 'Assignments', href: '/dashboard/teacher/assignments', icon: ClipboardList },
    { label: 'Quiz Results', href: '/dashboard/teacher/quizzes', icon: CheckCircle },
  ];

  const studentNavItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Enrolled Courses', href: '/dashboard/courses', icon: BookOpen },
    { label: 'AI Tutor', href: '/dashboard/tutor', icon: MessageSquare },
    { label: 'Syntheses & Summaries', href: '/dashboard/summaries', icon: FileText },
    { label: 'Practice Quizzes', href: '/dashboard/quizzes', icon: CheckCircle },
    { label: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList },
    { label: 'Academic Timeline', href: '/dashboard/timeline', icon: Calendar },
    { label: 'Performance Analytics', href: '/dashboard/progress', icon: TrendingUp },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
      }}
      className="flex flex-col md:flex-row w-full min-w-0"
    >
      {/* Mobile Top Header */}
      <div
        style={{
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          color: 'var(--text-main)',
        }}
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40 w-full backdrop-blur-md"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-semibold text-base tracking-tight"
          style={{ color: 'var(--text-main)' }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
            }}
          >
            EF
          </div>
          <span className="font-semibold tracking-tight">EduFlow</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">Academic</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
            className="p-2 rounded-md border transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
            className="p-2 rounded-md border transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Left Sidebar (240px Nav matching specification) */}
      <aside
        style={{
          width: '240px',
          minWidth: '240px',
          maxWidth: '240px',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          color: 'var(--sidebar-text)',
        }}
        className={`sidebar-drawer flex flex-col ${mobileOpen ? 'open' : ''}`}
      >
        {/* Brand */}
        <div
          style={{ borderColor: 'var(--sidebar-border)' }}
          className="px-5 py-4 flex items-center justify-between border-b"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 tracking-tight group"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs shadow-xs"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
              }}
            >
              EF
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[var(--sidebar-text)]">
                EduFlow
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--sidebar-muted)]">
                Academic Edition
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            style={{ color: 'var(--sidebar-muted)' }}
            className="md:hidden p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sidebar-muted)] opacity-80">
            {isTeacher ? 'Faculty Workspace' : 'Student Workspace'}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard/teacher'
                ? pathname === '/dashboard/teacher' || (pathname === '/dashboard' && isTeacher)
                : item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
                  borderLeft: isActive ? '3px solid #356AE6' : '3px solid transparent',
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)] ${
                  isActive ? 'font-semibold shadow-xs' : ''
                }`}
              >
                <Icon
                  style={{ color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)' }}
                  className="w-4 h-4 flex-shrink-0 opacity-85"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Secondary nav items */}
          <div
            style={{ borderColor: 'var(--sidebar-border)' }}
            className="pt-3 mt-3 border-t space-y-0.5"
          >
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--sidebar-muted)] opacity-80">
                Preferences
              </span>
            </div>

            <button
              onClick={toggleTheme}
              style={{ color: 'var(--sidebar-muted)' }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)] transition-colors cursor-pointer text-left"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
              <span>{theme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
            </button>

            <Link
              href="/dashboard/profile"
              onClick={() => setMobileOpen(false)}
              style={{
                backgroundColor: pathname === '/dashboard/profile' ? 'var(--sidebar-active-bg)' : 'transparent',
                color: pathname === '/dashboard/profile' ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)] transition-colors cursor-pointer text-left"
            >
              <UserIcon
                style={{ color: pathname === '/dashboard/profile' ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)' }}
                className="w-3.5 h-3.5"
              />
              <span>Account Profile</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              style={{
                backgroundColor: pathname === '/dashboard/settings' ? 'var(--sidebar-active-bg)' : 'transparent',
                color: pathname === '/dashboard/settings' ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)',
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)] transition-colors cursor-pointer text-left"
            >
              <Settings
                style={{ color: pathname === '/dashboard/settings' ? 'var(--sidebar-active-text)' : 'var(--sidebar-muted)' }}
                className="w-3.5 h-3.5"
              />
              <span>Settings</span>
            </Link>

            <button
              onClick={() => {
                alert('EduFlow Academic Learning System • RAG Course Document Search & Interactive Evaluation.');
              }}
              style={{ color: 'var(--sidebar-muted)' }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)] transition-colors cursor-pointer text-left"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Reference Manual</span>
            </button>
          </div>
        </nav>

        {/* User profile footer */}
        {user && (
          <div
            style={{
              backgroundColor: 'var(--sidebar-footer-bg)',
              borderTop: '1px solid var(--sidebar-border)',
            }}
            className="p-3"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2.5 overflow-hidden hover:opacity-85 transition-opacity cursor-pointer group flex-1"
                title="View My Profile"
              >
                <div
                  className="w-7 h-7 rounded-md overflow-hidden font-mono font-medium text-xs flex items-center justify-center flex-shrink-0 border border-[var(--border-subtle)]"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  {user.profileImage ? (
                    <img
                      src={getAvatarUrl(user.profileImage)}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <div
                    style={{ color: 'var(--sidebar-text)' }}
                    className="text-xs font-medium truncate"
                  >
                    {user.name}
                  </div>
                  <div
                    style={{ color: 'var(--sidebar-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider truncate"
                  >
                    {user.role === 'PROFESSOR' ? 'Faculty' : user.role === 'ADMIN' ? 'Admin' : 'Student'}
                  </div>
                </div>
              </Link>

              <button
                onClick={logout}
                style={{ color: 'var(--sidebar-muted)' }}
                className="p-1.5 hover:text-red-500 transition-colors cursor-pointer rounded"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Search & Actions Bar matching reference screen */}
        <header
          style={{
            backgroundColor: 'var(--header-bg)',
            borderBottom: '1px solid var(--header-border)',
          }}
          className="px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 w-full backdrop-blur-md"
        >
          {/* Global search input */}
          <div className="relative max-w-md w-full flex items-center">
            <Search
              style={{ color: 'var(--text-muted)' }}
              className="w-3.5 h-3.5 absolute left-3.5 pointer-events-none opacity-70"
            />
            <input
              type="text"
              placeholder="Search enrolled courses, syllabi, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pr-10"
            />
            <kbd className="hidden sm:inline-block absolute right-3 text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-subtle)] pointer-events-none">
              /
            </kbd>
          </div>

          {/* Right header actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-muted)',
              }}
              className="p-1.5 rounded-md border hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Toggle Theme"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Appearance`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Functional Notifications Dropdown */}
            <NotificationDropdown />

            {/* Interactive User Profile Dropdown */}
            <UserDropdown />
          </div>
        </header>

        {/* Page Content Viewport */}
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-main)',
            overflowY: 'auto',
          }}
          className="w-full"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
