'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import StudentCourseCard from '@/components/StudentCourseCard';
import {
  courseApi,
  analyticsApi,
  assignmentApi,
  CourseWithMeta,
  StudentAnalytics,
  TimelineItem,
} from '@/lib/api';
import {
  BookOpen,
  CheckSquare,
  TrendingUp,
  Target,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ClipboardList,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: '', title: '', description: '' });
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (!isLoading && user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      router.replace('/dashboard/teacher');
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, analyticsRes, timeRes] = await Promise.all([
        courseApi.list(),
        analyticsApi.getStudentAnalytics(),
        assignmentApi.getTimeline(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.data.courses);
      if (analyticsRes.success) setAnalytics(analyticsRes.data.analytics);
      if (timeRes.success) setTimeline(timeRes.data.timeline);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await courseApi.create(courseForm);
    if (res.success) {
      setActionMsg({ type: 'success', text: `Course ${courseForm.code} created successfully.` });
      setShowCreateModal(false);
      setCourseForm({ code: '', title: '', description: '' });
      loadData();
    } else {
      setActionMsg({ type: 'error', text: res.error });
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = enrollCode.trim().toUpperCase();
    if (!code) {
      setEnrollError('Please enter a course code (e.g. CS101).');
      return;
    }

    setEnrollLoading(true);
    setEnrollError(null);
    setEnrollSuccess(null);

    const res = await courseApi.enroll(code);
    if (res.success) {
      setEnrollSuccess(res.data.message);
      setActionMsg({ type: 'success', text: res.data.message });
      setEnrollCode('');
      await loadData();
      setTimeout(() => {
        setShowEnrollModal(false);
        setEnrollSuccess(null);
      }, 1200);
    } else {
      setEnrollError(res.error);
    }
    setEnrollLoading(false);
  };

  if (isLoading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing EduFlow workspace...</span>
        </div>
      </div>
    );
  }

  const isProfessor = user.role === 'PROFESSOR';
  const pendingAssignments = timeline.filter((t) => t.status !== 'Submitted');

  return (
    <AppLayout>
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '2rem 1.5rem 3.5rem 1.5rem',
        }}
        className="space-y-7 w-full sm:px-8"
      >
        {/* ================= GREETING & WORKSPACE HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="editorial-kicker">Student Workspace</span>
              <span className="text-[var(--text-subtle)] text-xs">•</span>
              <span className="text-[11px] font-mono text-[var(--text-subtle)] uppercase">
                Academic Year 2026–27
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-main)]">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              You are enrolled in <span className="font-semibold text-[var(--text-main)]">{courses.length}</span> {courses.length === 1 ? 'course' : 'courses'} with{' '}
              <span className="font-semibold text-[var(--text-main)]">{pendingAssignments.length}</span> pending {pendingAssignments.length === 1 ? 'deadline' : 'deadlines'}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {isProfessor ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Course</span>
              </button>
            ) : (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll in Course</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback message */}
        {actionMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
              backgroundColor: actionMsg.type === 'success' ? 'var(--bg-card)' : 'var(--bg-card)',
              color: actionMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              border: `1px solid ${actionMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="font-medium">{actionMsg.text}</span>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= EDITORIAL METRICS STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          {/* 1. Enrolled Courses */}
          <div className="app-card p-4 sm:p-5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="editorial-kicker">Enrolled</span>
              <BookOpen className="w-4 h-4 text-[var(--text-subtle)]" />
            </div>
            <div>
              <div className="editorial-metric text-[var(--text-main)]">
                {courses.length}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                Active syllabi
              </div>
            </div>
          </div>

          {/* 2. Quizzes Attempted */}
          <div className="app-card p-4 sm:p-5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="editorial-kicker">Evaluations</span>
              <CheckSquare className="w-4 h-4 text-[var(--text-subtle)]" />
            </div>
            <div>
              <div className="editorial-metric text-[var(--text-main)]">
                {analytics?.quizzesAttempted ?? 0}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                Quizzes completed
              </div>
            </div>
          </div>

          {/* 3. Average Score */}
          <div className="app-card p-4 sm:p-5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="editorial-kicker">Mean Mastery</span>
              <TrendingUp className="w-4 h-4 text-[var(--text-subtle)]" />
            </div>
            <div>
              <div className="editorial-metric text-[var(--text-main)]">
                {analytics && analytics.quizzesAttempted > 0 ? `${analytics.averageScore}%` : '—'}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                Cumulative score
              </div>
            </div>
          </div>

          {/* 4. Topics to Revise */}
          <div className="app-card p-4 sm:p-5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="editorial-kicker">Review Topics</span>
              <Target className="w-4 h-4 text-[var(--text-subtle)]" />
            </div>
            <div>
              <div className="editorial-metric text-[var(--text-main)]">
                {analytics?.weakTopics?.length ?? 0}
              </div>
              <div className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                Needs reinforcement
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN DASHBOARD 2-COLUMN STRUCTURE (62% Left, 38% Right) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start w-full">
          {/* ================= LEFT COLUMN: MY COURSES (7 of 12 columns) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold tracking-tight text-[var(--text-main)]">
                  Enrolled Courses
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-subtle)] bg-[var(--bg-subtle)]">
                  {courses.length}
                </span>
              </div>
              <Link
                href="/dashboard/courses"
                className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>View catalog</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="app-card h-48 animate-pulse" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              /* Editorial zero-course card */
              <div className="app-card p-8 sm:p-10 text-center space-y-4 border-dashed">
                <div
                  className="w-10 h-10 rounded-md mx-auto flex items-center justify-center font-mono font-bold text-sm"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <BookOpen className="w-5 h-5 opacity-70" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    No active course enrollments
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Enter the academic course code provided by your instructor to access lecture notes, grounded AI tutoring, summaries, and quizzes.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enroll in Course</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Course Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <StudentCourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: ADVISORY, DEADLINES & RECENT ACTIVITY (5 of 12 columns) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* 1. Academic Study Advisory (Recommendations) */}
            <div className="app-card p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)] font-mono">
                    Study Advisory
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-subtle)]">
                  Evaluation Feedback
                </span>
              </div>

              {analytics && analytics.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      className="p-3.5 rounded-md text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-[var(--color-warning)]" />
                          <span>{rec.topic}</span>
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-subtle)]">
                          {rec.courseCode}
                        </span>
                      </div>
                      <p className="text-[var(--text-muted)] text-[12px] leading-relaxed">
                        {rec.advice}
                      </p>
                      <div className="pt-1 flex items-center justify-between border-t border-[var(--border-subtle)]">
                        <Link
                          href="/dashboard/tutor"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:underline"
                        >
                          <span>Review with Tutor</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href="/dashboard/quizzes"
                          className="text-[11px] font-medium px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          Practice Quiz
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-md text-center text-xs space-y-2 bg-[var(--bg-subtle)]">
                  <p className="text-[var(--text-muted)] leading-relaxed text-[12px]">
                    No immediate revision flags. Recommendations automatically update as you complete evaluations.
                  </p>
                  <Link
                    href="/dashboard/quizzes"
                    className="btn-secondary text-[11px] inline-flex py-1 px-3"
                  >
                    Take a Practice Quiz
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Upcoming Academic Deadlines */}
            <div className="app-card p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)] font-mono">
                    Upcoming Deadlines
                  </h2>
                </div>
                <Link
                  href="/dashboard/timeline"
                  className="text-[11px] font-mono text-[var(--primary)] hover:underline"
                >
                  Timeline →
                </Link>
              </div>

              {pendingAssignments.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingAssignments.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      className="p-3 rounded-md text-xs space-y-1.5 hover:border-[var(--border-strong)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-main)]">
                          {item.courseCode}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-medium ${
                            item.status === 'Overdue' ? 'text-[var(--color-danger)]' : 'text-[var(--text-subtle)]'
                          }`}
                        >
                          {item.countdown}
                        </span>
                      </div>

                      <h3 className="font-medium text-[var(--text-main)] truncate text-[12px]">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-subtle)]">
                        <span>Due {item.deadlineFormatted}</span>
                        <Link
                          href={`/dashboard/courses/${item.courseId}?tab=assignments`}
                          className="font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Submit</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-md text-center text-xs space-y-1 bg-[var(--bg-subtle)]">
                  <p className="font-medium text-[var(--color-success)] flex items-center justify-center gap-1.5 text-[12px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>No pending deliverables</span>
                  </p>
                  <p className="text-[11px] text-[var(--text-subtle)]">All course assignments are submitted.</p>
                </div>
              )}
            </div>

            {/* 3. Evaluation Ledger (Recent Activity) */}
            <div className="app-card p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)] font-mono">
                    Evaluation Ledger
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-subtle)]">
                  Recent Results
                </span>
              </div>

              {analytics && analytics.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      className="p-2.5 rounded-md flex items-center justify-between text-xs"
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="font-medium text-[var(--text-main)] truncate text-[12px]">
                          {act.title}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--text-subtle)] mt-0.5">
                          {act.courseCode} • {act.topic}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)]">
                          {act.score}/{act.maxScore} ({act.percentage}%)
                        </span>
                        <div className="font-mono text-[9px] text-[var(--text-subtle)] mt-1">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-md text-center text-xs bg-[var(--bg-subtle)] text-[var(--text-subtle)]">
                  <span>No evaluation records logged yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {/* Create Course Modal */}
      {showCreateModal && (
        <div
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
        >
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="w-full max-w-md border rounded-lg p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--text-main)]">
                Create New Academic Course
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <div>
                <label className="editorial-kicker block mb-1">
                  Course Code
                </label>
                <input
                  className="app-input uppercase font-mono text-xs"
                  placeholder="e.g. CS201"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="editorial-kicker block mb-1">
                  Course Title
                </label>
                <input
                  className="app-input text-xs"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="editorial-kicker block mb-1">
                  Syllabus Description
                </label>
                <textarea
                  className="app-input resize-none h-20 text-xs"
                  placeholder="Overview of course topics, prerequisites, and learning objectives..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Course Modal */}
      {showEnrollModal && (
        <div
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
        >
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="w-full max-w-sm border rounded-lg p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-main)]">
                  Enroll in Course
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Enter the course code provided by your instructor (e.g. <span className="font-mono">CS101</span>, <span className="font-mono">CSET201</span>).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollError(null);
                  setEnrollSuccess(null);
                }}
                disabled={enrollLoading}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Message inside modal */}
            {enrollError && (
              <div className="p-3 rounded-md text-xs flex items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {/* Success Message inside modal */}
            {enrollSuccess && (
              <div className="p-3 rounded-md text-xs flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{enrollSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEnroll} className="space-y-3.5">
              <div>
                <label className="editorial-kicker block mb-1">
                  Course Code
                </label>
                <input
                  className="app-input uppercase tracking-wider font-mono text-sm"
                  placeholder="e.g. CS101"
                  value={enrollCode}
                  onChange={(e) => {
                    setEnrollCode(e.target.value.toUpperCase());
                    if (enrollError) setEnrollError(null);
                  }}
                  disabled={enrollLoading}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollError(null);
                    setEnrollSuccess(null);
                  }}
                  disabled={enrollLoading}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollLoading || !enrollCode.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {enrollLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Enroll Now</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
