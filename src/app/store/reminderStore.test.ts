import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminderStore } from './reminderStore';
import * as reminderApi from '@infrastructure/api/reminderApi';
import type { Reminder, CreateReminderDto } from '@domain/entities/Reminder';

// Mock the reminderApi module
vi.mock('@infrastructure/api/reminderApi');

const mockReminder: Reminder = {
  id: '1',
  task_id: 'task-1',
  title: 'Test Reminder',
  description: 'Test reminder description',
  remind_at: '2026-03-01T10:00:00Z',
  repeat_interval: 'none',
  is_active: true,
  last_triggered_at: undefined,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
};

describe('reminderStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useReminderStore());
    act(() => {
      result.current.setReminders([]);
      result.current.setSelectedReminder(null);
      result.current.setError(null);
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('fetchReminders', () => {
    it('should fetch reminders for a task successfully', async () => {
      vi.mocked(reminderApi.getReminders).mockResolvedValue([mockReminder]);

      const { result } = renderHook(() => useReminderStore());

      await act(async () => {
        await result.current.fetchReminders('task-1');
      });

      expect(result.current.reminders).toEqual([mockReminder]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(reminderApi.getReminders).toHaveBeenCalledWith('task-1');
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch';
      vi.mocked(reminderApi.getReminders).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useReminderStore());

      await act(async () => {
        await result.current.fetchReminders('task-1');
      });

      expect(result.current.reminders).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('fetchAllReminders', () => {
    it('should fetch all reminders successfully', async () => {
      const mockReminders = [mockReminder, { ...mockReminder, id: '2', task_id: 'task-2' }];
      vi.mocked(reminderApi.getAllReminders).mockResolvedValue(mockReminders);

      const { result } = renderHook(() => useReminderStore());

      await act(async () => {
        await result.current.fetchAllReminders();
      });

      expect(result.current.reminders).toEqual(mockReminders);
      expect(result.current.isLoading).toBe(false);
      expect(reminderApi.getAllReminders).toHaveBeenCalled();
    });
  });

  describe('createReminder', () => {
    it('should create reminder with optimistic update', async () => {
      const createDto: CreateReminderDto = {
        task_id: 'task-1',
        title: 'New Reminder',
        description: 'New reminder description',
        remind_at: '2026-03-15T14:00:00Z',
        repeat_interval: 'none',
      };

      const createdReminder: Reminder = {
        id: '2',
        task_id: createDto.task_id,
        title: createDto.title,
        description: createDto.description,
        remind_at: createDto.remind_at,
        repeat_interval: createDto.repeat_interval,
        is_active: true,
        last_triggered_at: undefined,
        created_at: '2026-02-05T00:00:00Z',
        updated_at: '2026-02-05T00:00:00Z',
      };

      vi.mocked(reminderApi.createReminder).mockResolvedValue(createdReminder);

      const { result } = renderHook(() => useReminderStore());

      let returnedReminder: Reminder | null = null;
      await act(async () => {
        returnedReminder = await result.current.createReminder(createDto);
      });

      expect(returnedReminder).toEqual(createdReminder);
      expect(result.current.reminders).toContainEqual(createdReminder);
      expect(reminderApi.createReminder).toHaveBeenCalledWith(createDto);
    });

    it('should rollback on create error', async () => {
      const createDto: CreateReminderDto = {
        task_id: 'task-1',
        title: 'New Reminder',
        remind_at: '2026-03-15T14:00:00Z',
        repeat_interval: 'none',
      };

      vi.mocked(reminderApi.createReminder).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useReminderStore());

      await act(async () => {
        await result.current.createReminder(createDto);
      });

      // Optimistic reminder should be rolled back
      await waitFor(() => {
        expect(result.current.reminders).toEqual([]);
      });
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('updateReminder', () => {
    it('should update reminder successfully', async () => {
      const updatedReminder: Reminder = {
        ...mockReminder,
        title: 'Updated Title',
        description: 'Updated description',
      };

      vi.mocked(reminderApi.updateReminder).mockResolvedValue(updatedReminder);

      const { result } = renderHook(() => useReminderStore());

      // Set initial reminders
      act(() => {
        result.current.setReminders([mockReminder]);
      });

      await act(async () => {
        await result.current.updateReminder(updatedReminder);
      });

      expect(result.current.reminders[0].title).toBe('Updated Title');
      expect(result.current.reminders[0].description).toBe('Updated description');
      expect(reminderApi.updateReminder).toHaveBeenCalled();
    });

    it('should rollback on update error', async () => {
      vi.mocked(reminderApi.updateReminder).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useReminderStore());

      // Set initial reminder
      act(() => {
        result.current.setReminders([mockReminder]);
      });

      const updatedReminder = { ...mockReminder, title: 'Updated Title' };

      await act(async () => {
        await result.current.updateReminder(updatedReminder);
      });

      // Should rollback to original title
      await waitFor(() => {
        expect(result.current.reminders[0].title).toBe(mockReminder.title);
      });
    });
  });

  describe('deleteReminder', () => {
    it('should delete reminder successfully', async () => {
      vi.mocked(reminderApi.deleteReminder).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReminderStore());

      // Set initial reminders
      act(() => {
        result.current.setReminders([mockReminder]);
      });

      await act(async () => {
        await result.current.deleteReminder(mockReminder.id);
      });

      expect(result.current.reminders).toEqual([]);
      expect(reminderApi.deleteReminder).toHaveBeenCalledWith(mockReminder.id);
    });

    it('should rollback on delete error', async () => {
      vi.mocked(reminderApi.deleteReminder).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useReminderStore());

      // Set initial reminders
      act(() => {
        result.current.setReminders([mockReminder]);
      });

      await act(async () => {
        await result.current.deleteReminder(mockReminder.id);
      });

      // Should restore reminder after failed delete
      await waitFor(() => {
        expect(result.current.reminders).toContainEqual(mockReminder);
      });
    });
  });

  describe('fetchDueReminders', () => {
    it('should fetch due reminders successfully', async () => {
      const dueReminders = [mockReminder];
      vi.mocked(reminderApi.getDueReminders).mockResolvedValue(dueReminders);

      const { result } = renderHook(() => useReminderStore());

      let reminders: Reminder[] = [];
      await act(async () => {
        reminders = await result.current.fetchDueReminders();
      });

      expect(reminders).toEqual(dueReminders);
      expect(reminderApi.getDueReminders).toHaveBeenCalled();
    });

    it('should handle error when fetching due reminders', async () => {
      vi.mocked(reminderApi.getDueReminders).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useReminderStore());

      let reminders: Reminder[] = [];
      await act(async () => {
        reminders = await result.current.fetchDueReminders();
      });

      // Should return empty array on error instead of throwing
      expect(reminders).toEqual([]);
    });
  });

  describe('state management', () => {
    it('should set reminders', () => {
      const { result } = renderHook(() => useReminderStore());

      act(() => {
        result.current.setReminders([mockReminder]);
      });

      expect(result.current.reminders).toEqual([mockReminder]);
    });

    it('should set selected reminder', () => {
      const { result } = renderHook(() => useReminderStore());

      act(() => {
        result.current.setSelectedReminder(mockReminder);
      });

      expect(result.current.selectedReminder).toEqual(mockReminder);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useReminderStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useReminderStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });
  });
});
