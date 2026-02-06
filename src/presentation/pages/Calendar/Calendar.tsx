import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '@app/store/taskStore';
import { useTaskSync } from '@app/hooks/useTaskSync';
import { TaskStatus, TaskPriority } from '@domain/entities/Task';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Button, LoadingSpinner } from '@presentation/components';

type ViewMode = 'month' | 'week';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const { tasks, isLoading, error, fetchTasks } = useTaskStore();
  const navigate = useNavigate();

  // Handles fetch and background sync automatically
  useTaskSync();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const daysToShow = viewMode === 'month'
    ? eachDayOfInterval({ start: monthStart, end: monthEnd })
    : eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const previousPeriod = () => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const nextPeriod = () => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const today = () => setCurrentDate(new Date());

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading calendar..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => fetchTasks()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            aria-label="Retry loading calendar"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Pad days to start from Sunday (only for month view)
  const firstDayOfWeek = viewMode === 'month' ? monthStart.getDay() : 0;
  const paddingDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Calendar</h1>
        <p className="text-muted-foreground">View your tasks by date</p>
      </div>

      {/* Calendar Controls */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
            }
          </h2>

          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden mr-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
                aria-label="Switch to month view"
                aria-pressed={viewMode === 'month'}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
                aria-label="Switch to week view"
                aria-pressed={viewMode === 'week'}
              >
                Week
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={today} aria-label="Go to today">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={previousPeriod} aria-label={`Go to previous ${viewMode}`}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={nextPeriod} aria-label={`Go to next ${viewMode}`}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Padding Days */}
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="aspect-square" />
          ))}

          {/* Calendar Days */}
          {daysToShow.map(day => {
            const dayTasks = getTasksForDay(day);
            const isCurrentDay = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                className={`${
                  viewMode === 'month' ? 'aspect-square' : 'min-h-[120px]'
                } p-2 rounded-lg border transition-colors ${
                  isCurrentDay
                    ? 'border-primary bg-primary/5'
                    : isCurrentMonth || viewMode === 'week'
                    ? 'border-border hover:bg-accent'
                    : 'border-border bg-muted/50'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-primary' : !isCurrentMonth && viewMode === 'month' ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {format(day, viewMode === 'week' ? 'EEE d' : 'd')}
                </div>

                {/* Task Items */}
                {dayTasks.length > 0 && (
                  <div className="space-y-1">
                    {dayTasks.slice(0, viewMode === 'week' ? 5 : 3).map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className={`w-full text-left text-xs truncate px-1 py-0.5 rounded transition-all hover:scale-105 ${
                          task.status === TaskStatus.Completed ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                          task.status === TaskStatus.Cancelled ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                          task.priority === TaskPriority.High || task.priority === TaskPriority.Urgent ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                          'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > (viewMode === 'week' ? 5 : 3) && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayTasks.length - (viewMode === 'week' ? 5 : 3)} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Tasks List */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Tasks This {viewMode === 'month' ? 'Month' : 'Week'}
          </h2>
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        
        {tasks.filter(task => {
          if (!task.due_date) return false;
          const taskDate = new Date(task.due_date);
          return viewMode === 'month' 
            ? isSameMonth(taskDate, currentDate)
            : taskDate >= weekStart && taskDate <= weekEnd;
        }).length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks scheduled for this {viewMode}</p>
        ) : (
          <div className="space-y-2">
            {tasks
              .filter(task => {
                if (!task.due_date) return false;
                const taskDate = new Date(task.due_date);
                return viewMode === 'month' 
                  ? isSameMonth(taskDate, currentDate)
                  : taskDate >= weekStart && taskDate <= weekEnd;
              })
              .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
              .map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === TaskStatus.Completed ? 'bg-green-500' :
                      task.status === TaskStatus.Cancelled ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(task.due_date!), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === TaskPriority.High || task.priority === TaskPriority.Urgent ? 'bg-red-100 text-red-700' :
                    task.priority === TaskPriority.Medium ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
