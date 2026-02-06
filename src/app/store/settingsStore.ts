import { create } from 'zustand';
import * as settingsApi from '@infrastructure/api/settingsApi';

type Theme = 'light' | 'dark';

interface SettingsState {
  theme: Theme;
  notificationsEnabled: boolean;
  notificationSound: boolean;
  defaultReminderMinutes: number;
  startMinimized: boolean;
  autoStart: boolean;
  showCompletedTasks: boolean;
  defaultTaskPriority: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationSound: (enabled: boolean) => Promise<void>;
  setDefaultReminderMinutes: (minutes: number) => void;
  setStartMinimized: (enabled: boolean) => void;
  setAutoStart: (enabled: boolean) => void;
  setShowCompletedTasks: (show: boolean) => Promise<void>;
  setDefaultTaskPriority: (priority: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  notificationsEnabled: true,
  notificationSound: true,
  defaultReminderMinutes: 15,
  startMinimized: false,
  autoStart: false,
  showCompletedTasks: false,
  defaultTaskPriority: 'medium',
  isLoading: false,
  error: null,

  // Load settings from backend
  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsApi.getSettings();
      set({
        theme: settings.theme as Theme,
        notificationSound: settings.notification_sound,
        showCompletedTasks: settings.show_completed_tasks,
        defaultTaskPriority: settings.default_task_priority,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  setTheme: async (theme) => {
    // Optimistic update
    const previousTheme = get().theme;
    set({ theme });
    
    try {
      await settingsApi.updateSettings({ theme });
    } catch (error) {
      console.error('Failed to save theme:', error);
      // Rollback on error
      set({ theme: previousTheme });
    }
  },

  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

  setNotificationSound: async (enabled) => {
    // Optimistic update
    const previousValue = get().notificationSound;
    set({ notificationSound: enabled });
    
    try {
      await settingsApi.updateSettings({ notification_sound: enabled });
    } catch (error) {
      console.error('Failed to save notification sound setting:', error);
      // Rollback on error
      set({ notificationSound: previousValue });
    }
  },

  setDefaultReminderMinutes: (minutes) => set({ defaultReminderMinutes: minutes }),

  setStartMinimized: (enabled) => set({ startMinimized: enabled }),

  setAutoStart: (enabled) => set({ autoStart: enabled }),

  setShowCompletedTasks: async (show) => {
    // Optimistic update
    const previousValue = get().showCompletedTasks;
    set({ showCompletedTasks: show });
    
    try {
      await settingsApi.updateSettings({ show_completed_tasks: show });
    } catch (error) {
      console.error('Failed to save show completed tasks setting:', error);
      // Rollback on error
      set({ showCompletedTasks: previousValue });
    }
  },

  setDefaultTaskPriority: async (priority) => {
    // Optimistic update
    const previousValue = get().defaultTaskPriority;
    set({ defaultTaskPriority: priority });
    
    try {
      await settingsApi.updateSettings({ default_task_priority: priority });
    } catch (error) {
      console.error('Failed to save default task priority:', error);
      // Rollback on error
      set({ defaultTaskPriority: previousValue });
    }
  },
}));
