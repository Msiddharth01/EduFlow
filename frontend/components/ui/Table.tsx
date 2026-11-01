'use client';
import React from 'react';

export function Table({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--border-color)]">
      <table className={`w-full text-left text-xs border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={`bg-[var(--bg-subtle)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px] ${className}`}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tbody
      className={`divide-y divide-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] ${className}`}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-[var(--bg-card-hover)] transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

export function TableCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3.5 ${className}`}>{children}</td>;
}
