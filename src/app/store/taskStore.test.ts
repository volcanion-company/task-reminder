import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskStore } from './taskStore';
import * as taskApi from '@infrastructure/api/taskApi';
import type { Task, CreateTaskDto } from '@domain/entities/Task';
import { TaskStatus, TaskPriority } from '@domain/entities/Task';

// Mock the taskApi module
vi.mock('@infrastructure/api/taskApi');

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: TaskStatus.Pending,
  priority: TaskPriority.Medium,
  due_date: '2026-03-01T00:00:00Z',
  notes: undefined,
  estimated_minutes: 60,
  actual_minutes: undefined,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  tags: [],
};

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.setTasks([]);
      result.current.setSelectedTask(null);
      result.current.setError(null);
      result.current.stopBackgroundSync();
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('should fetch tasks successfully', async () => {
      const mockResponse = {
        tasks: [mockTask],
        total: 1,
        page: 1,
        page_size: 50,
      };

      vi.mocked(taskApi.getTasks).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.fetchTasks();
      });

      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastSyncTime).toBeTruthy();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch';
      vi.mocked(taskApi.getTasks).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.fetchTasks();
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('createTask', () => {
    it('should create task with optimistic update', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Description',
        priority: TaskPriority.High,
        due_date: '2026-03-15T00:00:00Z',
        notes: undefined,
        estimated_minutes: 120,
        tag_ids: [],
      };

      const createdTask: Task = {
        ...mockTask,
        id: '2',
        title: createDto.title,
        description: createDto.description,
        priority: createDto.priority,
      };

      vi.mocked(taskApi.createTask).mockResolvedValue(createdTask);

      const { result } = renderHook(() => useTaskStore());

      let returnedTask: Task | null = null;
      await act(async () => {
        returnedTask = await result.current.createTask(createDto);
      });

      // Should have optimistic task first, then real task
      expect(result.current.tasks.length).toBeGreaterThan(0);
      expect(returnedTask).toEqual(createdTask);
      expect(taskApi.createTask).toHaveBeenCalledWith(createDto);
    });

    it('should rollback on create error', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Description',
        priority: TaskPriority.High,
        due_date: '2026-03-15T00:00:00Z',
        notes: undefined,
        estimated_minutes: 120,
        tag_ids: [],
      };

      vi.mocked(taskApi.createTask).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.createTask(createDto);
      });

      // Optimistic task should be rolled back
      await waitFor(() => {
        expect(result.current.tasks).toEqual([]);
      });
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updatedTask: Task = {
        ...mockTask,
        title: 'Updated Title',
      };

      vi.mocked(taskApi.updateTask).mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useTaskStore());

      // Set initial tasks
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.updateTask(updatedTask);
      });

      expect(result.current.tasks[0].title).toBe('Updated Title');
      expect(taskApi.updateTask).toHaveBeenCalledWith(updatedTask.id, expect.any(Object));
    });

    it('should rollback on update error', async () => {
      vi.mocked(taskApi.updateTask).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useTaskStore());

      // Set initial task
      act(() => {
        result.current.setTasks([mockTask]);
      });

      const updatedTask = { ...mockTask, title: 'Updated Title' };

      await act(async () => {
        await result.current.updateTask(updatedTask);
      });

      // Should rollback to original title
      await waitFor(() => {
        expect(result.current.tasks[0].title).toBe(mockTask.title);
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      vi.mocked(taskApi.deleteTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskStore());

      // Set initial tasks
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.deleteTask(mockTask.id);
      });

      expect(result.current.tasks).toEqual([]);
      expect(taskApi.deleteTask).toHaveBeenCalledWith(mockTask.id);
    });

    it('should rollback on delete error', async () => {
      vi.mocked(taskApi.deleteTask).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useTaskStore());

      // Set initial tasks
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.deleteTask(mockTask.id);
      });

      // Should restore task after failed delete
      await waitFor(() => {
        expect(result.current.tasks).toContainEqual(mockTask);
      });
    });
  });

  describe('background sync', () => {
    it('should start and stop background sync', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.startBackgroundSync();
      });

      expect(result.current.syncIntervalId).toBeTruthy();

      act(() => {
        result.current.stopBackgroundSync();
      });

      expect(result.current.syncIntervalId).toBeNull();
    });

    it('should prevent duplicate sync intervals', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.startBackgroundSync();
      });

      const firstIntervalId = result.current.syncIntervalId;

      act(() => {
        result.current.startBackgroundSync();
      });

      // Should be the same interval (not created a new one)
      expect(result.current.syncIntervalId).toBe(firstIntervalId);
    });
  });

  describe('offline support', () => {
    it('should queue operations when offline', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Set offline
      act(() => {
        result.current.setOnlineStatus(false);
      });

      const createDto: CreateTaskDto = {
        title: 'Offline Task',
        description: 'Created while offline',
        priority: TaskPriority.Medium,
        due_date: undefined,
        notes: undefined,
        estimated_minutes: undefined,
        tag_ids: [],
      };

      await act(async () => {
        await result.current.createTask(createDto);
      });

      // Should have pending operation
      expect(result.current.pendingOperations.length).toBe(1);
      expect(result.current.pendingOperations[0].type).toBe('create');
    });

    it('should sync pending operations when back online', async () => {
      vi.mocked(taskApi.createTask).mockResolvedValue(mockTask);
      vi.mocked(taskApi.getTasks).mockResolvedValue({
        tasks: [mockTask],
        total: 1,
        page: 1,
        page_size: 50,
      });

      const { result } = renderHook(() => useTaskStore());

      // Add a pending operation
      act(() => {
        result.current.setOnlineStatus(false);
        result.current.addPendingOperation({
          id: 'temp-1',
          type: 'create',
          data: { title: 'Test' },
        });
      });

      // Go back online
      await act(async () => {
        result.current.setOnlineStatus(true);
      });

      // Should sync and clear pending operations
      await waitFor(() => {
        expect(result.current.pendingOperations).toEqual([]);
      });
    });
  });
});
