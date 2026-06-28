import { Timestamp } from 'firebase/firestore';

export type AppTimestamp = Timestamp | Date | string | number | { seconds: number; nanoseconds?: number };

export function normalizeTimestamp(input: AppTimestamp): Timestamp {
  if (!input) return Timestamp.now();
  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return Timestamp.fromDate(input);
  if (typeof input === 'string') return Timestamp.fromDate(new Date(input));
  if (typeof input === 'number') return Timestamp.fromMillis(input);
  if (input.seconds) return new Timestamp(input.seconds, input.nanoseconds || 0);
  return Timestamp.now();
}
