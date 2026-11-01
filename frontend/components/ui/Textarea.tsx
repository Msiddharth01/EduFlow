'use client';
import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {label}
            {required && <span className="text-[var(--danger)] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all duration-150 bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] resize-y ${
            error
              ? 'border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/30'
              : 'border-[var(--border-color)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--danger)] font-medium">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
