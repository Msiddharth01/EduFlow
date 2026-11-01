'use client';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  assignmentApi,
  AssignmentSubmissionsDashboard,
  getAvatarUrl,
} from '../lib/api';
import PdfViewerModal from './PdfViewerModal';

interface AssignmentSubmissionsViewProps {
  assignmentId: string;
  onBack: () => void;
}

export default function AssignmentSubmissionsView({
  assignmentId,
  onBack,
}: AssignmentSubmissionsViewProps) {
  const [data, setData] = useState<AssignmentSubmissionsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'LATE'>('ALL');

  // PDF Preview State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfDownloadName, setPdfDownloadName] = useState('submission.pdf');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentApi.getSubmissions(assignmentId);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load assignment submissions.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const handleOpenPdf = async (submissionId: string, studentName: string, fileName: string) => {
    setPdfTitle(`Submission: ${studentName} – ${fileName}`);
    setPdfDownloadName(fileName || 'submission.pdf');
    setPdfModalOpen(true);
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    const res = await assignmentApi.fetchSubmissionBlob(submissionId);
    if (res.success) {
      setPdfBlobUrl(res.blobUrl);
    } else {
      setPdfError(res.error || 'Could not stream submission PDF file.');
    }
    setPdfLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading submission records & student roster...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-center space-y-3 max-w-lg mx-auto my-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          Error Loading Submissions
        </p>
        <p className="text-xs text-red-600 dark:text-red-400">{error || 'Unknown error'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"
          >
            Go Back
          </button>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { assignment, metrics, submissions } = data;

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'SUBMITTED') return s.hasSubmitted;
    if (filterStatus === 'NOT_SUBMITTED') return !s.hasSubmitted;
    if (filterStatus === 'LATE') return s.hasSubmitted && s.isLate;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            title="Back to assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                {assignment.courseCode}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Due: {assignment.deadlineFormatted}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {assignment.title}
            </h2>
          </div>
        </div>

        <button
          onClick={fetchSubmissions}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Total Enrolled</span>
            <Users className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {metrics.totalStudents}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Registered students
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Submitted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.submittedCount}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {metrics.submissionRate}% submission rate
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Pending / Not Submitted</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.notSubmittedCount}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Awaiting hand-in
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium">Early vs Late</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.earlyCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">early /</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.lateCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">late</span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Calculated vs deadline
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: `All (${submissions.length})` },
              { id: 'SUBMITTED', label: `Submitted (${metrics.submittedCount})` },
              { id: 'NOT_SUBMITTED', label: `Not Submitted (${metrics.notSubmittedCount})` },
              { id: 'LATE', label: `Late (${metrics.lateCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table matching requirements */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Submission Time</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Timing</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[var(--text-muted)]">
                    No students match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((row) => (
                  <tr
                    key={row.studentId}
                    className="hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    {/* Student Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {row.profileImage ? (
                          <img
                            src={getAvatarUrl(row.profileImage)}
                            alt={row.studentName}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold flex items-center justify-center text-xs">
                            {row.studentName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-[var(--text-primary)]">
                          {row.studentName}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {row.studentEmail}
                    </td>

                    {/* Submission Time */}
                    <td className="px-5 py-3.5 text-[var(--text-main)] font-medium">
                      {row.submittedAtFormatted}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      {row.hasSubmitted ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.isLate
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {row.isLate ? 'Late Submitted' : row.status === 'RESUBMITTED' ? 'Resubmitted' : 'Submitted'}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.status === 'OVERDUE'
                              ? 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]'
                          }`}
                        >
                          {row.status === 'OVERDUE' ? 'Overdue' : 'Not Submitted'}
                        </span>
                      )}
                    </td>

                    {/* Timing (e.g. "1 day early", "2h 30m late", "Pending") */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-semibold ${
                          row.hasSubmitted
                            ? row.isLate
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                            : row.status === 'OVERDUE'
                            ? 'text-[var(--danger)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                        title={row.timingDescription}
                      >
                        {row.timingShort}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {row.hasSubmitted && row.submissionId ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleOpenPdf(
                                row.submissionId!,
                                row.studentName,
                                row.originalFileName || 'submission.pdf'
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-[var(--primary)] bg-[var(--primary-light)] hover:opacity-90 border border-[var(--primary)]/30 transition-colors cursor-pointer"
                            title="View PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View PDF</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs italic">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Viewer Modal */}
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
