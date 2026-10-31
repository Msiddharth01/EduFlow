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
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase">
                Teacher Roster
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Enrolled Students & Performance
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Track student engagement, quiz attempts, and learning support needs across all your courses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teacher"
              className="px-3.5 py-2 bg-[#0e1628] hover:bg-[#16223b] border border-[#1e2d4d] text-gray-300 text-xs font-semibold rounded-lg transition-all"
            >
              Back to Overview
            </Link>
          </div>
        </div>

        {/* Metric Pill Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="text-xs text-gray-400 font-medium">Total Students</div>
            <div className="text-xl font-black text-white mt-0.5">{students.length}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="text-xs text-emerald-400 font-medium">Good Standing (≥60%)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{goodCount}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="text-xs text-rose-400 font-medium">Needs Attention (&lt;60%)</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">{supportCount}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d1425] border border-[#1b263e]">
            <div className="text-xs text-amber-400 font-medium">No Attempts Yet</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{noAttemptsCount}</div>
          </div>
        </div>

        {/* Search, Filter & Tabs Toolbar */}
        <div className="p-4 rounded-xl bg-[#0d1425] border border-[#1b263e] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#080d1a] border border-[#1c2944] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Course Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Course:
              </span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#080d1a] border border-[#1c2944] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#18233a]">
            {[
              { id: 'ALL', label: `All (${students.length})` },
              { id: 'NEEDS_SUPPORT', label: `Needs Attention (${supportCount})` },
              { id: 'GOOD', label: `Good Standing (${goodCount})` },
              { id: 'NO_ATTEMPTS', label: `No Attempts (${noAttemptsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[#080d1a] text-gray-400 hover:text-white hover:bg-[#121c32] border border-[#1b263e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="p-12 text-center text-gray-400 bg-[#0d1425] border border-[#1b263e] rounded-xl text-xs">
            Loading students roster...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <div className="rounded-xl bg-[#0d1425] border border-[#1b263e] overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                No students match your selected search or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090e1d] text-gray-400 uppercase tracking-wider font-semibold border-b border-[#1b263e]">
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
                  <tbody className="divide-y divide-[#162137]">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-[#10192e] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs ring-1 ring-indigo-500/30">
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
                              <div className="font-bold text-white text-sm">{st.name}</div>
                              <div className="text-gray-400 text-[11px] font-mono">{st.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(st.enrolledCourses || st.courses || []).map((c) => (
                              <span
                                key={c.courseId}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141d33] text-indigo-300 border border-indigo-900/40"
                              >
                                {c.courseCode}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-200">
                          {st.totalAttempts}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {st.averageScore !== null ? (
                            <span
                              className={`font-black text-sm ${
                                st.averageScore >= 60 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {st.averageScore}%
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {st.status === 'GOOD' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              <CheckCircle className="w-3 h-3" />
                              Good Standing
                            </span>
                          )}
                          {st.status === 'NEEDS_SUPPORT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                              <AlertCircle className="w-3 h-3" />
                              Needs Attention (&lt;60%)
                            </span>
                          )}
                          {st.status === 'NO_ATTEMPTS' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                              <HelpCircle className="w-3 h-3" />
                              No Attempts
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                          {st.lastActivity
                            ? new Date(st.lastActivity).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedStudent(st)}
                            className="px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all inline-flex items-center gap-1"
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-[#0e1628] border border-[#1e2d4d] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
                        Student Dossier
                      </span>
                      {selectedStudent.status === 'GOOD' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          Good Standing
                        </span>
                      )}
                      {selectedStudent.status === 'NEEDS_SUPPORT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                          Needs Attention
                        </span>
                      )}
                      {selectedStudent.status === 'NO_ATTEMPTS' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          No Attempts Yet
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">{selectedStudent.name}</h2>
                    <p className="text-xs text-gray-400 font-mono">{selectedStudent.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a253d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#080d1a] border border-[#1c2944]">
                  <div className="text-[11px] text-gray-400">Enrolled Courses</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {(selectedStudent.enrolledCourses || selectedStudent.courses || []).length}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#080d1a] border border-[#1c2944]">
                  <div className="text-[11px] text-gray-400">Total Quiz Attempts</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {selectedStudent.totalAttempts}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#080d1a] border border-[#1c2944]">
                  <div className="text-[11px] text-gray-400">Average Score</div>
                  <div
                    className={`text-lg font-black mt-0.5 ${
                      selectedStudent.averageScore !== null && selectedStudent.averageScore >= 60
                        ? 'text-emerald-400'
                        : selectedStudent.averageScore !== null
                        ? 'text-rose-400'
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
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Enrolled Courses
                </h3>
                <div className="space-y-1.5">
                  {(selectedStudent.enrolledCourses || selectedStudent.courses || []).map((c) => (
                    <div
                      key={c.courseId}
                      className="p-2.5 rounded-lg bg-[#080d1a] border border-[#1c2944] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-indigo-300 mr-2">{c.courseCode}</span>
                        <span className="text-gray-200">{c.courseTitle}</span>
                      </div>
                      <Link
                        href={`/dashboard/courses/${c.courseId}`}
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
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
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Verified Quiz Attempts ({(selectedStudent.attempts || []).length})
                </h3>
                {(!selectedStudent.attempts || selectedStudent.attempts.length === 0) ? (
                  <div className="p-4 rounded-lg bg-[#080d1a] border border-[#1c2944] text-center text-xs text-gray-400">
                    This student has not submitted any quiz attempts yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedStudent.attempts.map((att) => (
                      <div
                        key={att.id || att.attemptId}
                        className="p-3 rounded-lg bg-[#080d1a] border border-[#1c2944] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#141d33] text-indigo-300">
                              {att.courseCode}
                            </span>
                            <span>{att.quizTitle}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Submitted on {new Date(att.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-black text-sm ${
                              att.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'
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
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-[#1b263e] hover:bg-[#253555] text-white text-xs font-semibold rounded-lg transition-all"
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
