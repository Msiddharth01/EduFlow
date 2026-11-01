'use client';
import React from 'react';
import Link from 'next/link';
import { CourseWithMeta } from '@/lib/api';
import CoursePatternBanner from './CoursePatternBanner';
import {
  Users,
  FileText,
  CheckSquare,
  ArrowRight,
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
      className="app-card rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-indigo-500/60 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 block cursor-pointer"
    >
      {/* 1. TOP DECORATIVE GEOMETRIC BANNER (110–140px) */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden">
        <CoursePatternBanner
          courseId={course.id}
          courseCode={course.code}
        />

        {/* Floating Badges overlaying banner */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          {/* Course Code Pill */}
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-xs border transition-colors"
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
                  ? 'rgba(88, 28, 135, 0.75)'
                  : 'rgba(6, 78, 59, 0.75)',
              color: '#FFFFFF',
              borderColor:
                course.myRoleInCourse === 'PROFESSOR'
                  ? 'rgba(192, 132, 252, 0.4)'
                  : 'rgba(52, 211, 153, 0.4)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {course.myRoleInCourse}
          </span>
        </div>
      </div>

      {/* 2. CARD CONTENT BODY */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Course Title */}
          <h3
            style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}
            className="group-hover:text-indigo-400 transition-colors mb-1.5 leading-snug"
          >
            {course.title}
          </h3>

          {/* Instructor name */}
          <div className="flex items-center gap-1.5 text-xs mb-2.5" style={{ color: 'var(--text-muted)' }}>
            <Users className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="truncate">{course.professor || 'Prof. Faculty'}</span>
          </div>

          {/* Course Description */}
          {course.description && (
            <p
              style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}
              className="line-clamp-2 mb-3"
            >
              {course.description}
            </p>
          )}
        </div>

        {/* 3. CARD FOOTER: PROGRESS & STATS */}
        <div className="space-y-3 pt-1">
          {/* Progress bar using real backend data */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span style={{ color: 'var(--text-subtle)' }}>Progress</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{progressPct}% complete</span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
            >
              <div
                style={{ width: `${progressPct}%` }}
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Counts & Open Course Action */}
          <div
            style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-subtle)' }}
            className="flex items-center justify-between pt-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" title="Course Materials">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>{materialsCount} {materialsCount === 1 ? 'Material' : 'Materials'}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Practice Quizzes">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>{quizzesCount} {quizzesCount === 1 ? 'Quiz' : 'Quizzes'}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all">
              <span>Open Course</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
