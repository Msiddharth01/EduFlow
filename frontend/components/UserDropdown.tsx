'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/api';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const isTeacher = user.role === 'PROFESSOR' || user.role === 'ADMIN';

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger: Avatar and Name */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: 'var(--border-color)' }}
        className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)] group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs shadow-xs ring-1 ring-indigo-500/30">
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

        {/* User Name */}
        <span
          style={{ color: 'var(--header-text)' }}
          className="text-xs font-semibold hidden sm:inline-block max-w-[120px] truncate"
        >
          {user.name}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-[var(--text-main)]'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          }}
          className="absolute right-0 mt-2 w-64 rounded-2xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1.5"
        >
          {/* Header Info */}
          <div
            style={{ borderBottom: '1px solid var(--border-color)' }}
            className="px-4 py-3 bg-[var(--bg-subtle)]/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-xs">
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
                <div className="text-xs font-bold text-[var(--text-main)] truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  {user.email}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isTeacher
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    {isTeacher ? (
                      <Shield className="w-2.5 h-2.5" />
                    ) : (
                      <GraduationCap className="w-2.5 h-2.5" />
                    )}
                    {user.role === 'PROFESSOR'
                      ? 'Professor'
                      : user.role === 'ADMIN'
                      ? 'Administrator'
                      : 'Student'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-indigo-400" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div
            style={{ borderTop: '1px solid var(--border-color)' }}
            className="pt-1 mt-1"
          >
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
