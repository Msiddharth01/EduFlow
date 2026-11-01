'use client';
import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, required, className = '', id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {label}
            {required && <span className="text-[var(--danger)] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all duration-150 bg-[var(--bg-input)] text-[var(--text-main)] cursor-pointer ${
            error
              ? 'border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/30'
              : 'border-[var(--border-color)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
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

Select.displayName = 'Select';
