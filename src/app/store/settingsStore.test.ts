import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettingsStore } from './settingsStore';
import * as settingsApi from '@infrastructure/api/settingsApi';
import type { AppSettings } from '@infrastructure/api/settingsApi';

// Mock the settingsApi module
vi.mock('@infrastructure/api/settingsApi', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

const mockSettings: AppSettings = {
  theme: 'dark',
  notification_sound: true,
  show_completed_tasks: false,
  default_task_priority: 'high',
  language: 'en',
};

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    const { result } = renderHook(() => useSettingsStore());
    act(() => {
      result.current.theme = 'dark';
      result.current.notificationSound = true;
      result.current.showCompletedTasks = false;
      result.current.defaultTaskPriority = 'medium';
      result.current.isLoading = false;
      result.current.error = null;
    });
    vi.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      vi.mocked(settingsApi.getSettings).mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.notificationSound).toBe(true);
      expect(result.current.showCompletedTasks).toBe(false);
      expect(result.current.defaultTaskPriority).toBe('high');
      expect(result.current.isLoading).toBe(false);
      expect(settingsApi.getSettings).toHaveBeenCalled();
    });

    it('should handle load error', async () => {
      vi.mocked(settingsApi.getSettings).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Load failed');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(settingsApi.getSettings).mockReturnValue(promise as any);

      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.loadSettings();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSettings);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should update theme with optimistic update', async () => {
      vi.mocked(settingsApi.updateSettings).mockResolvedValue({
        ...mockSettings,
        theme: 'dark',
      });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should rollback on error', async () => {
      vi.mocked(settingsApi.updateSettings).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSettingsStore());

      const originalTheme = result.current.theme;

      await act(async () => {
        await result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe(originalTheme);
      });
    });
  });

  describe('setNotificationSound', () => {
    it('should update notification sound setting', async () => {
      vi.mocked(settingsApi.updateSettings).mockResolvedValue({
        ...mockSettings,
        notification_sound: false,
      });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.setNotificationSound(false);
      });

      expect(result.current.notificationSound).toBe(false);
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({ notification_sound: false });
    });

    it('should rollback on error', async () => {
      vi.mocked(settingsApi.updateSettings).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSettingsStore());

      const originalValue = result.current.notificationSound;

      await act(async () => {
        await result.current.setNotificationSound(!originalValue);
      });

      await waitFor(() => {
        expect(result.current.notificationSound).toBe(originalValue);
      });
    });
  });

  describe('setShowCompletedTasks', () => {
    it('should update show completed tasks setting', async () => {
      vi.mocked(settingsApi.updateSettings).mockResolvedValue({
        ...mockSettings,
        show_completed_tasks: true,
      });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.setShowCompletedTasks(true);
      });

      expect(result.current.showCompletedTasks).toBe(true);
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({ show_completed_tasks: true });
    });

    it('should rollback on error', async () => {
      vi.mocked(settingsApi.updateSettings).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSettingsStore());

      const originalValue = result.current.showCompletedTasks;

      await act(async () => {
        await result.current.setShowCompletedTasks(!originalValue);
      });

      await waitFor(() => {
        expect(result.current.showCompletedTasks).toBe(originalValue);
      });
    });
  });

  describe('setDefaultTaskPriority', () => {
    it('should update default task priority', async () => {
      vi.mocked(settingsApi.updateSettings).mockResolvedValue({
        ...mockSettings,
        default_task_priority: 'high',
      });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.setDefaultTaskPriority('urgent');
      });

      expect(result.current.defaultTaskPriority).toBe('urgent');
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({ default_task_priority: 'urgent' });
    });

    it('should rollback on error', async () => {
      vi.mocked(settingsApi.updateSettings).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSettingsStore());

      const originalValue = result.current.defaultTaskPriority;

      await act(async () => {
        await result.current.setDefaultTaskPriority('urgent');
      });

      await waitFor(() => {
        expect(result.current.defaultTaskPriority).toBe(originalValue);
      });
    });
  });

  describe('local state setters', () => {
    it('should update notificationsEnabled', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setNotificationsEnabled(false);
      });

      expect(result.current.notificationsEnabled).toBe(false);
    });

    it('should update defaultReminderMinutes', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setDefaultReminderMinutes(30);
      });

      expect(result.current.defaultReminderMinutes).toBe(30);
    });

    it('should update startMinimized', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setStartMinimized(true);
      });

      expect(result.current.startMinimized).toBe(true);
    });

    it('should update autoStart', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAutoStart(true);
      });

      expect(result.current.autoStart).toBe(true);
    });
  });
});
