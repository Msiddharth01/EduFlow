'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, TeacherDashboardData, TeacherWeakTopicItem } from '@/lib/api';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  BarChart2,
  BookOpen,
  Users,
  Target,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export default function TeacherAnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weak topic detail modal
  const [inspectedTopic, setInspectedTopic] = useState<TeacherWeakTopicItem | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const res = await teacherApi.getDashboard();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load teacher analytics.');
      }
      setLoading(false);
    };

    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-gray-400 text-xs">
          Loading learning analytics and diagnostic data...
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="p-6 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Unable to retrieve analytics data.'}</span>
        </div>
      </AppLayout>
    );
  }

  const { summary, courses, weakTopics, quizzes } = data;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 uppercase">
                Diagnostic Analytics
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] mt-1">
              Class Performance & Topic Mastery
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              Gain deep insights into learning gaps, concept accuracy rates, and struggling students across all your courses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teacher"
              className="px-3.5 py-2 app-card-subtle text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-semibold rounded-lg transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl app-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Class Average</span>
              <Target className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-main)] mt-2">
              {summary.averageQuizScore}%
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Across {summary.totalAttempts} student submissions
            </div>
          </div>

          <div className="p-5 rounded-2xl app-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Needs Attention</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
              {summary.studentsNeedingSupportCount}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Scoring &lt; 60% on quiz attempts
            </div>
          </div>

          <div className="p-5 rounded-2xl app-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Active Enrolments</span>
              <Users className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-main)] mt-2">
              {summary.totalStudents}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              In {summary.totalCourses} managed courses
            </div>
          </div>

          <div className="p-5 rounded-2xl app-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Diagnostic Quizzes</span>
              <BarChart2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {summary.totalQuizzes}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Linked to verified PDF materials
            </div>
          </div>
        </div>

        {/* WEAK TOPICS SECTION */}
        <div className="p-6 rounded-2xl app-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Weak Topics & Struggling Concepts</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Aggregated from verified student answers. Topics below 60% accuracy indicate core comprehension gaps.
              </p>
            </div>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] app-card-subtle rounded-xl text-xs">
              No weak topics identified yet. As students take course quizzes, diagnostic analytics will be automatically updated.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weakTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl app-card hover:border-[var(--primary)]/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)]">
                          {item.quizTitle}
                        </span>
                        {item.accuracyRate < 50 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Critical Gap
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[var(--text-main)] mt-1.5">{item.topic}</h3>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                        <FileText className="w-3 h-3 text-[var(--text-subtle)]" />
                        <span>Source: {item.materialTitle || item.materialFileName || 'Course PDF'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-black ${
                          item.accuracyRate >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.accuracyRate}%
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                        Accuracy Rate
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.accuracyRate >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, item.accuracyRate))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{item.affectedStudentsCount} student(s) struggling</span>
                      <span>{item.incorrectCount} incorrect responses</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {item.sampleQuestions.length} flagged question(s)
                    </span>
                    <button
                      onClick={() => setInspectedTopic(item)}
                      className="px-2.5 py-1 rounded bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/20 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Questions</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COURSE LEVEL PERFORMANCE BREAKDOWN */}
        <div className="p-6 rounded-2xl app-card space-y-4">
          <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--primary)]" />
            <span>Course-Level Performance Breakdown</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Materials</th>
                  <th className="py-3 px-4 text-center">Quizzes</th>
                  <th className="py-3 px-4 text-center">Quiz Submissions</th>
                  <th className="py-3 px-4 text-center">Class Average</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text-main)]">{c.title}</div>
                      <div className="text-[var(--text-muted)] text-[11px] font-mono">{c.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[var(--text-main)]">
                      {c.enrollmentCount}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[var(--text-secondary)]">{c.materialCount}</td>
                    <td className="py-3.5 px-4 text-center text-[var(--text-secondary)]">{c.quizCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-[var(--text-main)]">
                      {c.totalAttempts}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.classAverage !== null ? (
                        <span
                          className={`font-black text-sm ${
                            c.classAverage >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {c.classAverage}%
                        </span>
                      ) : (
                        <span className="text-[var(--text-subtle)] italic">No attempts</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/courses/${c.id}?tab=analytics`}
                        className="px-2.5 py-1 rounded bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/20 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weak Topic Questions Inspection Modal */}
        {inspectedTopic && (
          <div
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
              className="w-full max-w-2xl border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      Concept Diagnostic
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {inspectedTopic.accuracyRate}% Accuracy
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>{inspectedTopic.topic}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Source Material: {inspectedTopic.materialTitle || inspectedTopic.materialFileName || 'PDF'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedTopic(null)}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Struggling Questions ({inspectedTopic.sampleQuestions.length})
                </h3>
                {inspectedTopic.sampleQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-xl border space-y-2 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        <span className="font-bold mr-2" style={{ color: 'var(--primary)' }}>Q{qIdx + 1}.</span>
                        {q.text}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                        {q.incorrectCount} misses
                      </span>
                    </div>

                    {q.pageReference && (
                      <div className="text-[11px] font-medium" style={{ color: 'var(--primary)' }}>
                        Referenced in lecture notes on Page {q.pageReference}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectedTopic(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
