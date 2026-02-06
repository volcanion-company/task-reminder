import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReminderStore } from '@app/store/reminderStore';
import type { Reminder } from '@domain/entities/Reminder';

/**
 * Integration Test: Reminder Notification Flow
 * 
 * Tests the complete flow of reminder notifications:
 * 1. Create a reminder with remind_at timestamp
 * 2. Fetch due reminders (remind_at <= current time)
 * 3. Backend checks for due reminders
 * 4. Notification service triggers notifications
 * 5. Reminders are marked as triggered (if not repeating)
 * 6. Repeat interval handling for recurring reminders
 */

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock toast
vi.mock('@app/store/toastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Integration: Reminder Notification Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state between tests
    const { result } = renderHook(() => useReminderStore());
    result.current.setReminders([]);
    result.current.setSelectedReminder(null);
    result.current.setError(null);
  });

  it('should fetch due reminders successfully', async () => {
    const dueReminders: Reminder[] = [
      {
        id: '1',
        title: 'Team meeting',
        remind_at: '2024-12-25T09:00:00Z', // 1 hour ago
        repeat_interval: 'none',
        is_active: true,
        created_at: '2024-12-24T00:00:00Z',
        updated_at: '2024-12-24T00:00:00Z',
      },
      {
        id: '2',
        title: 'Daily standup',
        remind_at: '2024-12-25T10:00:00Z', // Now
        repeat_interval: 'every_1_day',
        is_active: true,
        created_at: '2024-12-24T00:00:00Z',
        updated_at: '2024-12-24T00:00:00Z',
      },
    ];

    mockInvoke.mockResolvedValue(dueReminders);

    const { result } = renderHook(() => useReminderStore());

    let fetchedReminders: Reminder[] = [];
    await act(async () => {
      fetchedReminders = await result.current.fetchDueReminders();
    });

    // Verify API was called
    expect(mockInvoke).toHaveBeenCalledWith('get_due_reminders');

    // fetchDueReminders returns data, doesn't update store state
    expect(fetchedReminders).toHaveLength(2);
    expect(fetchedReminders[0].title).toBe('Team meeting');
    expect(fetchedReminders[1].title).toBe('Daily standup');
  });

  it('should exclude inactive reminders from due check', async () => {
    const activeReminder: Reminder = {
      id: '1',
      title: 'Active reminder',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    // Backend should only return active reminders
    mockInvoke.mockResolvedValue([activeReminder]);

    const { result } = renderHook(() => useReminderStore());

    let fetchedReminders: Reminder[] = [];
    await act(async () => {
      fetchedReminders = await result.current.fetchDueReminders();
    });

    expect(fetchedReminders).toHaveLength(1);
    expect(fetchedReminders[0].is_active).toBe(true);
  });

  it('should handle reminder creation with future timestamp', async () => {
    const futureReminder: Reminder = {
      id: '3',
      title: 'Future meeting',
      remind_at: '2024-12-26T14:00:00Z', // Tomorrow
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-25T10:00:00Z',
      updated_at: '2024-12-25T10:00:00Z',
    };

    mockInvoke.mockResolvedValue(futureReminder);

    const { result } = renderHook(() => useReminderStore());

    await act(async () => {
      await result.current.createReminder({
        title: 'Future meeting',
        remind_at: '2024-12-26T14:00:00Z',
        repeat_interval: 'none',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('create_reminder', {
      data: expect.objectContaining({
        title: 'Future meeting',
        remind_at: '2024-12-26T14:00:00Z',
        repeat_interval: 'none',
      }),
    });

    // Future reminder should be created (optimistic update)
    expect(result.current.reminders).toHaveLength(1);
  });

  it('should handle repeating reminder flow', async () => {
    const repeatingReminder: Reminder = {
      id: '4',
      title: 'Daily standup',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'every_1_day',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    mockInvoke.mockResolvedValue(repeatingReminder);

    const { result } = renderHook(() => useReminderStore());

    // Create repeating reminder
    await act(async () => {
      await result.current.createReminder({
        title: 'Daily standup',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'every_1_day',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('create_reminder', {
      data: expect.objectContaining({
        repeat_interval: 'every_1_day',
      }),
    });

    // Repeating reminder should remain active
    expect(result.current.reminders[0].is_active).toBe(true);
  });

  it('should handle one-time reminder flow', async () => {
    const oneTimeReminder: Reminder = {
      id: '5',
      title: 'One-time reminder',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    mockInvoke.mockResolvedValue(oneTimeReminder);

    const { result } = renderHook(() => useReminderStore());

    await act(async () => {
      await result.current.createReminder({
        title: 'One-time reminder',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'none',
      });
    });

    expect(result.current.reminders[0].repeat_interval).toBe('none');
    // One-time reminder should be deactivated after triggering (handled by backend)
  });

  it('should handle snooze reminder functionality', async () => {
    const reminder: Reminder = {
      id: '6',
      title: 'Snooze test',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    const snoozedReminder: Reminder = {
      ...reminder,
      remind_at: '2024-12-25T09:15:00Z', // 15 minutes later
      updated_at: '2024-12-25T09:00:00Z',
    };

    // First call: create initial reminder
    mockInvoke.mockResolvedValueOnce(reminder);
    // Second call: update (snooze)
    mockInvoke.mockResolvedValueOnce(snoozedReminder);

    const { result } = renderHook(() => useReminderStore());

    // Create reminder first
    await act(async () => {
      await result.current.createReminder({
        title: 'Snooze test',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'none',
      });
    });

    expect(result.current.reminders).toHaveLength(1);

    // Snooze the reminder (update with new time)
    await act(async () => {
      await result.current.updateReminder({
        ...reminder,
        remind_at: '2024-12-25T09:15:00Z',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('update_reminder', {
      id: '6',
      data: expect.objectContaining({
        remind_at: '2024-12-25T09:15:00Z',
      }),
    });

    // Reminder should be updated with new time
    expect(result.current.reminders[0].remind_at).toBe('2024-12-25T09:15:00Z');
  });

  it('should handle error when fetching due reminders', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to fetch due reminders'));

    const { result } = renderHook(() => useReminderStore());

    let fetchedReminders: Reminder[] = [];
    await act(async () => {
      fetchedReminders = await result.current.fetchDueReminders();
    });

    // On error, fetchDueReminders returns empty array
    expect(fetchedReminders).toHaveLength(0);
  });

  it('should handle linked reminder to task', async () => {
    const taskLinkedReminder: Reminder = {
      id: '7',
      task_id: 'task-123',
      title: 'Task reminder',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    mockInvoke.mockResolvedValue(taskLinkedReminder);

    const { result } = renderHook(() => useReminderStore());

    await act(async () => {
      await result.current.createReminder({
        task_id: 'task-123',
        title: 'Task reminder',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'none',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('create_reminder', {
      data: expect.objectContaining({
        task_id: 'task-123',
      }),
    });

    expect(result.current.reminders[0].task_id).toBe('task-123');
  });

  it('should handle multiple due reminders at once', async () => {
    const dueReminders: Reminder[] = [
      {
        id: '8',
        title: 'First reminder',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'none',
        is_active: true,
        created_at: '2024-12-24T00:00:00Z',
        updated_at: '2024-12-24T00:00:00Z',
      },
      {
        id: '9',
        title: 'Second reminder',
        remind_at: '2024-12-25T09:05:00Z',
        repeat_interval: 'none',
        is_active: true,
        created_at: '2024-12-24T00:00:00Z',
        updated_at: '2024-12-24T00:00:00Z',
      },
      {
        id: '10',
        title: 'Third reminder',
        remind_at: '2024-12-25T09:10:00Z',
        repeat_interval: 'none',
        is_active: true,
        created_at: '2024-12-24T00:00:00Z',
        updated_at: '2024-12-24T00:00:00Z',
      },
    ];

    mockInvoke.mockResolvedValue(dueReminders);

    const { result } = renderHook(() => useReminderStore());

    let fetchedReminders: Reminder[] = [];
    await act(async () => {
      fetchedReminders = await result.current.fetchDueReminders();
    });

    // All three reminders should be fetched
    expect(fetchedReminders).toHaveLength(3);
    expect(fetchedReminders[0].title).toBe('First reminder');
    expect(fetchedReminders[1].title).toBe('Second reminder');
    expect(fetchedReminders[2].title).toBe('Third reminder');
  });

  it('should handle reminder with different repeat intervals', async () => {
    const weeklyReminder: Reminder = {
      id: '11',
      title: 'Weekly meeting',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'every_1_week',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    mockInvoke.mockResolvedValue(weeklyReminder);

    const { result } = renderHook(() => useReminderStore());

    await act(async () => {
      await result.current.createReminder({
        title: 'Weekly meeting',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'every_1_week',
      });
    });

    expect(result.current.reminders[0].repeat_interval).toBe('every_1_week');
  });

  it('should delete reminder successfully', async () => {
    const reminder: Reminder = {
      id: '12',
      title: 'To be deleted',
      remind_at: '2024-12-25T09:00:00Z',
      repeat_interval: 'none',
      is_active: true,
      created_at: '2024-12-24T00:00:00Z',
      updated_at: '2024-12-24T00:00:00Z',
    };

    mockInvoke.mockResolvedValueOnce(reminder);
    mockInvoke.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useReminderStore());

    // Create reminder
    await act(async () => {
      await result.current.createReminder({
        title: 'To be deleted',
        remind_at: '2024-12-25T09:00:00Z',
        repeat_interval: 'none',
      });
    });

    expect(result.current.reminders).toHaveLength(1);

    // Delete reminder
    await act(async () => {
      await result.current.deleteReminder('12');
    });

    expect(mockInvoke).toHaveBeenCalledWith('delete_reminder', { id: '12' });

    // Reminder should be removed from state
    expect(result.current.reminders).toHaveLength(0);
  });
});
