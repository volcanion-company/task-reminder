import { useState, useEffect, useRef } from 'react';
import { X, Bell, Calendar as CalendarIcon, Clock, Repeat } from 'lucide-react';
import { useFocusTrap } from '@app/hooks/useFocusTrap';
import { useReminderStore } from '@app/store/reminderStore';
import { useTaskStore } from '@app/store/taskStore';
import { toast } from '@app/store/toastStore';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { localToUTC, utcToLocal } from '@shared/utils/dateUtils';
import type { Reminder } from '@domain/entities/Reminder';
import { RepeatInterval } from '@domain/entities/Reminder';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
  preSelectedTaskId?: string;
}

const REPEAT_TYPE_OPTIONS = [
  { value: 'none', label: 'No Repeat' },
  { value: 'after', label: 'After' },
  { value: 'every', label: 'Every' },
];

const REPEAT_UNIT_OPTIONS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export default function ReminderDialog({ 
  isOpen, 
  onClose, 
  reminder,
  preSelectedTaskId 
}: ReminderDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { createReminder, updateReminder } = useReminderStore();
  const { tasks, fetchTasks } = useTaskStore();
  const isEditMode = !!reminder;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch tasks when dialog opens (only once per session)
  useEffect(() => {
    if (isOpen && !hasFetchedRef.current && tasks.length === 0) {
      console.log('ReminderDialog - Fetching tasks for the first time');
      hasFetchedRef.current = true;
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [formData, setFormData] = useState({
    task_id: '',
    title: '',
    description: '',
    repeat_interval: 'none',
    is_active: true,
  });

  // Separate state for date and time
  const [remindDate, setRemindDate] = useState<string>('');
  const [remindTime, setRemindTime] = useState<string>('');

  // Separate state for custom repeat interval
  const [repeatType, setRepeatType] = useState<'none' | 'after' | 'every'>('none');
  const [repeatValue, setRepeatValue] = useState<number>(1);
  const [repeatUnit, setRepeatUnit] = useState<string>('minutes');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to convert yyyy-MM-dd to dd/MM/yyyy
  const formatDateToDDMMYYYY = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper to convert dd/MM/yyyy to yyyy-MM-dd
  const formatDateToISO = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  // Helper to parse repeat_interval string
  const parseRepeatInterval = (interval: string) => {
    if (interval === 'none' || !interval) {
      return { type: 'none' as const, value: 1, unit: 'minutes' };
    }
    
    // Format: "{type}_{value}_{unit}" e.g. "every_10_minutes", "after_1_hour"
    const parts = interval.split('_');
    if (parts.length >= 3) {
      const type = parts[0] as 'after' | 'every';
      const value = parseInt(parts[1], 10);
      const unit = parts.slice(2).join('_'); // Handle multi-word units
      return { type, value: isNaN(value) ? 1 : value, unit };
    }
    
    return { type: 'none' as const, value: 1, unit: 'minutes' };
  };

  // Helper to build repeat_interval string
  const buildRepeatInterval = () => {
    if (repeatType === 'none') {
      return 'none';
    }
    return `${repeatType}_${repeatValue}_${repeatUnit}`;
  };

  useEffect(() => {
    console.log('ReminderDialog form useEffect', { hasReminder: !!reminder, isOpen, preSelectedTaskId });
    if (reminder) {
      setFormData({
        task_id: reminder.task_id || '',
        title: reminder.title || '',
        description: reminder.description || '',
        repeat_interval: reminder.repeat_interval || 'none',
        is_active: reminder.is_active,
      });
      
      // Parse remind_at into date and time
      if (reminder.remind_at) {
        const localDateTime = utcToLocal(reminder.remind_at);
        const [date, time] = localDateTime.split('T');
        // Convert yyyy-MM-dd to dd/MM/yyyy
        setRemindDate(formatDateToDDMMYYYY(date));
        // Extract HH:mm from time
        setRemindTime(time ? time.slice(0, 5) : '');
      }
      
      // Parse repeat interval
      const parsed = parseRepeatInterval(reminder.repeat_interval);
      setRepeatType(parsed.type);
      setRepeatValue(parsed.value);
      setRepeatUnit(parsed.unit);
    } else {
      // Reset form for new reminder
      setFormData({
        task_id: preSelectedTaskId || '',
        title: '',
        description: '',
        repeat_interval: 'none',
        is_active: true,
      });
      setRemindDate('');
      setRemindTime('');
      setRepeatType('none');
      setRepeatValue(1);
      setRepeatUnit('minutes');
    }
    setErrors({});
  }, [reminder, isOpen, preSelectedTaskId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Title is required if no task is linked
    if (!formData.task_id && !formData.title.trim()) {
      newErrors.title = 'Title is required for standalone reminders';
    }

    if (!remindDate) {
      newErrors.remind_date = 'Ngày là bắt buộc';
    } else {
      // Validate dd/MM/yyyy format
      const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = remindDate.match(datePattern);
      if (!match) {
        newErrors.remind_date = 'Định dạng ngày không hợp lệ (dd/MM/yyyy)';
      } else {
        const [, day, month, year] = match;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        if (monthNum < 1 || monthNum > 12) {
          newErrors.remind_date = 'Tháng phải từ 1-12';
        } else if (dayNum < 1 || dayNum > 31) {
          newErrors.remind_date = 'Ngày phải từ 1-31';
        } else if (yearNum < 2000 || yearNum > 2100) {
          newErrors.remind_date = 'Năm phải từ 2000-2100';
        }
      }
    }

    if (!remindTime) {
      newErrors.remind_time = 'Giờ là bắt buộc';
    } else {
      // Validate HH:mm format
      const timePattern = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
      const match = remindTime.match(timePattern);
      if (!match) {
        newErrors.remind_time = 'Định dạng giờ không hợp lệ (HH:mm)';
      }
    }
    
    if (remindDate && remindTime && !newErrors.remind_date && !newErrors.remind_time) {
      // Convert dd/MM/yyyy to ISO format for Date constructor
      const isoDate = formatDateToISO(remindDate);
      const reminderDateTime = new Date(`${isoDate}T${remindTime}`);
      if (reminderDateTime < new Date()) {
        newErrors.remind_date = 'Ngày giờ phải là tương lai';
      }
    }

    // Validate repeat value
    if (repeatType !== 'none') {
      if (repeatValue < 1) {
        newErrors.repeat_value = 'Value must be at least 1';
      }
      if (repeatValue > 9999) {
        newErrors.repeat_value = 'Value is too large';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const repeat_interval = buildRepeatInterval();
      // Convert dd/MM/yyyy to yyyy-MM-dd for ISO format
      const isoDate = formatDateToISO(remindDate);
      const remind_at_combined = `${isoDate}T${remindTime}`;
      
      // Get title from task if task_id is set and title is empty
      let reminderTitle = formData.title;
      if (formData.task_id && !reminderTitle.trim()) {
        const selectedTask = tasks.find(t => t.id === formData.task_id);
        reminderTitle = selectedTask?.title || 'Reminder';
      }

      if (isEditMode && reminder) {
        await updateReminder({
          ...reminder,
          task_id: formData.task_id || undefined,
          remind_at: localToUTC(remind_at_combined),
          repeat_interval: repeat_interval as RepeatInterval,
          is_active: formData.is_active,
        });
        toast.success('Reminder updated', 'Your reminder has been updated successfully');
      } else {
        await createReminder({
          task_id: formData.task_id || undefined,
          title: reminderTitle,
          description: formData.description || undefined,
          remind_at: localToUTC(remind_at_combined),
          repeat_interval: repeat_interval as RepeatInterval,
        });
        toast.success('Reminder created', 'Your reminder has been created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error submitting reminder:', error);
      toast.error(
        isEditMode ? 'Failed to update reminder' : 'Failed to create reminder',
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Get task title for display
  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown Task';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-dialog-title"
    >
      <div ref={dialogRef} className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 id="reminder-dialog-title" className="text-2xl font-semibold">
              {isEditMode ? 'Edit Reminder' : 'New Reminder'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Selection - Only show if no preselected task */}
          {!preSelectedTaskId ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Link to Task (Optional)
              </label>
              <select
                value={formData.task_id}
                onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
              >
                <option value="">No task linked</option>
                {tasks
                  .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Link this reminder to a specific task
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Linked to Task:
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {getTaskTitle(formData.task_id)}
              </p>
            </div>
          )}

          {/* Title (for standalone reminders) */}
          {!formData.task_id && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                placeholder="What should I remind you about?"
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>
          )}

          {/* Description (for standalone reminders) */}
          {!formData.task_id && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                disabled={isSubmitting}
                placeholder="Add more details (optional)"
              />
            </div>
          )}

          {/* Remind Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Ngày <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={remindDate}
                onChange={(e) => {
                  // Auto-format as user types: dd/MM/yyyy
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                  }
                  if (value.length >= 5) {
                    value = value.slice(0, 5) + '/' + value.slice(5, 9);
                  }
                  setRemindDate(value);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                placeholder="dd/MM/yyyy"
                maxLength={10}
              />
              {errors.remind_date && (
                <p className="text-red-500 text-sm mt-1">{errors.remind_date}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Ví dụ: 25/12/2024</p>
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Giờ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={remindTime}
                onChange={(e) => {
                  // Auto-format as user types: HH:mm
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length >= 2) {
                    value = value.slice(0, 2) + ':' + value.slice(2, 4);
                  }
                  setRemindTime(value);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                placeholder="HH:mm"
                maxLength={5}
              />
              {errors.remind_time && (
                <p className="text-red-500 text-sm mt-1">{errors.remind_time}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Ví dụ: 14:30 (24h)</p>
            </div>
          </div>

          {/* Repeat Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Repeat className="w-4 h-4 inline mr-1" />
              Repeat
            </label>
            
            {/* Type dropdown */}
            <select
              value={repeatType}
              onChange={(e) => {
                const newType = e.target.value as 'none' | 'after' | 'every';
                setRepeatType(newType);
                if (newType === 'none') {
                  setFormData({ ...formData, repeat_interval: 'none' });
                }
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              disabled={isSubmitting}
            >
              {REPEAT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Show value and unit inputs if not "none" */}
            {repeatType !== 'none' && (
              <div className="flex gap-2">
                {/* Value input */}
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={repeatValue}
                    onChange={(e) => setRepeatValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isSubmitting}
                    placeholder="1"
                  />
                  {errors.repeat_value && (
                    <p className="text-sm text-red-500 mt-1">{errors.repeat_value}</p>
                  )}
                </div>

                {/* Unit dropdown */}
                <div className="flex-[2]">
                  <select
                    value={repeatUnit}
                    onChange={(e) => setRepeatUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isSubmitting}
                  >
                    {REPEAT_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              {repeatType === 'none' && 'This reminder will only trigger once'}
              {repeatType === 'after' && `Will trigger once after ${repeatValue} ${repeatUnit}`}
              {repeatType === 'every' && `Will repeat every ${repeatValue} ${repeatUnit}`}
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
            <label htmlFor="is_active" className="text-sm font-medium">
              Active reminder
            </label>
          </div>

          {/* Preview */}
          {remindDate && remindTime && (remindDate.match(/^\d{2}\/\d{2}\/\d{4}$/) && remindTime.match(/^\d{2}:\d{2}$/)) && (
            <div className="p-3 bg-accent rounded-lg border border-border">
              <p className="text-sm font-medium mb-1">Preview:</p>
              <p className="text-sm text-muted-foreground">
                {formData.is_active ? '🔔 ' : '🔕 '}
                Remind {formData.task_id ? `about "${getTaskTitle(formData.task_id)}" ` : ''}
                on {remindDate} at {remindTime}
                {repeatType !== 'none' && ` (${repeatType} ${repeatValue} ${repeatUnit})`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Create Reminder'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
