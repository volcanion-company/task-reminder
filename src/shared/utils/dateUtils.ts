import { format, formatDistanceToNow, isToday, isTomorrow, isPast, isValid } from 'date-fns';

/**
 * Format a date string or Date object to a human-readable format
 */
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'PPP'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatStr);
}

/**
 * Format a date with time (e.g., "January 15, 2024 at 3:30 PM")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'PPP p');
}

/**
 * Format a date as a short string (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'PP');
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get a friendly date label (Today, Tomorrow, or formatted date)
 */
export function getFriendlyDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'p')}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${format(dateObj, 'p')}`;
  }
  
  return formatDateTime(dateObj);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return false;
  
  return isPast(dateObj);
}

/**
 * Convert datetime-local input value to UTC ISO 8601 string
 */
export function localToUTC(localDateTime: string): string {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  return date.toISOString();
}

/**
 * Convert UTC ISO 8601 string to datetime-local input value
 */
export function utcToLocal(utcDateTime: string): string {
  if (!utcDateTime) return '';
  const date = new Date(utcDateTime);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}
