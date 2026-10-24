export type SectionTiming = {
  time_limit_minutes: number;
};

// Seconds left in a section. The limit comes from the section's config row,
// never from a constant. Returns 0 once the time is up, and never a negative
// number. A timer that starts in the future is not started yet, so it returns
// the full limit.
export function remainingSeconds(section: SectionTiming, startedAt: Date, now: Date): number {
  const limitSeconds = section.time_limit_minutes * 60;
  const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  if (elapsedSeconds <= 0) {
    return limitSeconds;
  }
  return Math.max(0, limitSeconds - elapsedSeconds);
}

// True once the section's time is used up.
export function isSectionExpired(section: SectionTiming, startedAt: Date, now: Date): boolean {
  return remainingSeconds(section, startedAt, now) === 0;
}
