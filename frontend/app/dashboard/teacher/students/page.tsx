'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, TeacherStudentItem, getAvatarUrl } from '@/lib/api';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

export default function TeacherStudentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS'>('ALL');

  // Selected student for detail inspection modal
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentItem | null>(null);

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
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      const res = await teacherApi.getStudents();
      if (res.success) {
        setStudents(res.data.students);
      } else {
        setError(res.error || 'Failed to load student roster.');
      }
      setLoading(false);
    };

    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      fetchStudents();
    }
  }, [user]);

  // Unique course codes for course filter dropdown
  const allCourses = Array.from(
    new Set(
      students.flatMap((s) => (s.enrolledCourses || s.courses || []).map((c) => c.courseCode))
    )
  );

  // Filtered students
  const filteredStudents = students.filter((s) => {
    // Search query
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Course filter
    if (selectedCourseFilter !== 'ALL') {
      const studentCourses = s.enrolledCourses || s.courses || [];
      const isEnrolledInCourse = studentCourses.some(
        (c) => c.courseCode === selectedCourseFilter
      );
      if (!isEnrolledInCourse) return false;
    }

    // Status filter
    if (activeTab !== 'ALL') {
      if (s.status !== activeTab) return false;
    }

    return true;
  });

  const supportCount = students.filter((s) => s.status === 'NEEDS_SUPPORT').length;
  const goodCount = students.filter((s) => s.status === 'GOOD').length;
  const noAttemptsCount = students.filter((s) => s.status === 'NO_ATTEMPTS').length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 uppercase">
                Teacher Roster
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] mt-1">
              Enrolled Students & Performance
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              Track student engagement, quiz attempts, and learning support needs across all your courses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teacher"
              className="px-3.5 py-2 app-card-subtle text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-semibold rounded-lg transition-all"
            >
              Back to Overview
            </Link>
          </div>
        </div>

        {/* Metric Pill Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl app-card">
            <div className="text-xs text-[var(--text-muted)] font-medium">Total Students</div>
            <div className="text-xl font-black text-[var(--text-main)] mt-0.5">{students.length}</div>
          </div>
          <div className="p-3.5 rounded-xl app-card">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Good Standing (≥60%)</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{goodCount}</div>
          </div>
          <div className="p-3.5 rounded-xl app-card">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Needs Attention (&lt;60%)</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{supportCount}</div>
          </div>
          <div className="p-3.5 rounded-xl app-card">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">No Attempts Yet</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{noAttemptsCount}</div>
          </div>
        </div>

        {/* Search, Filter & Tabs Toolbar */}
        <div className="p-4 rounded-xl app-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 app-input text-xs"
              />
            </div>

            {/* Course Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Course:
              </span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 app-input text-xs w-auto"
              >
                <option value="ALL">All Courses</option>
                {allCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[var(--border-subtle)]">
            {[
              { id: 'ALL', label: `All (${students.length})` },
              { id: 'NEEDS_SUPPORT', label: `Needs Attention (${supportCount})` },
              { id: 'GOOD', label: `Good Standing (${goodCount})` },
              { id: 'NO_ATTEMPTS', label: `No Attempts (${noAttemptsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="p-12 text-center text-[var(--text-muted)] app-card rounded-xl text-xs">
            Loading students roster...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <div className="rounded-xl app-card overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-xs">
                No students match your selected search or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-color)]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Enrolled Courses</th>
                      <th className="py-3 px-4 text-center">Quiz Attempts</th>
                      <th className="py-3 px-4 text-center">Average Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--primary)] text-white font-bold text-xs ring-1 ring-[var(--primary)]/30">
                              {st.profileImage ? (
                                <img
                                  src={getAvatarUrl(st.profileImage)}
                                  alt={st.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{st.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-main)] text-sm">{st.name}</div>
                              <div className="text-[var(--text-muted)] text-[11px] font-mono">{st.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(st.enrolledCourses || st.courses || []).map((c) => (
                              <span
                                key={c.courseId}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--primary)] border border-[var(--border-color)]"
                              >
                                {c.courseCode}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[var(--text-main)]">
                          {st.totalAttempts}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {st.averageScore !== null ? (
                            <span
                              className={`font-black text-sm ${
                                st.averageScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {st.averageScore}%
                            </span>
                          ) : (
                            <span className="text-[var(--text-subtle)] text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {st.status === 'GOOD' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Good Standing
                            </span>
                          )}
                          {st.status === 'NEEDS_SUPPORT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              Needs Attention (&lt;60%)
                            </span>
                          )}
                          {st.status === 'NO_ATTEMPTS' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <HelpCircle className="w-3 h-3" />
                              No Attempts
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)] text-[11px]">
                          {st.lastActivity
                            ? new Date(st.lastActivity).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedStudent(st)}
                            className="px-2.5 py-1 rounded bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/30 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Student Performance Inspection Modal */}
        {selectedStudent && (
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
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm ring-2 ring-indigo-500/30">
                    {selectedStudent.profileImage ? (
                      <img
                        src={getAvatarUrl(selectedStudent.profileImage)}
                        alt={selectedStudent.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{selectedStudent.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        Student Dossier
                      </span>
                      {selectedStudent.status === 'GOOD' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Good Standing
                        </span>
                      )}
                      {selectedStudent.status === 'NEEDS_SUPPORT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Needs Attention
                        </span>
                      )}
                      {selectedStudent.status === 'NO_ATTEMPTS' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          No Attempts Yet
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>{selectedStudent.name}</h2>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{selectedStudent.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 rounded-lg hover:opacity-80 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Enrolled Courses</div>
                  <div className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                    {(selectedStudent.enrolledCourses || selectedStudent.courses || []).length}
                  </div>
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total Quiz Attempts</div>
                  <div className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                    {selectedStudent.totalAttempts}
                  </div>
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Average Score</div>
                  <div
                    className={`text-lg font-black mt-0.5 ${
                      selectedStudent.averageScore !== null && selectedStudent.averageScore >= 60
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : selectedStudent.averageScore !== null
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {selectedStudent.averageScore !== null
                      ? `${selectedStudent.averageScore}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Enrolled Courses Details */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Enrolled Courses
                </h3>
                <div className="space-y-1.5">
                  {(selectedStudent.enrolledCourses || selectedStudent.courses || []).map((c) => (
                    <div
                      key={c.courseId}
                      className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
                    >
                      <div>
                        <span className="font-bold mr-2" style={{ color: 'var(--primary)' }}>{c.courseCode}</span>
                        <span style={{ color: 'var(--text-main)' }}>{c.courseTitle}</span>
                      </div>
                      <Link
                        href={`/dashboard/courses/${c.courseId}`}
                        className="inline-flex items-center gap-1 font-semibold hover:underline"
                        style={{ color: 'var(--primary)' }}
                      >
                        <span>Open Course</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attempt History */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Verified Quiz Attempts ({(selectedStudent.attempts || []).length})
                </h3>
                {(!selectedStudent.attempts || selectedStudent.attempts.length === 0) ? (
                  <div className="p-4 rounded-lg border text-center text-xs" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    This student has not submitted any quiz attempts yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedStudent.attempts.map((att) => (
                      <div
                        key={att.id || att.attemptId}
                        className="p-3 rounded-lg border flex items-center justify-between text-xs"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--primary)' }}>
                              {att.courseCode}
                            </span>
                            <span>{att.quizTitle}</span>
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Submitted on {new Date(att.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-black text-sm ${
                              att.percentage >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {att.score} / {att.maxScore} ({att.percentage}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
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
