'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import {
  assignmentApi,
  courseApi,
  ProfessorAssignmentItem,
  CourseWithMeta,
} from '@/lib/api';
import AssignmentSubmissionsView from '@/components/AssignmentSubmissionsView';
import CreateAssignmentModal from '@/components/CreateAssignmentModal';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronRight,
  BookOpen,
  Filter,
} from 'lucide-react';

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ProfessorAssignmentItem[]>([]);
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');

  // Submissions view state
  const [viewingSubmissionsId, setViewingSubmissionsId] = useState<string | null>(null);

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalCourseId, setModalCourseId] = useState<string>('');
  const [modalCourseCode, setModalCourseCode] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, coursesRes] = await Promise.all([
        assignmentApi.getProfessorAssignments(),
        courseApi.list(),
      ]);

      if (assignRes.success) {
        setAssignments(assignRes.data.assignments);
      } else {
        setError(assignRes.error || 'Failed to load assignments.');
      }

      if (coursesRes.success) {
        setCourses(coursesRes.data.courses);
        if (coursesRes.data.courses.length > 0 && !modalCourseId) {
          setModalCourseId(coursesRes.data.courses[0].id);
          setModalCourseCode(coursesRes.data.courses[0].code);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = (cId?: string, cCode?: string) => {
    const courseToUse = cId || (courses.length > 0 ? courses[0].id : '');
    const codeToUse = cCode || (courses.length > 0 ? courses[0].code : '');
    setModalCourseId(courseToUse);
    setModalCourseCode(codeToUse);
    setCreateModalOpen(true);
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCourseFilter !== 'ALL' && a.courseId !== selectedCourseFilter) {
      return false;
    }

    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* If viewing submission dashboard */}
        {viewingSubmissionsId ? (
          <AssignmentSubmissionsView
            assignmentId={viewingSubmissionsId}
            onBack={() => {
              setViewingSubmissionsId(null);
              fetchData();
            }}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">
                    Assignment Management
                  </h1>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Manage homework, problem sets, and review student PDF submissions across all your courses.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => handleOpenCreateModal()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Assignment</span>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assignment title..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)]"
                />
              </div>

              {/* Course Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] font-medium cursor-pointer"
                >
                  <option value="ALL">All Courses ({courses.length})</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} – {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 text-[var(--text-muted)] space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                <p className="text-sm font-medium">Loading assignments & submission statistics...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  No assignments found
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Create an assignment to start assigning coursework and tracking student PDF submissions.
                </p>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors mt-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Assignment</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:border-[var(--primary)]/50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                            {assignment.courseCode}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {assignment.courseTitle}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              assignment.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]'
                            }`}
                          >
                            {assignment.status}
                          </span>
                          {assignment.allowLateSubmission && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Late Allowed
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {assignment.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                            <span>
                              Deadline:{' '}
                              <strong className="text-[var(--text-main)]">
                                {assignment.deadlineFormatted}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>{assignment.countdown}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Metrics */}
                      <div className="flex items-center gap-4 text-xs bg-[var(--bg-subtle)] px-4 py-3 rounded-xl border border-[var(--border-color)]">
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)]">Submissions</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {assignment.submittedCount} / {assignment.totalEnrolled}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-[var(--border-color)]" />
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)]">Pending</p>
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {assignment.notSubmittedCount}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-[var(--border-color)]" />
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)]">Late</p>
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {assignment.lateCount}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingSubmissionsId(assignment.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Track Submissions</span>
                        </button>

                        <Link
                          href={`/dashboard/courses/${assignment.courseId}?tab=assignments`}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors cursor-pointer"
                          title="Open course workspace"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Assignment Modal */}
            {modalCourseId && (
              <CreateAssignmentModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                courseId={modalCourseId}
                courseCode={modalCourseCode}
                onSuccess={() => {
                  fetchData();
                }}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
