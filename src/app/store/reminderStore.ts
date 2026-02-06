/**
 * Reminder Store - Central state management for reminder operations
 * 
 * Features:
 * - Optimistic updates: UI updates immediately, rolls back on error
 * - CRUD operations for reminders
 * - Error handling with user-friendly messages
 * 
 * Architecture:
 * Follows the same pattern as taskStore where all operations update
 * local state immediately, then sync with the backend. If the backend
 * call fails, we rollback the optimistic update and show an error.
 */

import { create } from 'zustand';
import { Reminder, CreateReminderDto, UpdateReminderDto } from '@domain/entities/Reminder';
import * as reminderApi from '@infrastructure/api/reminderApi';

interface ReminderState {
  // Data
  reminders: Reminder[];
  selectedReminder: Reminder | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Basic Setters
  setReminders: (reminders: Reminder[]) => void;
  setSelectedReminder: (reminder: Reminder | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async Operations
  fetchReminders: (taskId: string) => Promise<void>;
  fetchAllReminders: () => Promise<void>;
  fetchReminder: (id: string) => Promise<void>;
  createReminder: (data: CreateReminderDto) => Promise<Reminder | null>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  
  // Utility
  fetchDueReminders: () => Promise<Reminder[]>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  // Initial State
  reminders: [],
  selectedReminder: null,
  isLoading: false,
  error: null,

  // Basic Setters
  setReminders: (reminders) => set({ reminders }),
  setSelectedReminder: (reminder) => set({ selectedReminder: reminder }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Fetch all reminders for a task
  fetchReminders: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await reminderApi.getReminders(taskId);
      set({ 
        reminders, 
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch reminders',
        isLoading: false,
      });
    }
  },

  // Fetch ALL reminders across all tasks
  fetchAllReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await reminderApi.getAllReminders();
      set({ 
        reminders, 
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch all reminders:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch reminders',
        isLoading: false,
      });
    }
  },

  // Fetch single reminder
  fetchReminder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const reminder = await reminderApi.getReminder(id);
      set({ 
        selectedReminder: reminder,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch reminder:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch reminder',
        isLoading: false,
      });
    }
  },

  /**
   * Create reminder with optimistic update pattern:
   * 1. Immediately add reminder to UI with temp ID
   * 2. Call backend API
   * 3. Replace temp reminder with real reminder from server
   * 4. If API fails, rollback the optimistic update and show error
   */
  createReminder: async (data: CreateReminderDto) => {
    // Step 1: Optimistic UI update - show reminder immediately
    const optimisticReminder: Reminder = {
      id: `temp-${Date.now()}`,
      task_id: data.task_id,
      title: data.title,
      description: data.description,
      remind_at: data.remind_at,
      repeat_interval: data.repeat_interval,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((state) => ({ 
      reminders: [optimisticReminder, ...state.reminders],
    }));

    // Step 2 & 3: Call backend and replace optimistic reminder
    try {
      const createdReminder = await reminderApi.createReminder(data);
      
      // Replace temporary reminder with real one from server
      set((state) => ({
        reminders: state.reminders.map(r => 
          r.id === optimisticReminder.id ? createdReminder : r
        ),
      }));
      
      return createdReminder;
    } catch (error) {
      console.error('Failed to create reminder:', error);
      
      // Step 4: Rollback - remove the optimistic reminder from UI
      set((state) => ({
        reminders: state.reminders.filter(r => r.id !== optimisticReminder.id),
        error: error instanceof Error ? error.message : 'Failed to create reminder',
      }));
      
      return null;
    }
  },

  // Update reminder with optimistic update
  updateReminder: async (reminder: Reminder) => {
    const { reminders } = get();
    
    // Store original reminder for rollback
    const originalReminder = reminders.find(r => r.id === reminder.id);
    
    // Optimistic UI update
    set((state) => ({
      reminders: state.reminders.map(r => r.id === reminder.id ? reminder : r),
      selectedReminder: state.selectedReminder?.id === reminder.id ? reminder : state.selectedReminder,
    }));

    try {
      const updateDto: UpdateReminderDto = {
        title: reminder.title,
        description: reminder.description,
        remind_at: reminder.remind_at,
        repeat_interval: reminder.repeat_interval,
        is_active: reminder.is_active,
      };
      
      const updatedReminder = await reminderApi.updateReminder(reminder.id, updateDto);
      
      set((state) => ({
        reminders: state.reminders.map(r => r.id === reminder.id ? updatedReminder : r),
        selectedReminder: state.selectedReminder?.id === reminder.id ? updatedReminder : state.selectedReminder,
      }));
    } catch (error) {
      console.error('Failed to update reminder:', error);
      
      // Rollback on error
      if (originalReminder) {
        set((state) => ({
          reminders: state.reminders.map(r => r.id === reminder.id ? originalReminder : r),
          selectedReminder: state.selectedReminder?.id === reminder.id ? originalReminder : state.selectedReminder,
          error: error instanceof Error ? error.message : 'Failed to update reminder',
        }));
      }
    }
  },

  // Delete reminder with optimistic update
  deleteReminder: async (id: string) => {
    const { reminders } = get();
    
    // Store deleted reminder for rollback
    const deletedReminder = reminders.find(r => r.id === id);
    
    // Optimistic UI update
    set((state) => ({
      reminders: state.reminders.filter(r => r.id !== id),
      selectedReminder: state.selectedReminder?.id === id ? null : state.selectedReminder,
    }));

    try {
      await reminderApi.deleteReminder(id);
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      
      // Rollback on error
      if (deletedReminder) {
        set((state) => ({
          reminders: [...state.reminders, deletedReminder],
          error: error instanceof Error ? error.message : 'Failed to delete reminder',
        }));
      }
    }
  },

  // Fetch due reminders (for notification checking)
  fetchDueReminders: async () => {
    try {
      return await reminderApi.getDueReminders();
    } catch (error) {
      console.error('Failed to fetch due reminders:', error);
      return [];
    }
  },
}));
