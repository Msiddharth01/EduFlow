'use client';
import React, { useMemo } from 'react';

interface CourseEditorialCoverProps {
  courseCode: string;
  courseTitle?: string;
  myRoleInCourse?: string;
  className?: string;
}

interface SubjectTheme {
  category: string;
  eyebrow: string;
  lightBg: string;
  lightBorder: string;
  lightInk: string;
  lightGrid: string;
  darkBg: string;
  darkBorder: string;
  darkInk: string;
  darkGrid: string;
  drawIcon: () => React.ReactNode;
}

export default function CourseEditorialCover({
  courseCode,
  courseTitle: _courseTitle = '',
  myRoleInCourse = 'STUDENT',
  className = '',
}: CourseEditorialCoverProps) {
  const codeNormalized = (courseCode || '').toUpperCase().trim();

  // Subject-specific theme and architectural technical drawing
  const subjectTheme = useMemo<SubjectTheme>(() => {
    // 1. Computer Science & AI (CS101)
    if (codeNormalized.includes('CS101') || codeNormalized.includes('AI') || codeNormalized.includes('INTELLIGENCE')) {
      return {
        category: 'FOUNDATIONAL COMPUTING',
        eyebrow: 'DEPT. ARTIFICIAL INTELLIGENCE',
        lightBg: '#F3F4F6',
        lightBorder: '#E5E7EB',
        lightInk: '#1F2937',
        lightGrid: 'rgba(31, 41, 55, 0.06)',
        darkBg: '#13151A',
        darkBorder: '#232630',
        darkInk: '#E5E7EB',
        darkGrid: 'rgba(255, 255, 255, 0.05)',
        drawIcon: () => (
          <svg className="w-16 h-16 opacity-75" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25">
            {/* Neural / Decision lattice */}
            <circle cx="16" cy="18" r="4" />
            <circle cx="16" cy="46" r="4" />
            <circle cx="32" cy="32" r="5" strokeWidth="1.5" />
            <circle cx="48" cy="18" r="4" />
            <circle cx="48" cy="46" r="4" />
            <line x1="20" y1="18" x2="27" y2="29" strokeDasharray="2 2" />
            <line x1="20" y1="46" x2="27" y2="35" strokeDasharray="2 2" />
            <line x1="37" y1="29" x2="44" y2="18" />
            <line x1="37" y1="35" x2="44" y2="46" />
            <line x1="16" y1="22" x2="16" y2="42" opacity="0.4" />
            <line x1="48" y1="22" x2="48" y2="42" opacity="0.4" />
          </svg>
        ),
      };
    }

    // 2. Web Development & Systems (CSET201)
    if (codeNormalized.includes('201') || codeNormalized.includes('WEB') || codeNormalized.includes('FRONTEND')) {
      return {
        category: 'SYSTEMS ARCHITECTURE',
        eyebrow: 'WEB ENGINEERING & DOM',
        lightBg: '#F0F4F8',
        lightBorder: '#D9E2EC',
        lightInk: '#102A43',
        lightGrid: 'rgba(16, 42, 67, 0.06)',
        darkBg: '#111722',
        darkBorder: '#1D2A3D',
        darkInk: '#D9E2EC',
        darkGrid: 'rgba(255, 255, 255, 0.05)',
        drawIcon: () => (
          <svg className="w-16 h-16 opacity-75" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25">
            {/* Layout Box Matrix & Semantic Tag */}
            <rect x="12" y="14" width="40" height="36" rx="2" />
            <line x1="12" y1="24" x2="52" y2="24" />
            <circle cx="18" cy="19" r="1.5" fill="currentColor" />
            <circle cx="23" cy="19" r="1.5" fill="currentColor" />
            <circle cx="28" cy="19" r="1.5" fill="currentColor" />
            {/* Syntax glyph </ > */}
            <path d="M24 33L20 37L24 41" strokeWidth="1.5" />
            <path d="M40 33L44 37L40 41" strokeWidth="1.5" />
            <line x1="34" y1="31" x2="30" y2="43" strokeWidth="1.5" />
          </svg>
        ),
      };
    }

    // 3. Data Structures & Algorithms (CSET401)
    if (codeNormalized.includes('401') || codeNormalized.includes('DS') || codeNormalized.includes('ALGO')) {
      return {
        category: 'THEORETICAL CS',
        eyebrow: 'ALGORITHMS & STRUCTURES',
        lightBg: '#F5F5F0',
        lightBorder: '#E5E5DF',
        lightInk: '#262624',
        lightGrid: 'rgba(38, 38, 36, 0.06)',
        darkBg: '#151614',
        darkBorder: '#272924',
        darkInk: '#E6E6E1',
        darkGrid: 'rgba(255, 255, 255, 0.05)',
        drawIcon: () => (
          <svg className="w-16 h-16 opacity-75" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25">
            {/* Binary Tree & Pointer Lattices */}
            <circle cx="32" cy="16" r="4.5" strokeWidth="1.5" />
            <circle cx="20" cy="32" r="4" />
            <circle cx="44" cy="32" r="4" />
            <circle cx="14" cy="48" r="3.5" />
            <circle cx="26" cy="48" r="3.5" />
            <circle cx="50" cy="48" r="3.5" />
            <line x1="29" y1="19" x2="23" y2="29" />
            <line x1="35" y1="19" x2="41" y2="29" />
            <line x1="18" y1="35" x2="15" y2="45" />
            <line x1="22" y1="35" x2="25" y2="45" />
            <line x1="46" y1="35" x2="49" y2="45" />
          </svg>
        ),
      };
    }

    // 4. Software Project Management (CSET501)
    if (codeNormalized.includes('501') || codeNormalized.includes('SPM') || codeNormalized.includes('PROJECT')) {
      return {
        category: 'ENGINEERING PRACTICE',
        eyebrow: 'PROJECT PROCESS & RELEASE',
        lightBg: '#F7F4F0',
        lightBorder: '#E9E3DC',
        lightInk: '#2C2723',
        lightGrid: 'rgba(44, 39, 35, 0.06)',
        darkBg: '#171513',
        darkBorder: '#292522',
        darkInk: '#ECE7E1',
        darkGrid: 'rgba(255, 255, 255, 0.05)',
        drawIcon: () => (
          <svg className="w-16 h-16 opacity-75" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25">
            {/* Agile Workflow / Milestone Diagram */}
            <rect x="12" y="16" width="18" height="10" rx="1.5" />
            <rect x="34" y="26" width="18" height="10" rx="1.5" />
            <rect x="22" y="38" width="20" height="10" rx="1.5" />
            <path d="M21 26V32H34" strokeDasharray="2 2" />
            <path d="M43 36V42H42" strokeDasharray="2 2" />
          </svg>
        ),
      };
    }

    // Default Academic Fallback
    return {
      category: 'ACADEMIC COURSE',
      eyebrow: 'COLLEGE OF ENGINEERING',
      lightBg: '#F5F5F3',
      lightBorder: '#E5E5E0',
      lightInk: '#202124',
      lightGrid: 'rgba(0,0,0,0.05)',
      darkBg: '#141518',
      darkBorder: '#222329',
      darkInk: '#E8E8ED',
      darkGrid: 'rgba(255,255,255,0.05)',
      drawIcon: () => (
        <svg className="w-16 h-16 opacity-75" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25">
          <polygon points="32,12 52,24 52,48 32,56 12,48 12,24" />
          <line x1="32" y1="12" x2="32" y2="56" />
          <line x1="12" y1="24" x2="52" y2="48" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      ),
    };
  }, [codeNormalized]);

  return (
    <div
      className={`relative w-full h-28 sm:h-32 select-none overflow-hidden border-b transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: 'var(--bg-subtle)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Background Architectural Grid Pattern */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`arch-grid-${courseCode}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-neutral-400 dark:text-neutral-700" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#arch-grid-${courseCode})`} />
      </svg>

      {/* Decorative Technical Ruler on Left Edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col justify-between py-2 pl-0.5 opacity-30 pointer-events-none">
        <div className="w-1 h-0.5 bg-neutral-600 dark:bg-neutral-300" />
        <div className="w-0.5 h-0.5 bg-neutral-600 dark:bg-neutral-300" />
        <div className="w-1 h-0.5 bg-neutral-600 dark:bg-neutral-300" />
        <div className="w-0.5 h-0.5 bg-neutral-600 dark:bg-neutral-300" />
        <div className="w-1 h-0.5 bg-neutral-600 dark:bg-neutral-300" />
      </div>

      {/* Right Corner Technical Subject Icon */}
      <div className="absolute right-3 -bottom-1 text-neutral-400 dark:text-neutral-600 pointer-events-none transition-transform duration-300 group-hover:scale-105">
        {subjectTheme.drawIcon()}
      </div>

      {/* Content Layout */}
      <div className="relative z-10 h-full p-3.5 flex flex-col justify-between pointer-events-none">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Course Code Monogram Stamp */}
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight border shadow-2xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderColor: 'var(--border-color)',
              }}
            >
              {courseCode}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider text-muted opacity-70">
              SEC. 01
            </span>
          </div>

          {/* Academic Role Indicator */}
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono font-medium uppercase tracking-wider border"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: myRoleInCourse === 'PROFESSOR' ? 'var(--accent-academic)' : 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            {myRoleInCourse}
          </span>
        </div>

        {/* Bottom Metadata Footnote */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted">
          <span className="tracking-widest uppercase opacity-75">
            {subjectTheme.eyebrow}
          </span>
          <span className="opacity-50">
            REF-{codeNormalized.slice(-3)}
          </span>
        </div>
      </div>
    </div>
  );
}
