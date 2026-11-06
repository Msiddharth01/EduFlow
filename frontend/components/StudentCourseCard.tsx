'use client';
import React from 'react';
import Link from 'next/link';
import { CourseWithMeta } from '@/lib/api';
import CoursePatternBanner from './CoursePatternBanner';
import {
  FileText,
  CheckSquare,
  ArrowRight,
  User,
} from 'lucide-react';

interface StudentCourseCardProps {
  course: CourseWithMeta;
}

export default function StudentCourseCard({ course }: StudentCourseCardProps) {
  const progressPct = course.progress !== undefined ? course.progress : 0;
  const materialsCount = course._count?.materials ?? (course.materials?.length || 0);
  const quizzesCount = course._count?.quizzes ?? 0;

  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      style={{ textDecoration: 'none' }}
      className="app-card rounded-xl overflow-hidden flex flex-col justify-between group transition-all duration-150 block cursor-pointer hover:shadow-md"
    >
      {/* 1. TOP GEOMETRIC ARTWORK BANNER */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden">
        <CoursePatternBanner
          courseId={course.id}
          courseCode={course.code}
          title={course.title}
        />

        {/* Floating Badges overlaying banner */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          {/* Course Code Pill */}
          <span
            className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-xs border transition-colors"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
            }}
          >
            {course.code}
          </span>

          {/* Role Pill */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider backdrop-blur-md shadow-xs border"
            style={{
              backgroundColor:
                course.myRoleInCourse === 'PROFESSOR'
                  ? 'rgba(53, 106, 230, 0.75)'
                  : 'rgba(6, 78, 59, 0.75)',
              color: '#FFFFFF',
              borderColor:
                course.myRoleInCourse === 'PROFESSOR'
                  ? 'rgba(53, 106, 230, 0.4)'
                  : 'rgba(52, 211, 153, 0.4)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {course.myRoleInCourse}
          </span>
        </div>
      </div>

      {/* 2. CARD CONTENT BODY */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Course Title */}
          <h3
            style={{ color: 'var(--text-main)' }}
            className="text-[0.975rem] font-semibold leading-snug tracking-tight group-hover:text-[var(--primary)] transition-colors mb-1.5"
          >
            {course.title}
          </h3>

          {/* Instructor line */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-2.5">
            <User className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
            <span className="truncate">{course.professor || 'Faculty Instructor'}</span>
          </div>

          {/* Course Description */}
          {course.description && (
            <p
              className="text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2"
            >
              {course.description}
            </p>
          )}
        </div>

        {/* 3. CARD FOOTER: PROGRESS & STATS */}
        <div className="space-y-3 pt-2">
          {/* Hairline Progress Indicator */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-[11px]">
              <span className="text-[var(--text-subtle)] font-medium">Syllabus Completion</span>
              <span className="font-mono text-[var(--text-main)] font-semibold">{progressPct}%</span>
            </div>
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: 'var(--primary)',
                }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Metadata counts & view indicator */}
          <div
            style={{ borderTop: '1px solid var(--border-subtle)' }}
            className="flex items-center justify-between pt-3 text-xs text-[var(--text-muted)]"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5" title="Course Materials">
                <FileText className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                <span className="font-mono text-[11px]">{materialsCount}</span>
                <span className="text-[11px]">{materialsCount === 1 ? 'doc' : 'docs'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5" title="Practice Quizzes">
                <CheckSquare className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                <span className="font-mono text-[11px]">{quizzesCount}</span>
                <span className="text-[11px]">{quizzesCount === 1 ? 'quiz' : 'quizzes'}</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] group-hover:translate-x-0.5 transition-transform">
              <span>Enter</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
