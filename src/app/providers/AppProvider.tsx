import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastContainer } from '@presentation/components/ToastContainer';
import { ErrorBoundary } from '@presentation/components/ErrorBoundary';
import { useSettingsStore } from '@app/store/settingsStore';
import { useReminderNotifications } from '@app/hooks/useReminderNotifications';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  
  // Initialize reminder notifications listener
  useReminderNotifications();

  // Load settings on app start
  useEffect(() => {
    // Add delay to ensure Tauri is ready
    const timer = setTimeout(() => {
      loadSettings().catch((error) => {
        console.error('Failed to load settings:', error);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [loadSettings]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {children}
        <ToastContainer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
