'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, FileText, Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { assignmentApi, CourseAssignment } from '../lib/api';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseCode: string;
  initialAssignment?: CourseAssignment | null;
  onSuccess: (assignment: CourseAssignment, message: string) => void;
}

export default function CreateAssignmentModal({
  isOpen,
  onClose,
  courseId,
  courseCode,
  initialAssignment,
  onSuccess,
}: CreateAssignmentModalProps) {
  const isEditing = !!initialAssignment;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialAssignment) {
      setTitle(initialAssignment.title);
      setDescription(initialAssignment.description);
      setStatus(initialAssignment.status);
      setAllowLateSubmission(initialAssignment.allowLateSubmission);

      // Extract date and time in local format for date/time inputs
      try {
        const d = new Date(initialAssignment.deadline);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setDeadlineDate(`${yyyy}-${mm}-${dd}`);
        setDeadlineTime(`${hh}:${min}`);
      } catch {
        setDeadlineDate('');
        setDeadlineTime('23:59');
      }
      setFile(null);
    } else {
      setTitle('');
      setDescription('');
      // Set default deadline to 7 days from now at 23:59
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const yyyy = nextWeek.getFullYear();
      const mm = String(nextWeek.getMonth() + 1).padStart(2, '0');
      const dd = String(nextWeek.getDate()).padStart(2, '0');
      setDeadlineDate(`${yyyy}-${mm}-${dd}`);
      setDeadlineTime('23:59');
      setStatus('PUBLISHED');
      setAllowLateSubmission(false);
      setFile(null);
    }
    setError(null);
  }, [initialAssignment, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed as reference attachments.');
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        setError('Attachment exceeds the 50 MB limit.');
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an assignment title.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide instructions/description.');
      return;
    }
    if (!deadlineDate || !deadlineTime) {
      setError('Please provide both deadline date and time.');
      return;
    }

    // Combine date and time to construct full deadline timestamp
    const deadlineStr = `${deadlineDate}T${deadlineTime}:00`;
    const deadlineTimestamp = new Date(deadlineStr);
    if (isNaN(deadlineTimestamp.getTime())) {
      setError('Invalid deadline date or time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('deadline', deadlineTimestamp.toISOString());
      formData.append('status', status);
      formData.append('allowLateSubmission', String(allowLateSubmission));
      if (file) {
        formData.append('file', file);
      }

      if (isEditing) {
        const res = await assignmentApi.update(initialAssignment.id, formData);
        if (res.success) {
          onSuccess(res.data.assignment, res.data.message);
          onClose();
        } else {
          setError(res.error || 'Failed to update assignment.');
        }
      } else {
        const res = await assignmentApi.create(courseId, formData);
        if (res.success) {
          onSuccess(res.data.assignment, res.data.message);
          onClose();
        } else {
          setError(res.error || 'Failed to create assignment.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred while saving assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay-color)] backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Course: <span className="font-semibold text-[var(--primary)]">{courseCode}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Assignment Title <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures Assignment 1 – Binary Search Trees"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              required
            />
          </div>

          {/* Description & Instructions */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Description & Instructions <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed instructions, problem questions, submission guidelines, and grading criteria..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] resize-y"
              required
            />
          </div>

          {/* Deadline Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Deadline Date <span className="text-[var(--danger)]">*</span></span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Deadline Time <span className="text-[var(--danger)]">*</span></span>
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            All submission deadlines and timestamps are computed in <span className="font-semibold text-[var(--text-main)]">Asia/Kolkata (IST)</span>.
          </p>

          {/* Reference PDF Upload (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Reference Document (Optional PDF)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-xl p-4 text-center cursor-pointer bg-[var(--bg-input)] transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-6 h-6 text-[var(--primary)] mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {file
                  ? file.name
                  : initialAssignment?.hasAttachment
                  ? `Current: ${initialAssignment.attachmentName || 'Attached PDF'} (Click to replace)`
                  : 'Click to attach assignment problem sheet or reference PDF'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Max file size: 50 MB
              </p>
            </div>
            {file && (
              <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-[var(--primary-light)] rounded-lg text-xs text-[var(--primary)]">
                <span className="truncate">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Publication Status & Late Submission policy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Publishing Status
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main)]">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'PUBLISHED'}
                    onChange={() => setStatus('PUBLISHED')}
                    className="accent-[var(--primary)]"
                  />
                  <span>Publish to Students</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main)]">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'DRAFT'}
                    onChange={() => setStatus('DRAFT')}
                    className="accent-[var(--primary)]"
                  />
                  <span>Save as Draft</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Late Submissions
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main)] mt-1">
                <input
                  type="checkbox"
                  checked={allowLateSubmission}
                  onChange={(e) => setAllowLateSubmission(e.target.checked)}
                  className="rounded accent-[var(--primary)]"
                />
                <span>Allow late submissions after deadline</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : status === 'PUBLISHED' ? 'Publish Assignment' : 'Save Draft'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
