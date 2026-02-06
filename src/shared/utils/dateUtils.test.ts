import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatRelative,
  getFriendlyDate,
  isOverdue,
  localToUTC,
  utcToLocal,
} from './dateUtils';

describe('dateUtils', () => {
  const testDate = new Date('2026-02-05T14:30:00Z');
  const testDateString = '2026-02-05T14:30:00Z';

  describe('formatDate', () => {
    it('should format date in readable format', () => {
      const result = formatDate(testDateString);
      expect(result).toBeTruthy();
      expect(result).toContain('2026');
    });

    it('should handle null/undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should accept custom format string', () => {
      const result = formatDate(testDateString, 'yyyy-MM-dd');
      expect(result).toBe('2026-02-05');
    });
  });

  describe('formatDateShort', () => {
    it('should format date in short format', () => {
      const result = formatDateShort(testDateString);
      expect(result).toBeTruthy();
      expect(result).toContain('2026');
    });

    it('should handle null/undefined', () => {
      expect(formatDateShort(null)).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const result = formatDateTime(testDateString);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null', () => {
      expect(formatDateTime(null)).toBe('');
    });
  });

  describe('formatRelative', () => {
    it('should format relative time', () => {
      const result = formatRelative(testDateString);
      expect(result).toBeTruthy();
      expect(result.toLowerCase()).toMatch(/ago|in/);
    });

    it('should handle null', () => {
      expect(formatRelative(null)).toBe('');
    });
  });

  describe('getFriendlyDate', () => {
    it('should show "Today" for current date', () => {
      const today = new Date().toISOString();
      const result = getFriendlyDate(today);
      expect(result).toContain('Today');
    });

    it('should show "Tomorrow" for next day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = getFriendlyDate(tomorrow.toISOString());
      expect(result).toContain('Tomorrow');
    });

    it('should show formatted date for other days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const result = getFriendlyDate(futureDate.toISOString());
      expect(result).toBeTruthy();
    });

    it('should handle null', () => {
      expect(getFriendlyDate(null)).toBe('');
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      expect(isOverdue(pastDate.toISOString())).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      expect(isOverdue(futureDate.toISOString())).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isOverdue(null)).toBe(false);
      expect(isOverdue(undefined)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(isOverdue('invalid-date')).toBe(false);
    });
  });

  describe('localToUTC', () => {
    it('should convert local datetime to UTC', () => {
      const localTime = '2026-02-05T14:30';
      const result = localToUTC(localTime);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('utcToLocal', () => {
    it('should convert UTC to local datetime string', () => {
      const result = utcToLocal(testDateString);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('should handle empty string', () => {
      expect(utcToLocal('')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle Date objects', () => {
      const result = formatDate(testDate);
      expect(result).toBeTruthy();
    });

    it('should handle invalid date strings gracefully', () => {
      expect(formatDate('not-a-date')).toBe('');
      expect(isOverdue('not-a-date')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(formatDate('')).toBe('');
      expect(isOverdue('')).toBe(false);
    });
  });
});
