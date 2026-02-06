import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToastStore, toast } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store
    const { result } = renderHook(() => useToastStore());
    act(() => {
      result.current.clearToasts();
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('should add toast with generated id', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({
          type: 'success',
          title: 'Test Toast',
          message: 'Test message',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        title: 'Test Toast',
        message: 'Test message',
      });
      expect(result.current.toasts[0].id).toMatch(/^toast-/);
    });

    it('should add multiple toasts', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({ type: 'success', title: 'Toast 1' });
        result.current.addToast({ type: 'error', title: 'Toast 2' });
        result.current.addToast({ type: 'info', title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);
    });

    it('should auto-remove toast after default duration (5000ms)', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({
          type: 'info',
          title: 'Auto Remove',
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should auto-remove toast after custom duration', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({
          type: 'warning',
          title: 'Custom Duration',
          duration: 3000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle duration 0 (treated as default 5000ms due to || operator)', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({
          type: 'error',
          title: 'Duration Zero',
          duration: 0,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      // Due to implementation using `duration || 5000`, 0 is treated as 5000ms
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('removeToast', () => {
    it('should remove specific toast by id', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({ type: 'success', title: 'Toast 1' });
        result.current.addToast({ type: 'info', title: 'Toast 2' });
        result.current.addToast({ type: 'warning', title: 'Toast 3' });
      });

      const toastIdToRemove = result.current.toasts[1].id;

      act(() => {
        result.current.removeToast(toastIdToRemove);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts.find(t => t.id === toastIdToRemove)).toBeUndefined();
    });

    it('should do nothing if toast id does not exist', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({ type: 'success', title: 'Toast 1' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('clearToasts', () => {
    it('should remove all toasts', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        result.current.addToast({ type: 'success', title: 'Toast 1' });
        result.current.addToast({ type: 'error', title: 'Toast 2' });
        result.current.addToast({ type: 'info', title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.clearToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('helper functions', () => {
    it('toast.success should add success toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.success('Success!', 'Operation completed');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        title: 'Success!',
        message: 'Operation completed',
      });
    });

    it('toast.error should add error toast with 7000ms duration', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.error('Error!', 'Something went wrong');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');

      // Should not remove before 7000ms
      act(() => {
        vi.advanceTimersByTime(6999);
      });
      expect(result.current.toasts).toHaveLength(1);

      // Should remove at 7000ms
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('toast.info should add info toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.info('Info', 'For your information');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('info');
    });

    it('toast.warning should add warning toast with 6000ms duration', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.warning('Warning!', 'Be careful');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('warning');

      // Should remove at 6000ms
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('toast.fromError should parse error and add toast', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.fromError(new Error('Database error'));
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
      expect(result.current.toasts[0].title).toBeTruthy();

      // Should have 8000ms duration
      act(() => {
        vi.advanceTimersByTime(7999);
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should accept custom duration in helper functions', () => {
      const { result } = renderHook(() => useToastStore());

      act(() => {
        toast.success('Quick Toast', undefined, 1000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });
});
