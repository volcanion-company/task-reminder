import { useEffect, useState } from 'react';
import { Bell, Clock, Repeat, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useReminderStore } from '@app/store/reminderStore';
import { useTaskStore } from '@app/store/taskStore';
import { toast } from '@app/store/toastStore';
import { LoadingSpinner, ReminderDialog, ConfirmDialog } from '@presentation/components';
import type { Reminder } from '@domain/entities/Reminder';

export default function ReminderList() {
  const { reminders, isLoading, error, fetchAllReminders, deleteReminder } = useReminderStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: string; title: string }>({
    show: false,
    id: '',
    title: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Add delay to ensure Tauri is ready
    const timer = setTimeout(() => {
      fetchTasks();
      fetchAllReminders(); // Fetch all reminders
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (reminder: Reminder) => {
    setConfirmDelete({
      show: true,
      id: reminder.id,
      title: reminder.title,
    });
  };

  const confirmDeleteReminder = async () => {
    setIsDeleting(true);
    try {
      await deleteReminder(confirmDelete.id);
      toast.success('Reminder deleted', 'The reminder has been removed');
      setConfirmDelete({ show: false, id: '', title: '' });
    } catch (error) {
      toast.error('Failed to delete reminder', 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingReminder(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReminder(null);
  };

  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown Task';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading reminders: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reminders</h1>
          <p className="text-muted-foreground">Manage your task reminders</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          aria-label="Create new reminder"
        >
          <Plus className="w-5 h-5" />
          New Reminder
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reminders.length}</p>
              <p className="text-sm text-muted-foreground">Active Reminders</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Repeat className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {reminders.filter(r => r.repeat_interval).length}
              </p>
              <p className="text-sm text-muted-foreground">Recurring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Reminders</h2>
        
        {reminders.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reminders set. Add reminders to your tasks to get notified!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders
              .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
              .map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">
                        {reminder.task_id ? getTaskTitle(reminder.task_id) : reminder.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(reminder.remind_at), 'PPP p')}</span>
                        </div>
                        {reminder.description && (
                          <span className="text-xs">• {reminder.description}</span>
                        )}
                        {reminder.repeat_interval !== 'none' && (
                          <div className="flex items-center gap-1">
                            <Repeat className="w-4 h-4" />
                            <span className="capitalize">{reminder.repeat_interval}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(reminder)}
                      className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-1"
                      aria-label={`Edit reminder: ${reminder.title}`}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(reminder)}
                      className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-colors"
                      aria-label={`Delete reminder: ${reminder.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">About Reminders</h3>
            <p className="text-sm text-blue-700">
              Reminders will trigger native system notifications at the scheduled time. 
              Make sure notifications are enabled for this app in your system settings.
            </p>
          </div>
        </div>
      </div>

      {/* Reminder Dialog */}
      <ReminderDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        reminder={editingReminder}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, id: '', title: '' })}
        onConfirm={confirmDeleteReminder}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${confirmDelete.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
