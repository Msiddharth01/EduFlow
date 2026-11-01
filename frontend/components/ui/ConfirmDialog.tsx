'use client';
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const getButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-[var(--danger)] hover:opacity-90 text-white';
      case 'warning':
        return 'bg-[var(--warning)] hover:opacity-90 text-white';
      case 'primary':
      default:
        return 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              variant === 'danger'
                ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                : 'bg-[var(--warning)]/15 text-[var(--warning)]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {title}
            </h3>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 ${getButtonStyles()}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
