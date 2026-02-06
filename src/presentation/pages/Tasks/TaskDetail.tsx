import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Tag as TagIcon, Trash2, Edit, CheckCircle2, Bell } from 'lucide-react';
import { useTaskStore } from '@app/store/taskStore';
import { useReminderStore } from '@app/store/reminderStore';
import { toast } from '@app/store/toastStore';
import { TaskStatus, TaskPriority } from '@domain/entities/Task';
import { format } from 'date-fns';
import { Button, Timeline, TaskDialog, ReminderDialog, ConfirmDialog, LoadingSpinner, type TimelineEvent } from '@presentation/components';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, selectedTask, setSelectedTask, deleteTask, updateTask, fetchTask, isLoading } = useTaskStore();
  const { reminders, fetchReminders } = useReminderStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    console.log('TaskDetail useEffect triggered', { id, tasksLength: tasks.length });
    if (id) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        setSelectedTask(task);
        // Fetch reminders for this task
        fetchReminders(id);
      } else {
        // Try to fetch from server
        fetchTask(id).catch(() => {
          toast.error('Task not found', 'The task you are looking for does not exist');
          navigate('/tasks');
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id, not tasks array

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;
    
    setIsDeleting(true);
    try {
      await deleteTask(selectedTask.id);
      toast.success('Task deleted', 'Your task has been deleted successfully');
      navigate('/tasks');
    } catch (error) {
      toast.error('Failed to delete task', 'Please try again');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleComplete = async () => {
    if (selectedTask) {
      try {
        await updateTask({
          ...selectedTask,
          status: TaskStatus.Completed,
          completed_at: new Date().toISOString(),
        });
        toast.success('Task completed', 'Great job!');
      } catch (error) {
        toast.error('Failed to complete task', 'Please try again');
      }
    }
  };

  // Mock timeline data - in real app, this would come from task history
  const timelineEvents: TimelineEvent[] = selectedTask ? [
    {
      id: '1',
      type: 'created',
      timestamp: selectedTask.created_at,
      description: 'Task created',
      details: `Task "${selectedTask.title}" was created`,
    },
    ...(selectedTask.updated_at !== selectedTask.created_at ? [{
      id: '2',
      type: 'updated' as const,
      timestamp: selectedTask.updated_at,
      description: 'Task updated',
      details: 'Task details were modified',
    }] : []),
    ...(selectedTask.status === TaskStatus.Completed && selectedTask.completed_at ? [{
      id: '3',
      type: 'completed' as const,
      timestamp: selectedTask.completed_at,
      description: 'Task completed',
      details: 'Task was marked as complete',
    }] : []),
  ] : [];

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <LoadingSpinner message="Loading task details..." />
      </div>
    );
  }

  if (!selectedTask) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Task not found</p>
          <Link to="/tasks" className="text-primary hover:underline mt-2 inline-block">
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to="/tasks"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks
      </Link>

      {/* Task Header */}
      <div className="bg-card rounded-lg p-6 border border-border mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold mb-2 ${
              selectedTask.status === TaskStatus.Completed ? 'line-through text-muted-foreground' : ''
            }`}>
              {selectedTask.title}
            </h1>
            
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedTask.status === TaskStatus.Completed ? 'bg-green-100 text-green-700' :
                selectedTask.status === TaskStatus.Cancelled ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {selectedTask.status}
              </span>

              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedTask.priority === TaskPriority.High || selectedTask.priority === TaskPriority.Urgent ? 'bg-red-100 text-red-700' :
                selectedTask.priority === TaskPriority.Medium ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {selectedTask.priority} Priority
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedTask.status !== TaskStatus.Completed && (
              <Button variant="secondary" onClick={handleComplete} aria-label="Mark task as complete">
                <CheckCircle2 className="w-5 h-5" />
                Mark Complete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsReminderDialogOpen(true)} aria-label="Set reminder for this task">
              <Bell className="w-5 h-5" />
              Set Reminder
            </Button>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(true)} aria-label="Edit task">
              <Edit className="w-5 h-5" />
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting} aria-label="Delete task">
              <Trash2 className="w-5 h-5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Task Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {selectedTask.due_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>Due: {format(new Date(selectedTask.due_date), 'PPP')}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Created: {format(new Date(selectedTask.created_at), 'PPP')}</span>
          </div>

          {selectedTask.tags && selectedTask.tags.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <TagIcon className="w-4 h-4" />
              <div className="flex gap-2">
                {selectedTask.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Description */}
      {selectedTask.description && (
        <div className="bg-card rounded-lg p-6 border border-border mb-6">
          <h2 className="text-xl font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{selectedTask.description}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-card rounded-lg p-6 border border-border mb-6">
        <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
        <Timeline events={timelineEvents} />
      </div>

      {/* Reminders */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-xl font-semibold mb-3">Reminders</h2>
        {reminders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reminders set</p>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 bg-accent rounded-lg border border-border">
                <Bell className={`w-5 h-5 mt-0.5 ${reminder.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.description && (
                    <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(reminder.remind_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                    {reminder.repeat_interval !== 'none' && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {reminder.repeat_interval.replace(/_/g, ' ')}
                      </span>
                    )}
                    {!reminder.is_active && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <TaskDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={selectedTask}
      />

      {/* Reminder Dialog */}
      <ReminderDialog
        isOpen={isReminderDialogOpen}
        onClose={() => {
          setIsReminderDialogOpen(false);
          // Refresh reminders after closing dialog
          if (selectedTask?.id) {
            fetchReminders(selectedTask.id);
          }
        }}
        preSelectedTaskId={selectedTask.id}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedTask.title}"? This action cannot be undone and will also remove all associated reminders.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
