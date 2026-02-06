import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTaskStore } from '@app/store/taskStore';
import { useDebounce } from '@app/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { setTasks } = useTaskStore();
  const navigate = useNavigate();
  
  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim() === '') {
        // If search is cleared, fetch all tasks
        setIsSearching(false);
        const { fetchTasks } = useTaskStore.getState();
        await fetchTasks();
        return;
      }

      setIsSearching(true);
      
      try {
        // Use the search_tasks command via the task API
        const { invoke } = await import('@tauri-apps/api/core');
        const results = await invoke('search_tasks', { query: debouncedSearchQuery.trim() });
        setTasks(results as any[]);
        
        // Navigate to tasks page if not already there
        if (window.location.pathname !== '/') {
          navigate('/');
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, navigate, setTasks]);

  const clearSearch = async () => {
    setSearchQuery('');
    setIsSearching(false);
    const { fetchTasks } = useTaskStore.getState();
    await fetchTasks();
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      {/* Search bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks... (Ctrl+K)"
            className="w-full pl-10 pr-10 py-2 bg-secondary border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search tasks"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 ml-6">
        {/* User profile placeholder */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
          U
        </div>
      </div>
    </header>
  );
}
