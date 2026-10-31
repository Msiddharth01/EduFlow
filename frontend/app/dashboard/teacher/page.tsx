'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import { teacherApi, courseApi, TeacherDashboardData, TeacherWeakTopicItem, TeacherCourseOverviewItem } from '@/lib/api';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Plus,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw,
  Clock,
  Layers,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Student filter
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS'>('ALL');
  const [studentSearch, setStudentSearch] = useState('');

  // Course modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: '', title: '', description: '' });
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Weak topic detail modal
  const [selectedTopic, setSelectedTopic] = useState<TeacherWeakTopicItem | null>(null);

  // Edit course state
  const [courseToEdit, setCourseToEdit] = useState<TeacherCourseOverviewItem | null>(null);
  const [editCourseForm, setEditCourseForm] = useState({ code: '', title: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete course state
  const [courseToDelete, setCourseToDelete] = useState<TeacherCourseOverviewItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active three-dot menu ID
  const [activeCourseMenuId, setActiveCourseMenuId] = useState<string | null>(null);

  // Close course dropdown when clicking outside
  useEffect(() => {
    const handleCloseMenu = () => setActiveCourseMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const handleOpenEditCourse = (course: TeacherCourseOverviewItem) => {
    setCourseToEdit(course);
    setEditCourseForm({
      code: course.code,
      title: course.title,
      description: course.description || '',
    });
    setEditError(null);
    setActiveCourseMenuId(null);
  };

  const handleSaveEditedCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToEdit) return;

    if (!editCourseForm.code.trim()) {
      setEditError('Course code is required.');
      return;
    }
    if (!editCourseForm.title.trim()) {
      setEditError('Course title is required.');
      return;
    }

    setEditLoading(true);
    setEditError(null);

    const res = await courseApi.update(courseToEdit.id, {
      code: editCourseForm.code.trim().toUpperCase(),
      title: editCourseForm.title.trim(),
      description: editCourseForm.description.trim(),
    });

    if (res.success) {
      setCourseToEdit(null);
      await loadDashboard();
    } else {
      setEditError(res.error || 'Failed to update course.');
    }
    setEditLoading(false);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await courseApi.delete(courseToDelete.id);
    if (res.success) {
      setCourseToDelete(null);
      await loadDashboard();
    } else {
      setDeleteError(res.error || 'Failed to delete course.');
    }
    setDeleteLoading(false);
  };

  // Protect route
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role === 'STUDENT') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await teacherApi.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'PROFESSOR' || user.role === 'ADMIN')) {
      loadDashboard();
    }
  }, [user]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await courseApi.create(courseForm);
    if (res.success) {
      setActionMsg({ type: 'success', text: `Course ${courseForm.code} created successfully.` });
      setShowCreateModal(false);
      setCourseForm({ code: '', title: '', description: '' });
      loadDashboard();
    } else {
      setActionMsg({ type: 'error', text: res.error });
    }
  };

  if (isLoading || loading || !data) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Teacher Workspace & Class Analytics...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { summary, courses, students, weakTopics, quizzes } = data;

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesTab =
      studentFilter === 'ALL' ||
      (studentFilter === 'NEEDS_SUPPORT' && s.status === 'NEEDS_SUPPORT') ||
      (studentFilter === 'GOOD' && s.status === 'GOOD') ||
      (studentFilter === 'NO_ATTEMPTS' && s.status === 'NO_ATTEMPTS');

    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                Professor Workspace
              </span>
              <span className="text-xs text-gray-400">· {user?.name}</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Instructor Analytics & Course Control</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live monitoring of student mastery, material indexing, quiz outcomes, and identified learning gaps.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDashboard}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#162139] hover:bg-[#1e2d4e] border border-[#243456] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Course</span>
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              actionMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
            }`}
          >
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Enrolled Students */}
          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Students</span>
              <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-800/40 text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{summary.totalStudents}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span>Across {summary.totalCourses} course{summary.totalCourses === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Average Quiz Score */}
          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class Average Score</span>
              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/40 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                {summary.averageQuizScore}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                From {summary.totalAttempts} verified student submission{summary.totalAttempts === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Card 3: Students Needing Support */}
          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Needs Attention</span>
              <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-800/40 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-rose-400">
                {summary.studentsNeedingSupportCount}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Scoring below 60% on quiz attempts
              </div>
            </div>
          </div>

          {/* Card 4: Total Materials & Quizzes */}
          <div className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course Assets</span>
              <div className="p-2 rounded-xl bg-violet-950/70 border border-violet-800/40 text-violet-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                {summary.totalMaterials} <span className="text-sm font-normal text-gray-400">/</span> {summary.totalQuizzes}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {summary.totalMaterials} Lecture PDFs · {summary.totalQuizzes} Active Quizzes
              </div>
            </div>
          </div>
        </div>

        {/* Calculation details notice */}
        <div className="px-4 py-2.5 rounded-xl bg-[#0c1220] border border-[#172238] flex items-center gap-2.5 text-xs text-gray-400">
          <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>
            <strong>Calculation Method:</strong> Class Average Score is calculated from actual server-evaluated points scored divided by total available points. Students with zero quiz attempts are categorized separately as &quot;No Attempts&quot; rather than marked as failing.
          </span>
        </div>

        {/* SECTION 2: COURSE OVERVIEW & MANAGEMENT */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>My Active Courses ({courses.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Courses you manage, teach, and provide AI learning materials for.
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="p-8 text-center bg-[#0d1425] border border-[#1b263e] rounded-2xl text-xs text-gray-400 space-y-3">
              <BookOpen className="w-8 h-8 text-gray-500 mx-auto" />
              <p>You have not created any courses yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Create First Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between hover:border-[#2b3d63] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
                        {course.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">
                          {course.classAverage !== null ? (
                            <span className="text-emerald-400 font-bold">Avg: {course.classAverage}%</span>
                          ) : (
                            <span className="text-gray-500">No attempts yet</span>
                          )}
                        </span>

                        {/* Course Card Three-dot Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCourseMenuId(activeCourseMenuId === course.id ? null : course.id);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1b2742] transition-colors cursor-pointer"
                            title="Course options"
                            aria-label="Course options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeCourseMenuId === course.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-44 rounded-xl shadow-2xl py-1 z-30"
                              style={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              <button
                                onClick={() => handleOpenEditCourse(course)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-indigo-500/10 text-left transition-colors cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Edit Course</span>
                              </button>
                              <div className="h-px my-1" style={{ backgroundColor: 'var(--border-color)' }} />
                              <button
                                onClick={() => {
                                  setCourseToDelete(course);
                                  setDeleteError(null);
                                  setActiveCourseMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 text-left transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                <span>Delete Course</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1.5">{course.title}</h3>
                    {course.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                        {course.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#18233a] my-3 text-center">
                      <div>
                        <div className="text-sm font-bold text-white">{course.enrollmentCount}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Students</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{course.materialCount}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Materials</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{course.quizCount}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Quizzes</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="grid grid-cols-3 gap-1.5">
                      <Link
                        href={`/dashboard/courses/${course.id}?tab=materials`}
                        className="py-1.5 bg-[#141d33] hover:bg-[#1a2642] text-gray-300 hover:text-white rounded text-[11px] font-medium text-center border border-[#1f2c4a] transition-colors"
                      >
                        Materials
                      </Link>
                      <Link
                        href={`/dashboard/teacher/students?course=${course.id}`}
                        className="py-1.5 bg-[#141d33] hover:bg-[#1a2642] text-gray-300 hover:text-white rounded text-[11px] font-medium text-center border border-[#1f2c4a] transition-colors"
                      >
                        Roster
                      </Link>
                      <Link
                        href={`/dashboard/teacher/quizzes?course=${course.id}`}
                        className="py-1.5 bg-[#141d33] hover:bg-[#1a2642] text-gray-300 hover:text-white rounded text-[11px] font-medium text-center border border-[#1f2c4a] transition-colors"
                      >
                        Quizzes
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: WEAK-TOPIC ANALYTICS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Class Weak Topics & Struggling Concepts</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically identified from student answers across all course quiz submissions.
              </p>
            </div>
            <Link
              href="/dashboard/teacher/analytics"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {weakTopics.length === 0 ? (
            <div className="p-8 text-center bg-[#0d1425] border border-[#1b263e] rounded-2xl text-xs text-gray-400 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p>No weak topics detected. Either students are scoring above 60% or quizzes have not been attempted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weakTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                      Accuracy: {topic.accuracyRate}%
                    </span>
                    <span className="text-xs text-rose-400 font-medium">
                      {topic.affectedStudentsCount} student{topic.affectedStudentsCount === 1 ? '' : 's'} struggling
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{topic.topic}</h3>
                    <div className="text-xs text-indigo-400 flex items-center gap-1.5 mt-1">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Source PDF: {topic.materialFileName}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Concept Mastery</span>
                      <span>{topic.accuracyRate}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#162139] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          topic.accuracyRate < 50
                            ? 'bg-rose-500'
                            : topic.accuracyRate < 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, topic.accuracyRate)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>{topic.incorrectCount} mistakes out of {topic.totalAnswers} answers</span>
                      <span>Quiz: {topic.quizTitle}</span>
                    </div>
                  </div>

                  {/* Inspect questions button */}
                  <button
                    onClick={() => setSelectedTopic(topic)}
                    className="w-full py-1.5 bg-[#141d33] hover:bg-[#1a2642] text-indigo-300 hover:text-white rounded-lg text-xs font-medium border border-[#1f2c4a] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Struggled Questions ({topic.sampleQuestions.length})</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: STUDENT ROSTER & PERFORMANCE */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Enrolled Students Performance ({students.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time tracking of student attempts, average scores, and attention alerts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-[#0c1220] border border-[#1f2c4a] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>

              {/* Status tabs */}
              <div className="flex rounded-lg bg-[#0c1220] border border-[#1f2c4a] p-0.5 text-xs">
                <button
                  onClick={() => setStudentFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    studentFilter === 'ALL' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  onClick={() => setStudentFilter('NEEDS_SUPPORT')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    studentFilter === 'NEEDS_SUPPORT' ? 'bg-rose-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Needs Attention ({summary.studentsNeedingSupportCount})
                </button>
                <button
                  onClick={() => setStudentFilter('GOOD')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    studentFilter === 'GOOD' ? 'bg-emerald-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Good (
                  {students.filter((s) => s.status === 'GOOD').length})
                </button>
                <button
                  onClick={() => setStudentFilter('NO_ATTEMPTS')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    studentFilter === 'NO_ATTEMPTS' ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  No Attempts (
                  {students.filter((s) => s.status === 'NO_ATTEMPTS').length})
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0d1425] border border-[#1b263e] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1b263e] text-gray-400 font-semibold bg-[#0a101d]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Courses</th>
                    <th className="py-3 px-4">Quiz Attempts</th>
                    <th className="py-3 px-4">Average Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18233a]">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No students match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-[#11192e] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{st.name}</div>
                              <div className="text-[11px] text-gray-400">{st.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {st.courses?.map((c) => (
                              <span
                                key={c.courseId}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-[#162139] text-gray-300 border border-[#243456]"
                              >
                                {c.courseCode}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-white">
                          {st.totalAttempts} attempt{st.totalAttempts === 1 ? '' : 's'}
                        </td>

                        <td className="py-3 px-4">
                          {st.averageScore !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-[#162139] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    st.averageScore < 60 ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${st.averageScore}%` }}
                                />
                              </div>
                              <span
                                className={`font-bold ${
                                  st.averageScore < 60 ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {st.averageScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No score yet</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {st.status === 'GOOD' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                              On Track
                            </span>
                          )}
                          {st.status === 'NEEDS_SUPPORT' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-800/40 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Needs Attention</span>
                            </span>
                          )}
                          {st.status === 'NO_ATTEMPTS' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-gray-900 text-gray-400 border border-gray-800">
                              No Attempts
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {st.lastActivity ? new Date(st.lastActivity).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 5: QUIZ RESULTS OVERVIEW */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Class Quiz Results & Completion ({quizzes.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Summary of attempts, average performance, and score distribution.
              </p>
            </div>
            <Link
              href="/dashboard/teacher/quizzes"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Detailed Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 rounded-2xl bg-[#0d1425] border border-[#1b263e] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
                      {quiz.courseCode}
                    </span>
                    <span className="text-xs text-gray-400">{quiz.questionCount} Questions</span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{quiz.title}</h3>
                  <div className="text-xs text-indigo-400 flex items-center gap-1 mb-3">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Source: {quiz.materialFileName || quiz.topic}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a101d] border border-[#18233a] space-y-2 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Total Submissions:</span>
                      <span className="font-bold text-white">{quiz.attemptsCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Class Average:</span>
                      <span className={`font-bold ${quiz.averageScore !== null && quiz.averageScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {quiz.averageScore !== null ? `${quiz.averageScore}%` : 'No attempts'}
                      </span>
                    </div>

                    {quiz.scoreDistribution && (
                      <div className="pt-2 border-t border-[#18233a] space-y-1">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Score Spread</div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                          <div className="p-1 rounded bg-rose-950/40 text-rose-300">
                            &lt;50%: {quiz.scoreDistribution.below50}
                          </div>
                          <div className="p-1 rounded bg-amber-950/40 text-amber-300">
                            50-70%: {quiz.scoreDistribution.from50to70}
                          </div>
                          <div className="p-1 rounded bg-indigo-950/40 text-indigo-300">
                            70-90%: {quiz.scoreDistribution.from70to90}
                          </div>
                          <div className="p-1 rounded bg-emerald-950/40 text-emerald-300">
                            &gt;90%: {quiz.scoreDistribution.above90}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/dashboard/teacher/quizzes`}
                  className="w-full py-1.5 bg-[#141d33] hover:bg-[#1a2642] text-gray-300 hover:text-white rounded-lg text-xs font-semibold text-center border border-[#1f2c4a] transition-colors"
                >
                  View Question Breakdown →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* WEAK TOPIC DETAIL MODAL */}
        {selectedTopic && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c1322] border border-[#1a253c] rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#18233a]">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Struggled Concept</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedTopic.topic}</h3>
                  <p className="text-xs text-gray-400">PDF: {selectedTopic.materialFileName}</p>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#162139]"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300">
                <strong>Concept Diagnostic:</strong> {selectedTopic.incorrectCount} incorrect responses out of {selectedTopic.totalAnswers} student answers ({selectedTopic.accuracyRate}% accuracy). Below are the questions where students faced difficulty:
              </div>

              <div className="space-y-3">
                {selectedTopic.sampleQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-[#080d19] border border-[#172238] space-y-2">
                    <div className="flex justify-between items-start text-xs text-gray-400">
                      <span className="font-bold text-white">Question {idx + 1}</span>
                      <span className="text-rose-400 font-semibold">{q.incorrectCount} student mistake(s)</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">{q.text}</p>
                    {q.pageReference && (
                      <div className="text-[11px] text-indigo-400">
                        Referenced in lecture on Page {q.pageReference}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#18233a] flex justify-end">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  Close Diagnostic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE COURSE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c1322] border border-[#1a253c] rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#18233a]">
                <h3 className="text-base font-bold text-white">Create New Course</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#162139]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                    Course Code (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS401 or CCSET301"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1f2c4a] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1f2c4a] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of course syllabus..."
                    value={courseForm.description}
                    onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#080d19] border border-[#1f2c4a] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT COURSE MODAL */}
        {courseToEdit && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className="w-full max-w-md app-card rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Edit Course</h3>
                </div>
                <button
                  onClick={() => setCourseToEdit(null)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-lg text-xs bg-red-950/40 border border-red-800/50 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditedCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                    Course Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS401"
                    value={editCourseForm.code}
                    onChange={(e) => setEditCourseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    disabled={editLoading}
                    className="w-full px-3 py-2 rounded-lg text-xs uppercase font-mono font-medium focus:outline-none focus:border-indigo-500"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                    Course Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems"
                    value={editCourseForm.title}
                    onChange={(e) => setEditCourseForm((p) => ({ ...p, title: e.target.value }))}
                    disabled={editLoading}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                    Description & Syllabus (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of course syllabus..."
                    value={editCourseForm.description}
                    onChange={(e) => setEditCourseForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={editLoading}
                    className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setCourseToEdit(null)}
                    disabled={editLoading}
                    className="px-3 py-2 text-xs rounded-lg border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    {editLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE COURSE CONFIRMATION MODAL */}
        {courseToDelete && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div
              className="w-full max-w-md app-card rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-400">Delete Course</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Permanent action: All materials and student records will be removed.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg text-xs bg-red-950/40 border border-red-800/50 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div
                className="p-3.5 rounded-xl text-xs space-y-2 border"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <p style={{ color: 'var(--text-main)' }}>
                  Are you sure you want to delete <strong className="font-semibold" style={{ color: 'var(--text-main)' }}>{courseToDelete.title}</strong>{' '}
                  (<span className="font-mono text-indigo-400 font-bold">{courseToDelete.code}</span>)?
                </p>
                <div className="pt-2 border-t text-[11px] space-y-1" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  <p className="font-semibold text-red-400">This will permanently delete:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>All materials & AI lecture embeddings</li>
                    <li>All quizzes and student attempt records</li>
                    <li>All course enrollments</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCourseToDelete(null)}
                  disabled={deleteLoading}
                  className="px-3 py-2 text-xs rounded-lg border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Course</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
