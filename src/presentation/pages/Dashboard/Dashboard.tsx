import { Calendar as CalendarIcon, CheckCircle2, Clock } from 'lucide-react';
import { useTaskStore } from '@app/store/taskStore';
import { useTaskSync } from '@app/hooks/useTaskSync';
import { TaskStatus, TaskPriority } from '@domain/entities/Task';
import { LoadingSpinner } from '@presentation/components';

export default function Dashboard() {
  const { tasks, isLoading, error, fetchTasks } = useTaskStore();
  
  // Handles fetch and background sync automatically
  useTaskSync();

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => fetchTasks()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            aria-label="Retry loading dashboard"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === TaskStatus.Pending).length,
    completed: tasks.filter(t => t.status === TaskStatus.Completed).length,
    upcoming: tasks.filter(t => t.due_date && new Date(t.due_date) > new Date()).length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your tasks and reminders</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-xl font-semibold mb-4">Recent Tasks</h2>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === TaskStatus.Completed ? 'bg-green-500' :
                    task.status === TaskStatus.Pending ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.due_date && (
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  task.priority === TaskPriority.High || task.priority === TaskPriority.Urgent ? 'bg-red-100 text-red-700' :
                  task.priority === TaskPriority.Medium ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
