import { Ride } from '../api/rides';

export const PAST_HIDE_MINUTES = 5;

export interface TimeLabel {
  text: string;
  isPast: boolean;
}

export interface RideSection {
  title: string;
  data: Ride[];
}

// Server returns naive local datetime "2024-06-01T08:00:00" — parse as local time.
export function parseDeparture(s: string): Date {
  return new Date(s.replace('T', ' '));
}

// Returns a stable YYYY-MM-DD key for grouping (in local time).
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sectionTitle(key: string): string {
  const now = new Date();
  if (key === dateKey(now)) return 'Today';
  // Parse the key back as local noon to avoid DST edge cases.
  const d = new Date(`${key}T12:00:00`);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) options.year = 'numeric';
  return d.toLocaleDateString(undefined, options);
}

export function formatTime(departure: Date): TimeLabel {
  const minutes = (departure.getTime() - Date.now()) / 60_000;
  if (minutes < 0) {
    const ago = Math.round(-minutes);
    return { text: `${ago} min ago`, isPast: true };
  }
  if (minutes <= 60) {
    return { text: `In ${Math.round(minutes)} min`, isPast: false };
  }
  return {
    text: departure.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    isPast: false,
  };
}

export function groupByDate(rides: Ride[]): RideSection[] {
  const map = new Map<string, Ride[]>();
  for (const ride of rides) {
    const dep = parseDeparture(ride.departure);
    const minutesPast = (Date.now() - dep.getTime()) / 60_000;
    if (minutesPast > PAST_HIDE_MINUTES) continue;
    const key = dateKey(dep);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ride);
  }
  return Array.from(map.entries()).map(([key, data]) => ({
    title: sectionTitle(key),
    data,
  }));
}
