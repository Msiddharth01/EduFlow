'use client';
import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Download,
  UploadCloud,
  ChevronRight,
  Loader2,
  Users,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { assignmentApi, CourseAssignment, StudentSubmissionInfo } from '../lib/api';
import CreateAssignmentModal from './CreateAssignmentModal';
import SubmitAssignmentModal from './SubmitAssignmentModal';
import AssignmentSubmissionsView from './AssignmentSubmissionsView';
import PdfViewerModal from './PdfViewerModal';

interface CourseAssignmentsTabProps {
  courseId: string;
  courseCode: string;
  isProfessor: boolean;
}

export default function CourseAssignmentsTab({
  courseId,
  courseCode,
  isProfessor,
}: CourseAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Professor modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<CourseAssignment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSubmissionsAssignmentId, setSelectedSubmissionsAssignmentId] = useState<string | null>(null);

  // Student modal states
  const [submittingAssignment, setSubmittingAssignment] = useState<CourseAssignment | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    assignmentId: string;
    message: string;
  } | null>(null);

  // Shared PDF Viewer Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfDownloadName, setPdfDownloadName] = useState('document.pdf');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentApi.listByCourse(courseId);
      if (res.success) {
        setAssignments(res.data.assignments);
      } else {
        setError(res.error || 'Failed to load assignments.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  // Open reference PDF attachment
  const handleOpenReferencePdf = async (assignment: CourseAssignment) => {
    setPdfTitle(`Reference Document: ${assignment.title}`);
    setPdfDownloadName(assignment.attachmentName || `${assignment.title}-reference.pdf`);
    setPdfModalOpen(true);
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    const res = await assignmentApi.fetchAttachmentBlob(assignment.id);
    if (res.success) {
      setPdfBlobUrl(res.blobUrl);
    } else {
      setPdfError(res.error || 'Could not stream reference PDF file.');
    }
    setPdfLoading(false);
  };

  // Open student's submitted PDF
  const handleOpenMySubmissionPdf = async (assignment: CourseAssignment) => {
    if (!assignment.mySubmission) return;
    setPdfTitle(`My Submission: ${assignment.title}`);
    setPdfDownloadName(assignment.mySubmission.originalFileName || 'my-submission.pdf');
    setPdfModalOpen(true);
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    const res = await assignmentApi.fetchSubmissionBlob(assignment.mySubmission.id);
    if (res.success) {
      setPdfBlobUrl(res.blobUrl);
    } else {
      setPdfError(res.error || 'Could not stream submitted PDF file.');
    }
    setPdfLoading(false);
  };

  // Delete assignment handler
  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;
    setDeleteLoading(true);
    try {
      const res = await assignmentApi.delete(deletingAssignment.id);
      if (res.success) {
        setAssignments((prev) => prev.filter((a) => a.id !== deletingAssignment.id));
        setDeletingAssignment(null);
      } else {
        alert(res.error || 'Failed to delete assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // If professor selected to view submission tracking for an assignment
  if (selectedSubmissionsAssignmentId) {
    return (
      <AssignmentSubmissionsView
        assignmentId={selectedSubmissionsAssignmentId}
        onBack={() => {
          setSelectedSubmissionsAssignmentId(null);
          fetchAssignments();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading course assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>Course Assignments</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
              {courseCode}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isProfessor
              ? 'Create, manage, and evaluate course assignments and student PDF submissions.'
              : 'Review upcoming coursework, download instructions, and submit your completed PDF work.'}
          </p>
        </div>

        {isProfessor && (
          <button
            onClick={() => {
              setEditingAssignment(null);
              setCreateModalOpen(true);
            }}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Global error banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submission Success Banner */}
      {submissionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold text-sm">{submissionFeedback.message}</span>
          </div>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            No assignments yet
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {isProfessor
              ? 'Get started by creating your first course assignment with custom deadlines and reference documents.'
              : 'There are currently no assignments published for this course. Check back later.'}
          </p>
          {isProfessor && (
            <button
              onClick={() => {
                setEditingAssignment(null);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors mt-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const isPastDeadline = assignment.isPastDeadline;
            const mySub = assignment.mySubmission;
            const hasSubmitted = !!mySub;

            return (
              <div
                key={assignment.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:border-[var(--primary)]/50 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Title, Metadata, Description */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {assignment.title}
                      </h3>

                      {/* Status Badges */}
                      {isProfessor && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            assignment.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]'
                          }`}
                        >
                          {assignment.status}
                        </span>
                      )}

                      {assignment.allowLateSubmission && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Late Allowed
                        </span>
                      )}

                      {/* Student submission status badge */}
                      {!isProfessor && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            hasSubmitted
                              ? mySub.isLate
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : isPastDeadline
                              ? 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30'
                              : 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30'
                          }`}
                        >
                          {hasSubmitted
                            ? mySub.isLate
                              ? 'Late Submitted'
                              : 'Submitted'
                            : isPastDeadline
                            ? 'Overdue'
                            : 'Not Submitted'}
                        </span>
                      )}
                    </div>

                    {/* Deadline & Countdown */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>Due: <strong className="text-[var(--text-main)]">{assignment.deadlineFormatted}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className={isPastDeadline ? 'text-[var(--danger)] font-semibold' : 'text-[var(--text-main)]'}>
                          {assignment.countdown}
                        </span>
                      </div>
                    </div>

                    {/* Description text */}
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line bg-[var(--bg-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
                      {assignment.description}
                    </p>

                    {/* Reference PDF attachment pill if available */}
                    {assignment.hasAttachment && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReferencePdf(assignment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] hover:opacity-90 border border-[var(--primary)]/30 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Reference: {assignment.attachmentName || 'Supporting PDF'}</span>
                        </button>
                      </div>
                    )}

                    {/* Student's Submission Result Box (If already submitted) */}
                    {!isProfessor && mySub && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{mySub.timingDescription || 'Submitted'}</span>
                          </div>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Recorded: {mySub.submittedAtFormatted}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <span className="truncate max-w-xs font-medium">
                            File: {mySub.originalFileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenMySubmissionPdf(assignment)}
                            className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View My Submission</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions & Metrics */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 flex-shrink-0 pt-2 lg:pt-0">
                    {/* Professor Actions & Metrics */}
                    {isProfessor ? (
                      <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                        {/* Metrics pill */}
                        <div className="text-right text-xs bg-[var(--bg-subtle)] px-3.5 py-2 rounded-xl border border-[var(--border-color)]">
                          <p className="font-semibold text-[var(--text-main)]">
                            {assignment.submittedCount || 0} / {assignment.totalEnrolled || 0} Submitted
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {assignment.notSubmittedCount || 0} pending
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSubmissionsAssignmentId(assignment.id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>View Submissions</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingAssignment(assignment);
                              setCreateModalOpen(true);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--border-color)] border border-[var(--border-color)] transition-colors cursor-pointer"
                            title="Edit assignment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingAssignment(assignment)}
                            className="p-1.5 text-[var(--danger)] hover:opacity-80 rounded-lg hover:bg-[var(--danger)]/10 border border-[var(--danger)]/30 transition-colors cursor-pointer"
                            title="Delete assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Student Actions */
                      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        {!hasSubmitted ? (
                          isPastDeadline && !assignment.allowLateSubmission ? (
                            <div className="text-right">
                              <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30">
                                Submission Closed
                              </span>
                              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                Late submission not permitted
                              </p>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSubmittingAssignment(assignment)}
                              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>Submit PDF Assignment</span>
                            </button>
                          )
                        ) : (
                          // If submitted, check if resubmission is allowed
                          (!isPastDeadline || assignment.allowLateSubmission) && (
                            <button
                              onClick={() => setSubmittingAssignment(assignment)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:text-[var(--primary)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] rounded-lg transition-colors border border-[var(--border-color)] cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Resubmit Work</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Professor Create / Edit Modal */}
      <CreateAssignmentModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingAssignment(null);
        }}
        courseId={courseId}
        courseCode={courseCode}
        initialAssignment={editingAssignment}
        onSuccess={(saved, msg) => {
          fetchAssignments();
        }}
      />

      {/* Student Submit Modal */}
      {submittingAssignment && (
        <SubmitAssignmentModal
          isOpen={!!submittingAssignment}
          onClose={() => setSubmittingAssignment(null)}
          assignmentId={submittingAssignment.id}
          assignmentTitle={submittingAssignment.title}
          deadlineFormatted={submittingAssignment.deadlineFormatted}
          isLate={submittingAssignment.isPastDeadline}
          allowLateSubmission={submittingAssignment.allowLateSubmission}
          isResubmission={!!submittingAssignment.mySubmission}
          onSuccess={(sub, message) => {
            setSubmissionFeedback({
              assignmentId: submittingAssignment.id,
              message,
            });
            fetchAssignments();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay-color)] backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-[var(--danger)]/15 text-[var(--danger)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Delete Assignment
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Are you sure you want to delete{' '}
                <strong className="text-[var(--text-main)]">
                  &quot;{deletingAssignment.title}&quot;
                </strong>
                ? All enrolled student submissions and attached files will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setDeletingAssignment(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--danger)] hover:opacity-90 rounded-lg transition-colors cursor-pointer"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title={pdfTitle}
        blobUrl={pdfBlobUrl}
        loading={pdfLoading}
        error={pdfError}
        downloadFileName={pdfDownloadName}
      />
    </div>
  );
}
