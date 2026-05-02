export function nowIso(): string {
  return new Date().toISOString();
}

export function hoursBetween(earlierIso: string, later = new Date()): number {
  const earlier = new Date(earlierIso).getTime();
  return (later.getTime() - earlier) / (1000 * 60 * 60);
}
