'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '2xl',
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--overlay-color)] backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthMap[maxWidth]} bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  subtitle,
  onClose,
  children,
  icon,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
      {children || (
        <>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-1 overflow-y-auto p-6 space-y-5 ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] ${className}`}
    >
      {children}
    </div>
  );
}
