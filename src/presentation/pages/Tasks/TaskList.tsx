import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Calendar as CalendarIcon, Tag as TagIcon, Plus, RefreshCw } from 'lucide-react';
import { useTaskStore } from '@app/store/taskStore';
import { useTaskSync } from '@app/hooks/useTaskSync';
import { useListKeyboardNavigation } from '@app/hooks/useListKeyboardNavigation';
import { useKeyboardShortcuts } from '@shared/utils/keyboard';
import { TaskStatus, TaskPriority } from '@domain/entities/Task';
import { Pagination, TaskDialog, LoadingSpinner, PriorityBadge, KeyboardShortcutsHelp } from '@presentation/components';
import { toast } from '@app/store/toastStore';
import { formatDateShort } from '@shared/utils/dateUtils';

type FilterStatus = 'All' | TaskStatus;
type SortBy = 'due_date' | 'priority' | 'created_at';

const ITEMS_PER_PAGE = 10;

export default function TaskList() {
  const { tasks, isLoading, error, fetchTasks } = useTaskStore();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handles fetch and background sync automatically
  useTaskSync();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTasks();
      toast.success('Tasks refreshed', 'Your tasks have been updated');
    } catch (error) {
      toast.error('Failed to refresh', 'Please try again');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter tasks
  let filteredTasks = tasks;
  if (filterStatus !== 'All') {
    filteredTasks = tasks.filter(t => t.status === filterStatus);
  }

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'priority':
        const priorityOrder: Record<TaskPriority, number> = { 
          [TaskPriority.Urgent]: 0, 
          [TaskPriority.High]: 1, 
          [TaskPriority.Medium]: 2, 
          [TaskPriority.Low]: 3 
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTasks = sortedTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Keyboard navigation for task list
  const {
    containerRef,
    selectedIndex,
    handleKeyDown: handleListKeyDown,
  } = useListKeyboardNavigation({
    items: paginatedTasks,
    enabled: !isDialogOpen,
    onItemActivate: (task) => {
      navigate(`/tasks/${task.id}`);
    },
  });

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      callback: () => {
        if (!isDialogOpen) {
          setIsDialogOpen(true);
        }
      },
    },
    {
      key: 'r',
      ctrlKey: true,
      callback: () => {
        if (!isRefreshing) {
          handleRefresh();
        }
      },
    },
  ]);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Completed:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case TaskStatus.Cancelled:
        return <Clock className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage all your tasks</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Refresh task list"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            aria-label="Create new task"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {(['All', TaskStatus.Pending, TaskStatus.Completed, TaskStatus.Cancelled] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
              aria-label={`Filter tasks by ${status}`}
              aria-pressed={filterStatus === status}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 rounded-lg bg-card border border-border text-sm"
          >
            <option value="created_at">Sort by Created</option>
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading tasks..." />
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              aria-label="Retry loading tasks"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div 
              ref={containerRef}
              className="space-y-0"
              onKeyDown={handleListKeyDown}
              tabIndex={0}
              role="list"
              aria-label="Task list with keyboard navigation"
            >
              {paginatedTasks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">No tasks found. Create a new task to get started!</p>
                </div>
              ) : (
                paginatedTasks.map((task, index) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    data-index={index}
                    className={`block p-4 border-b border-border last:border-b-0 hover:bg-accent transition-colors ${
                      selectedIndex === index ? 'bg-accent ring-2 ring-primary' : ''
                    }`}
                    role="listitem"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="mt-1">
                        {getStatusIcon(task.status)}
                      </div>

                      {/* Task Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-medium mb-1 ${
                          task.status === TaskStatus.Completed ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h3>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDateShort(task.due_date)}</span>
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <TagIcon className="w-4 h-4" />
                              <span>{task.tags.length} tags</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && !error && paginatedTasks.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={sortedTasks.length}
              />
            )}
          </>
        )}
      </div>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        task={null}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp />
    </div>
  );
}
