'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import {
  courseApi,
  analyticsApi,
  CourseWithMeta,
  StudentAnalytics,
} from '@/lib/api';
import {
  BookOpen,
  CheckSquare,
  TrendingUp,
  Target,
  ArrowRight,
  Plus,
  Play,
  FileText,
  Clock,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
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
      const [coursesRes, analyticsRes] = await Promise.all([
        courseApi.list(),
        analyticsApi.getStudentAnalytics(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.data.courses);
      if (analyticsRes.success) setAnalytics(analyticsRes.data.analytics);
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
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading EduFlow workspace...</span>
        </div>
      </div>
    );
  }

  const isProfessor = user.role === 'PROFESSOR';

  return (
    <AppLayout>
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '2rem 2.25rem 3.5rem 2.25rem',
        }}
        className="space-y-8 w-full"
      >
        {/* ================= GREETING HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1
              style={{
                color: 'var(--text-main)',
                fontSize: '1.875rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
              }}
            >
              Welcome back, {user.name}!
            </h1>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                marginTop: '0.35rem',
              }}
            >
              Continue your learning journey.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {isProfessor ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Course</span>
              </button>
            ) : (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll in Course</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback message */}
        {actionMsg && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '0.625rem',
              fontSize: '0.85rem',
              backgroundColor: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: actionMsg.type === 'success' ? '#10B981' : '#EF4444',
              border: actionMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{actionMsg.text}</span>
            <button
              onClick={() => setActionMsg(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= 4 METRIC STATS CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* 1. Enrolled Courses */}
          <div className="app-card p-5 flex items-center gap-4">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#818CF8',
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {courses.length}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  marginTop: '0.2rem',
                }}
              >
                Enrolled Courses
              </div>
            </div>
          </div>

          {/* 2. Quizzes Attempted */}
          <div className="app-card p-5 flex items-center gap-4">
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#FBBF24',
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {analytics?.quizzesAttempted ?? 0}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  marginTop: '0.2rem',
                }}
              >
                Quizzes Attempted
              </div>
            </div>
          </div>

          {/* 3. Average Score */}
          <div className="app-card p-5 flex items-center gap-4">
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#34D399',
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {analytics && analytics.quizzesAttempted > 0 ? `${analytics.averageScore}%` : 'N/A'}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  marginTop: '0.2rem',
                }}
              >
                Average Score
              </div>
            </div>
          </div>

          {/* 4. Topics to Revise */}
          <div className="app-card p-5 flex items-center gap-4">
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#F87171',
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {analytics?.weakTopics?.length ?? 0}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  marginTop: '0.2rem',
                }}
              >
                Topics to Revise
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN DASHBOARD 2-COLUMN STRUCTURE (62% Left, 38% Right) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start w-full">
          {/* ================= LEFT COLUMN: MY COURSES (7.5 of 12 columns ~ 63%) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
                className="flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>My Courses</span>
              </h2>
              <Link
                href="/dashboard/courses"
                style={{ color: '#818CF8', textDecoration: 'none' }}
                className="text-xs font-semibold hover:underline"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="app-card h-32 animate-pulse" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              /* Compact, properly vertically-aligned zero-course card */
              <div className="app-card p-8 text-center space-y-3.5">
                <div
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    color: '#818CF8',
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}
                >
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3
                    style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}
                  >
                    You haven’t enrolled in any courses yet.
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      marginTop: '0.35rem',
                      lineHeight: 1.5,
                    }}
                  >
                    Enter the course code provided by your professor to access lecture PDFs, AI tutoring, summaries, and quizzes.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enroll in Course</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Course Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => {
                  const progressPct = course.progress !== undefined ? course.progress : 0;
                  const materialsCount = course._count?.materials ?? 0;
                  const quizzesCount = course._count?.quizzes ?? 0;

                  return (
                    <Link
                      key={course.id}
                      href={`/dashboard/courses/${course.id}`}
                      style={{ textDecoration: 'none' }}
                      className="app-card p-5 flex flex-col justify-between group hover:border-indigo-500/60 transition-all block"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2.5">
                          <span
                            style={{
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: '#818CF8',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '0.375rem',
                            }}
                          >
                            {course.code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: course.myRoleInCourse === 'PROFESSOR' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: course.myRoleInCourse === 'PROFESSOR' ? '#A855F7' : '#10B981',
                            }}
                          >
                            {course.myRoleInCourse}
                          </span>
                        </div>

                        <h3
                          style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}
                          className="group-hover:text-indigo-400 transition-colors mb-1.5"
                        >
                          {course.title}
                        </h3>

                        {/* Professor display */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{course.professor || 'Prof. Faculty'}</span>
                        </div>

                        {course.description && (
                          <p
                            style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}
                            className="line-clamp-2 mb-3"
                          >
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-1">
                        {/* Progress bar using real backend data */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span style={{ color: 'var(--text-subtle)' }}>Progress</span>
                            <span style={{ color: '#818CF8', fontWeight: 600 }}>{progressPct}% complete</span>
                          </div>
                          <div className="w-full bg-[#080D19] h-1.5 rounded-full overflow-hidden">
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
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: RECOMMENDATIONS & RECENT ACTIVITY (4.5 of 12 columns ~ 37%) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* 1. Personalized Recommendations Card */}
            <div className="app-card p-6 space-y-4">
              <h2
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Personalized Recommendations</span>
              </h2>

              {analytics && analytics.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                      className="p-4 rounded-xl text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          <span>Revise: {rec.topic}</span>
                        </span>
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>{rec.courseCode}</span>
                      </div>
                      <p style={{ color: 'var(--text-main)', lineHeight: 1.55 }}>
                        {rec.advice}
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <Link
                          href="/dashboard/tutor"
                          style={{ color: '#818CF8', textDecoration: 'none' }}
                          className="inline-flex items-center gap-1 font-semibold hover:underline"
                        >
                          <span>Review with AI Tutor</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link
                          href="/dashboard/quizzes"
                          className="px-2.5 py-1 rounded bg-[#080D19] border border-[#263247] text-gray-300 hover:text-white font-medium text-[11px]"
                        >
                          Practice Quiz
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  className="p-5 rounded-xl text-center text-xs space-y-3"
                >
                  <p className="leading-relaxed">
                    Personalized revision recommendations will appear here after you attempt your course quizzes.
                  </p>
                  <Link
                    href="/dashboard/quizzes"
                    className="btn-secondary text-xs inline-flex"
                  >
                    <span>Practice a Quiz</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Recent Activity Card */}
            <div className="app-card p-6 space-y-4">
              <h2
                style={{
                  color: 'var(--text-main)',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                }}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Recent Activity</span>
              </h2>

              {analytics && analytics.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                      }}
                      className="p-3.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="overflow-hidden pr-2">
                        <div style={{ color: 'var(--text-main)' }} className="font-semibold truncate">
                          {act.title}
                        </div>
                        <div style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                          {act.courseCode} · {act.topic}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          {act.score}/{act.maxScore} ({act.percentage}%)
                        </span>
                        <div style={{ color: 'var(--text-subtle)', fontSize: '0.68rem', marginTop: '0.2rem' }}>
                          {new Date(act.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  className="p-5 rounded-xl text-center text-xs"
                >
                  <span>No recent activity recorded yet.</span>
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
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
        >
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="w-full max-w-md border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>
              Create New Course
            </h2>
            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }} className="block uppercase mb-1">
                  Course Code
                </label>
                <input
                  className="app-input uppercase"
                  placeholder="e.g. CS201"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }} className="block uppercase mb-1">
                  Course Title
                </label>
                <input
                  className="app-input"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }} className="block uppercase mb-1">
                  Description
                </label>
                <textarea
                  className="app-input resize-none h-20"
                  placeholder="Course overview and syllabus details..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
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
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
        >
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="w-full max-w-sm border rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>
                  Enroll in Course
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.25rem' }}>
                  Enter the course code provided by your instructor (e.g. CS101, CCSET201).
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
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Error Message inside modal */}
            {enrollError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                }}
                className="p-3 rounded-lg border text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {/* Success Message inside modal */}
            {enrollSuccess && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: '#34D399',
                }}
                className="p-3 rounded-lg border text-xs flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{enrollSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEnroll} className="space-y-3.5">
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }} className="block uppercase mb-1">
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

              <div className="flex gap-3 pt-2">
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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enrolling...</span>
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
