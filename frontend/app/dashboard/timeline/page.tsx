'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { assignmentApi, TimelineItem } from '@/lib/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';

export default function TimelinePage() {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isProfessor, setIsProfessor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'OVERDUE' | 'SUBMITTED' | 'NOT_SUBMITTED'>('ALL');

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentApi.getTimeline();
      if (res.success) {
        setTimeline(res.data.timeline);
        setIsProfessor(res.data.isProfessor);
      } else {
        setError(res.error || 'Failed to fetch timeline.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  // Filter items
  const filteredTimeline = timeline.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'UPCOMING') return item.status === 'Upcoming';
    if (filter === 'OVERDUE') return item.status === 'Overdue';
    if (filter === 'SUBMITTED') return item.status === 'Submitted';
    if (filter === 'NOT_SUBMITTED') return item.status === 'Not Submitted' || item.status === 'Upcoming' || item.status === 'Overdue';
    return true;
  });

  // Group by deadline date string for Moodle-style chronological date groups
  const groupedByDate: { [dateStr: string]: TimelineItem[] } = {};
  filteredTimeline.forEach((item) => {
    try {
      const d = new Date(item.deadline);
      const dateHeader = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
      if (!groupedByDate[dateHeader]) {
        groupedByDate[dateHeader] = [];
      }
      groupedByDate[dateHeader].push(item);
    } catch {
      if (!groupedByDate['Other']) groupedByDate['Other'] = [];
      groupedByDate['Other'].push(item);
    }
  });

  const upcomingCount = timeline.filter((t) => t.status === 'Upcoming').length;
  const overdueCount = timeline.filter((t) => t.status === 'Overdue').length;
  const submittedCount = timeline.filter((t) => t.status === 'Submitted').length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Assignments Timeline
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {isProfessor
                ? 'Chronological overview of course deadlines, upcoming submissions, and student hand-ins.'
                : 'Moodle-inspired chronological schedule of upcoming assignment deadlines and hand-in status.'}
            </p>
          </div>

          <button
            onClick={fetchTimeline}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--border-color)] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-x-auto">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'ALL', label: `All (${timeline.length})` },
                { id: 'UPCOMING', label: `Upcoming (${upcomingCount})` },
                { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
                ...(!isProfessor
                  ? [
                      { id: 'SUBMITTED', label: `Submitted (${submittedCount})` },
                      { id: 'NOT_SUBMITTED', label: 'Not Submitted' },
                    ]
                  : []),
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-[var(--text-muted)] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm font-medium">Loading chronological timeline...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-[var(--danger)] mx-auto" />
            <p className="text-xs text-[var(--danger)] font-semibold">{error}</p>
          </div>
        ) : Object.keys(groupedByDate).length === 0 ? (
          <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              No timeline items
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              There are no assignment deadlines matching your active filter.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByDate).map(([dateHeader, items]) => (
              <div key={dateHeader} className="space-y-4">
                {/* Date Group Heading */}
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                  <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    {dateHeader}
                  </h2>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                {/* Timeline Cards */}
                <div className="pl-4 border-l-2 border-[var(--primary-light)] ml-1 space-y-4">
                  {items.map((item) => {
                    const isSubmitted = item.status === 'Submitted';
                    const isOverdue = item.status === 'Overdue';

                    return (
                      <div
                        key={item.id}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:border-[var(--primary)]/50 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                                {item.courseCode}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                {item.courseTitle} {item.professorName ? `• ${item.professorName}` : ''}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                              {item.title}
                            </h3>
                          </div>

                          {/* Status Pill */}
                          <span
                            className={`self-start px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isSubmitted
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : isOverdue
                                ? 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30'
                                : 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {/* Deadline details & Countdown */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                            <span>
                              Due:{' '}
                              <strong className="text-[var(--text-main)]">
                                {item.deadlineFormatted}
                              </strong>
                            </span>
                          </div>
                          <span className={isOverdue ? 'text-[var(--danger)] font-semibold' : 'text-[var(--text-main)]'}>
                            {item.countdown}
                          </span>
                        </div>

                        {/* Submission feedback if submitted */}
                        {item.submission && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>{item.submission.timingDescription || 'Submitted'}</span>
                            <span className="text-[11px] text-[var(--text-muted)] ml-auto">
                              File: {item.submission.originalFileName}
                            </span>
                          </div>
                        )}

                        {/* Professor metrics if professor */}
                        {isProfessor && item.totalEnrolled !== undefined && (
                          <div className="flex items-center gap-3 text-xs bg-[var(--bg-subtle)] p-2.5 rounded-lg border border-[var(--border-color)]">
                            <Users className="w-4 h-4 text-[var(--primary)]" />
                            <span className="font-semibold text-[var(--text-main)]">
                              Submissions: {item.submittedCount} / {item.totalEnrolled}
                            </span>
                            <span className="text-[var(--text-muted)]">
                              ({item.notSubmittedCount} pending)
                            </span>
                          </div>
                        )}

                        {/* Open Button */}
                        <div className="flex items-center justify-end pt-1">
                          <Link
                            href={`/dashboard/courses/${item.courseId}?tab=assignments`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] hover:opacity-90 transition-colors"
                          >
                            <span>Open Assignment</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
