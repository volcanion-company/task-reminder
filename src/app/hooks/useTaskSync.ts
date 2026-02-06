import { useEffect } from 'react';
import { useTaskStore } from '@app/store/taskStore';

/**
 * Custom hook to handle task synchronization
 * 
 * Automatically starts background sync when component mounts
 * and stops it when unmounts. Safe to use in multiple components
 * as the store has built-in guard against duplicate intervals.
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   useTaskSync();
 *   // ... rest of component
 * }
 * ```
 */
export function useTaskSync() {
  const { fetchTasks, startBackgroundSync, stopBackgroundSync } = useTaskStore();

  useEffect(() => {
    // Initial fetch
    fetchTasks();
    
    // Start background sync (guard prevents duplicates)
    startBackgroundSync();
    
    // Cleanup on unmount
    return () => {
      stopBackgroundSync();
    };
  }, [fetchTasks, startBackgroundSync, stopBackgroundSync]);
}
