/**
 * Task Store - Central state management for task operations
 * 
 * Features:
 * - Optimistic updates: UI updates immediately, rolls back on error
 * - Offline support: Queues operations when offline, syncs when back online
 * - Background sync: Auto-refreshes tasks every 30 seconds
 * - Error handling: User-friendly error messages with recovery
 * 
 * Architecture:
 * This follows the offline-first pattern where all operations update
 * local state immediately, then sync with the backend. If the backend
 * call fails, we rollback the optimistic update and show an error.
 */

import { create } from 'zustand';
import { Task, CreateTaskDto } from '@domain/entities/Task';
import * as taskApi from '@infrastructure/api/taskApi';

/**
 * Represents an operation that was performed while offline
 * These are queued and executed when connectivity is restored
 */
interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

interface TaskState {
  // Data
  tasks: Task[];
  selectedTask: Task | null;
  
  // UI State
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncTime: number | null;
  
  // Offline Queue
  pendingOperations: PendingOperation[];
  isOnline: boolean;
  
  // Background Sync
  syncIntervalId: ReturnType<typeof setInterval> | null;
  
  // Basic Setters
  setTasks: (tasks: Task[]) => void;
  setSelectedTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Operations
  fetchTasks: () => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (data: CreateTaskDto) => Promise<Task | null>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  markTaskComplete: (id: string) => Promise<void>;
  
  // Sync & Offline
  syncPendingOperations: () => Promise<void>;
  addPendingOperation: (operation: Omit<PendingOperation, 'timestamp'>) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Background Refresh
  startBackgroundSync: () => void;
  stopBackgroundSync: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial State
  tasks: [],
  selectedTask: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncTime: null,
  pendingOperations: [],
  isOnline: true,
  syncIntervalId: null,

  // Basic Setters
  setTasks: (tasks) => set({ tasks }),
  setSelectedTask: (task) => set({ selectedTask: task }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Fetch all tasks
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await taskApi.getTasks();
      set({ 
        tasks: response.tasks, 
        isLoading: false,
        lastSyncTime: Date.now(),
      });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  // Fetch single task
  fetchTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const task = await taskApi.getTask(id);
      set({ 
        selectedTask: task,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch task',
        isLoading: false,
      });
    }
  },

  /**
   * Create task with optimistic update pattern:
   * 1. Immediately add task to UI with temp ID
   * 2. Call backend API
   * 3. Replace temp task with real task from server
   * 4. If API fails, rollback the optimistic update and show error
   * 
   * If offline, queue the operation for later sync
   */
  createTask: async (data: CreateTaskDto) => {
    const { isOnline, addPendingOperation } = get();
    
    // Step 1: Optimistic UI update - show task immediately
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title: data.title,
      description: data.description,
      status: 'pending' as any,
      priority: data.priority,
      due_date: data.due_date,
      notes: data.notes,
      estimated_minutes: data.estimated_minutes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
    };

    set((state) => ({ 
      tasks: [optimisticTask, ...state.tasks],
    }));

    // If offline, queue for later and return optimistic task
    if (!isOnline) {
      addPendingOperation({ id: optimisticTask.id, type: 'create', data });
      return optimisticTask;
    }

    // Step 2 & 3: Call backend and replace optimistic task
    try {
      const createdTask = await taskApi.createTask(data);
      
      // Replace temporary task with real one from server
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === optimisticTask.id ? createdTask : t
        ),
      }));
      
      return createdTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Step 4: Rollback - remove the optimistic task from UI
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== optimisticTask.id),
        error: error instanceof Error ? error.message : 'Failed to create task',
      }));
      
      return null;
    }
  },

  // Update task with optimistic update
  updateTask: async (task: Task) => {
    const { isOnline, addPendingOperation, tasks } = get();
    
    // Store original task for rollback
    const originalTask = tasks.find(t => t.id === task.id);
    
    // Optimistic UI update
    set((state) => ({
      tasks: state.tasks.map(t => t.id === task.id ? task : t),
      selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask,
    }));

    if (!isOnline) {
      addPendingOperation({ id: task.id, type: 'update', data: task });
      return;
    }

    try {
      const updatedTask = await taskApi.updateTask(task.id, task);
      
      set((state) => ({
        tasks: state.tasks.map(t => t.id === task.id ? updatedTask : t),
        selectedTask: state.selectedTask?.id === task.id ? updatedTask : state.selectedTask,
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
      
      // Rollback on error
      if (originalTask) {
        set((state) => ({
          tasks: state.tasks.map(t => t.id === task.id ? originalTask : t),
          selectedTask: state.selectedTask?.id === task.id ? originalTask : state.selectedTask,
          error: error instanceof Error ? error.message : 'Failed to update task',
        }));
      }
    }
  },

  // Delete task with optimistic update
  deleteTask: async (id: string) => {
    const { isOnline, addPendingOperation, tasks } = get();
    
    // Store deleted task for rollback
    const deletedTask = tasks.find(t => t.id === id);
    
    // Optimistic UI update
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    }));

    if (!isOnline) {
      addPendingOperation({ id, type: 'delete', data: null });
      return;
    }

    try {
      await taskApi.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      
      // Rollback on error
      if (deletedTask) {
        set((state) => ({
          tasks: [...state.tasks, deletedTask],
          error: error instanceof Error ? error.message : 'Failed to delete task',
        }));
      }
    }
  },

  // Mark task as complete
  markTaskComplete: async (id: string) => {
    const { tasks } = get();
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: 'completed' as any,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await get().updateTask(updatedTask);
  },

  // Add operation to offline queue
  addPendingOperation: (operation) => {
    set((state) => ({
      pendingOperations: [
        ...state.pendingOperations,
        { ...operation, timestamp: Date.now() },
      ],
    }));
  },

  // Sync pending operations when back online
  syncPendingOperations: async () => {
    const { pendingOperations, isOnline } = get();
    
    if (!isOnline || pendingOperations.length === 0) return;

    set({ isSyncing: true });

    try {
      for (const operation of pendingOperations) {
        switch (operation.type) {
          case 'create':
            await taskApi.createTask(operation.data);
            break;
          case 'update':
            await taskApi.updateTask(operation.id, operation.data);
            break;
          case 'delete':
            await taskApi.deleteTask(operation.id);
            break;
        }
      }

      // Clear pending operations after successful sync
      set({ 
        pendingOperations: [],
        isSyncing: false,
      });

      // Refresh tasks from server
      await get().fetchTasks();
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
      set({ 
        isSyncing: false,
        error: 'Failed to sync offline changes',
      });
    }
  },

  // Update online status and trigger sync if back online
  setOnlineStatus: (isOnline) => {
    set({ isOnline });
    
    if (isOnline) {
      get().syncPendingOperations();
    }
  },

  // Start background sync (every 30 seconds)
  startBackgroundSync: () => {
    const { syncIntervalId } = get();
    
    // Guard: Prevent multiple intervals
    if (syncIntervalId) {
      console.warn('Background sync already running');
      return;
    }

    const intervalId = setInterval(() => {
      const { isOnline, isSyncing } = get();
      if (isOnline && !isSyncing) {
        get().fetchTasks();
      }
    }, 30000); // 30 seconds
    
    set({ syncIntervalId: intervalId });
  },

  // Stop background sync
  stopBackgroundSync: () => {
    const { syncIntervalId } = get();
    
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      set({ syncIntervalId: null });
    }
  },
}));
