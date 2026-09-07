const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const clockShort = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});

/** Latency: "84 ms", "1.24 s" past the second mark. */
export function formatLatency(ms: number): string {
  if (ms <= 0) return '—';
  if (ms < 1000) return `${ms < 10 ? nf1.format(ms) : nf0.format(ms)} ms`;
  return `${nf2.format(ms / 1000)} s`;
}

/** Resource usage: "47%". */
export function formatPercent(v: number, digits: 0 | 1 = 0): string {
  return `${(digits === 0 ? nf0 : nf1).format(v)}%`;
}

/**
 * Availability keeps its significant decimals — that is the whole point of the
 * figure. 99.998% and 99.9% do not tell the same story.
 */
export function formatUptime(v: number): string {
  const digits = v >= 99.99 ? 3 : 2;
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)}%`;
}

/** Error rate: "0.04%", "< 0.01%" when negligible. */
export function formatErrorRate(v: number): string {
  if (v <= 0) return '0%';
  if (v < 0.01) return '< 0.01%';
  return `${nf2.format(v)}%`;
}

/** Compact throughput: 18,420 → "18.4k", 214,000 → "214k". */
export function formatRate(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return nf0.format(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 100 ? nf1.format(k) : nf0.format(k)}k`;
  }
  return `${nf1.format(n / 1_000_000)}M`;
}

/** Plain integer with thousands separators. */
export function formatNumber(n: number): string {
  return nf0.format(n);
}

/** Clock for the last refresh, 24-hour. */
export function formatClock(t: number): string {
  return clock.format(t);
}

/** Short time, for axes and timelines. */
export function formatHour(t: number): string {
  return clockShort.format(t);
}

/** Elapsed time: "just now", "38m ago", "3h 11m ago". */
export function formatAgo(t: number, now: number): string {
  const d = Math.max(0, now - t);
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MIN)}m ago`;
  if (d < DAY) {
    const h = Math.floor(d / HOUR);
    const m = Math.floor((d % HOUR) / MIN);
    return `${h}h${m > 0 ? ` ${String(m).padStart(2, '0')}m` : ''} ago`;
  }
  return `${Math.floor(d / DAY)}d ago`;
}

/** Raw incident duration: "38m", "3h 11m". */
export function formatDuration(ms: number): string {
  const d = Math.max(0, ms);
  if (d < MIN) return '< 1m';
  if (d < HOUR) return `${Math.floor(d / MIN)}m`;
  const h = Math.floor(d / HOUR);
  const m = Math.floor((d % HOUR) / MIN);
  return `${h}h${m > 0 ? ` ${String(m).padStart(2, '0')}m` : ''}`;
}
