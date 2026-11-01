/**
 * Assignment timing and deadline calculations in Asia/Kolkata timezone.
 */

export interface TimingResult {
  isLate: boolean;
  isOnTime: boolean;
  isEarly: boolean;
  diffMinutes: number;
  timingDescription: string;
  timingShort: string;
}

/**
 * Format duration components into grammatically correct English string.
 * Examples:
 * - "1 day" / "2 days"
 * - "3 hours" / "1 hour"
 * - "2 hours and 30 minutes"
 * - "1 day and 4 hours"
 * - "1 day, 2 hours and 15 minutes"
 */
export function formatDurationString(totalMinutes: number): { long: string; short: string } {
  const absMinutes = Math.abs(totalMinutes);
  const days = Math.floor(absMinutes / (60 * 24));
  const remainingMinutesAfterDays = absMinutes % (60 * 24);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const minutes = remainingMinutesAfterDays % 60;

  const partsLong: string[] = [];
  const partsShort: string[] = [];

  if (days > 0) {
    partsLong.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    partsShort.push(`${days}d`);
  }
  if (hours > 0) {
    partsLong.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    partsShort.push(`${hours}h`);
  }
  if (minutes > 0 || (days === 0 && hours === 0)) {
    const m = minutes === 0 && (days > 0 || hours > 0) ? 0 : Math.max(1, minutes);
    if (m > 0 || (days === 0 && hours === 0)) {
      partsLong.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
      partsShort.push(`${m}m`);
    }
  }

  let longStr = '';
  if (partsLong.length === 1) {
    longStr = partsLong[0];
  } else if (partsLong.length === 2) {
    longStr = `${partsLong[0]} and ${partsLong[1]}`;
  } else if (partsLong.length >= 3) {
    longStr = `${partsLong.slice(0, -1).join(', ')} and ${partsLong[partsLong.length - 1]}`;
  } else {
    longStr = '1 minute';
  }

  const shortStr = partsShort.join(' ');
  return { long: longStr, short: shortStr };
}

/**
 * Calculate difference between server submission timestamp and assignment deadline.
 * Handles exact on-time (within 60s), early submissions, and late submissions.
 */
export function calculateSubmissionTiming(
  submittedAt: Date | string,
  deadline: Date | string
): TimingResult {
  const submitDate = typeof submittedAt === 'string' ? new Date(submittedAt) : submittedAt;
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;

  const submitMs = submitDate.getTime();
  const deadlineMs = deadlineDate.getTime();
  const diffMs = deadlineMs - submitMs; // positive = early, negative = late
  const diffSec = Math.round(diffMs / 1000);
  const absDiffSec = Math.abs(diffSec);

  // Exact on-time threshold: within 60 seconds of deadline
  if (absDiffSec < 60) {
    return {
      isLate: false,
      isOnTime: true,
      isEarly: false,
      diffMinutes: 0,
      timingDescription: 'Submitted on time.',
      timingShort: 'On time',
    };
  }

  const isEarly = diffMs > 0;
  const isLate = diffMs < 0;
  const totalMinutes = Math.floor(absDiffSec / 60);
  const { long: durationLong, short: durationShort } = formatDurationString(totalMinutes);

  if (isEarly) {
    return {
      isLate: false,
      isOnTime: false,
      isEarly: true,
      diffMinutes: -totalMinutes,
      timingDescription: `Successfully submitted ${durationLong} early.`,
      timingShort: `${durationShort} early`,
    };
  } else {
    return {
      isLate: true,
      isOnTime: false,
      isEarly: false,
      diffMinutes: totalMinutes,
      timingDescription: `Submitted ${durationLong} late.`,
      timingShort: `${durationShort} late`,
    };
  }
}

/**
 * Format a Date to Asia/Kolkata timezone with explicit date, time, and timezone indicator.
 */
export function formatKolkataDateTime(date: Date | string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

/**
 * Calculate remaining countdown string until deadline for timeline views.
 */
export function getDeadlineCountdown(deadline: Date | string, now: Date = new Date()): {
  isOverdue: boolean;
  countdownText: string;
  diffMinutes: number;
} {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const diffMs = deadlineDate.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const { long, short } = formatDurationString(absMinutes);

  if (absMinutes < 1) {
    return {
      isOverdue,
      countdownText: isOverdue ? 'Just passed deadline' : 'Due right now',
      diffMinutes: 0,
    };
  }

  return {
    isOverdue,
    countdownText: isOverdue ? `Overdue by ${long}` : `Due in ${long}`,
    diffMinutes: isOverdue ? -absMinutes : absMinutes,
  };
}
