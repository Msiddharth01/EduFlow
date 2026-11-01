'use client';
import React, { useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  blobUrl: string | null;
  loading?: boolean;
  error?: string | null;
  downloadFileName?: string;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  title,
  blobUrl,
  loading = false,
  error = null,
  downloadFileName = 'document.pdf',
}: PdfViewerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--overlay-color)] backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] border border-[var(--primary)]/20 flex items-center justify-center flex-shrink-0 text-[var(--primary)]">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                EduFlow Secure Document Viewer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <>
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Tab</span>
                </a>
                <a
                  href={blobUrl}
                  download={downloadFileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm transition-colors cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 w-full h-full bg-[var(--bg-main)] relative overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
              <p className="text-sm font-medium">Securing and loading PDF document...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 max-w-md text-center p-6 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl">
              <AlertCircle className="w-8 h-8 text-[var(--danger)]" />
              <p className="text-sm font-semibold text-[var(--danger)]">
                Failed to load document
              </p>
              <p className="text-xs text-[var(--danger)]/80">{error}</p>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-none"
              title={title}
            />
          )}

          {!loading && !error && !blobUrl && (
            <p className="text-sm text-[var(--text-muted)]">No document to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
