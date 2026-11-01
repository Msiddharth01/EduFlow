'use client';
import React from 'react';

export function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  subtle = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  subtle?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all duration-200 ${
        subtle
          ? 'bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)]'
          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] shadow-xs'
      } ${
        hoverable
          ? 'hover:border-[var(--primary)]/50 hover:shadow-md cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-5 border-b border-[var(--border-color)] ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-base font-bold text-[var(--text-primary)] ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs text-[var(--text-muted)] mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/40 flex items-center justify-between ${className}`}
    >
      {children}
    </div>
  );
}
