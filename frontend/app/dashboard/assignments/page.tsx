'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import {
  assignmentApi,
  StudentAssignmentItem,
  StudentSubmissionInfo,
} from '@/lib/api';
import SubmitAssignmentModal from '@/components/SubmitAssignmentModal';
import PdfViewerModal from '@/components/PdfViewerModal';
import {
  ClipboardList,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2,
  BookOpen,
} from 'lucide-react';

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPCOMING' | 'OVERDUE' | 'SUBMITTED'>('ALL');

  // Submit modal state
  const [submittingAssignment, setSubmittingAssignment] = useState<StudentAssignmentItem | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // PDF Preview State
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
      const res = await assignmentApi.getMyAssignments();
      if (res.success) {
        setAssignments(res.data.assignments);
      } else {
        setError(res.error || 'Failed to fetch assignments.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenReferencePdf = async (assignment: StudentAssignmentItem) => {
    setPdfTitle(`Reference: ${assignment.title}`);
    setPdfDownloadName(assignment.attachmentName || `${assignment.title}-reference.pdf`);
    setPdfModalOpen(true);
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    const res = await assignmentApi.fetchAttachmentBlob(assignment.id);
    if (res.success) {
      setPdfBlobUrl(res.blobUrl);
    } else {
      setPdfError(res.error || 'Failed to load reference document.');
    }
    setPdfLoading(false);
  };

  const handleOpenSubmissionPdf = async (assignment: StudentAssignmentItem) => {
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
      setPdfError(res.error || 'Failed to load submitted document.');
    }
    setPdfLoading(false);
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'SUBMITTED') return a.status === 'Submitted';
    if (activeFilter === 'OVERDUE') return a.status === 'Overdue';
    if (activeFilter === 'UPCOMING') return a.status === 'Not Submitted' && !a.isPastDeadline;
    return true;
  });

  const submittedCount = assignments.filter((a) => a.status === 'Submitted').length;
  const overdueCount = assignments.filter((a) => a.status === 'Overdue').length;
  const upcomingCount = assignments.filter((a) => a.status === 'Not Submitted' && !a.isPastDeadline).length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-[#0d1425] border border-slate-200 dark:border-[#1b263e] rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                My Assignments
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Track deadlines, access reference problem sheets, and submit completed PDF coursework.
            </p>
          </div>

          <button
            onClick={fetchAssignments}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--border-color)] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global Success / Timing banner */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="font-semibold text-sm">{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments or courses..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: `All (${assignments.length})` },
                { id: 'UPCOMING', label: `Upcoming (${upcomingCount})` },
                { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
                { id: 'SUBMITTED', label: `Submitted (${submittedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assignments Grid / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-[var(--text-muted)] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm font-medium">Loading assignments from your courses...</p>
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
              There are no assignments matching your selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const isPastDeadline = assignment.isPastDeadline;
              const mySub = assignment.mySubmission;
              const hasSubmitted = !!mySub;

              return (
                <div
                  key={assignment.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:border-[var(--primary)]/50 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left Column */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/courses/${assignment.courseId}`}
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20 hover:opacity-90 transition-opacity"
                        >
                          {assignment.courseCode}
                        </Link>
                        <span className="text-xs text-[var(--text-muted)]">
                          {assignment.courseTitle} • {assignment.professorName}
                        </span>

                        {/* Status Pill */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ml-auto sm:ml-0 ${
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
                      </div>

                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {assignment.title}
                      </h3>

                      {/* Deadline & Countdown */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span>
                            Due:{' '}
                            <strong className="text-[var(--text-main)]">
                              {assignment.deadlineFormatted}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span
                            className={
                              isPastDeadline
                                ? 'text-[var(--danger)] font-semibold'
                                : 'text-[var(--text-main)]'
                            }
                          >
                            {assignment.countdown}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-color)]">
                        {assignment.description}
                      </p>

                      {/* Reference PDF button if available */}
                      {assignment.hasAttachment && (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenReferencePdf(assignment)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] hover:opacity-90 border border-[var(--primary)]/30 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download Reference PDF ({assignment.attachmentName || 'Problem Sheet'})</span>
                          </button>
                        </div>
                      )}

                      {/* Submission status feedback card */}
                      {mySub && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
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
                              onClick={() => handleOpenSubmissionPdf(assignment)}
                              className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Submitted PDF</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Submission Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 flex-shrink-0 pt-2 lg:pt-0">
                      {!hasSubmitted ? (
                        isPastDeadline && !assignment.allowLateSubmission ? (
                          <div className="text-right">
                            <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30">
                              Submission Closed
                            </span>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                              Late submissions not allowed
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSubmittingAssignment(assignment)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Submit PDF</span>
                          </button>
                        )
                      ) : (
                        (!isPastDeadline || assignment.allowLateSubmission) && (
                          <button
                            onClick={() => setSubmittingAssignment(assignment)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] hover:text-[var(--primary)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] rounded-lg transition-colors border border-[var(--border-color)] cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Resubmit</span>
                          </button>
                        )
                      )}

                      <Link
                        href={`/dashboard/courses/${assignment.courseId}?tab=assignments`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] font-medium"
                      >
                        <span>Course Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit Modal */}
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
            onSuccess={(sub, msg) => {
              setSuccessBanner(msg);
              fetchAssignments();
            }}
          />
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
    </AppLayout>
  );
}
