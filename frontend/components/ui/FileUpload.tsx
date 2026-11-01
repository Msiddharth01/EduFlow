'use client';
import React, { useRef } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

export interface FileUploadProps {
  label?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  hint?: string;
  currentFileName?: string;
  error?: string | null;
  required?: boolean;
}

export function FileUpload({
  label,
  file,
  onFileSelect,
  accept = '.pdf,application/pdf',
  maxSizeMB = 50,
  hint = 'Max file size: 50 MB',
  currentFileName,
  error,
  required,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (maxSizeMB && selected.size > maxSizeMB * 1024 * 1024) {
        alert(`File exceeds the ${maxSizeMB} MB size limit.`);
        return;
      }
      onFileSelect(selected);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>
            {label}
            {required && <span className="text-[var(--danger)] ml-1">*</span>}
          </span>
        </label>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] bg-[var(--bg-input)] rounded-xl p-4 text-center cursor-pointer transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        <UploadCloud className="w-6 h-6 text-[var(--primary)] mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          {file
            ? file.name
            : currentFileName
            ? `Current: ${currentFileName} (Click to replace)`
            : 'Click to select file or drag and drop'}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{hint}</p>
      </div>

      {file && (
        <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-[var(--primary-light)] rounded-lg text-xs text-[var(--primary)]">
          <span className="truncate">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-[var(--danger)] font-medium">{error}</p>
      )}
    </div>
  );
}
