import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Tag as TagIcon, Plus } from 'lucide-react';
import { useFocusTrap } from '@app/hooks/useFocusTrap';
import { useTaskStore } from '@app/store/taskStore';
import { useTagStore } from '@app/store/tagStore';
import { toast } from '@app/store/toastStore';
import { TaskPriority, type Task } from '@domain/entities/Task';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import TagDialog from './TagDialog';
import { localToUTC, utcToLocal } from '@shared/utils/dateUtils';
import type { CreateTagDto, UpdateTagDto } from '@infrastructure/api/tagApi';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

export function TaskDialog({ isOpen, onClose, task }: TaskDialogProps) {
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && !isTagDialogOpen);
  const { createTask, updateTask } = useTaskStore();
  const { tags, fetchTags, createTag: createTagInStore } = useTagStore();
  const isEditMode = !!task;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: TaskPriority.Medium,
    due_date: '',
    notes: '',
    estimated_minutes: '',
    tag_ids: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load tags when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen, fetchTags]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due_date: task.due_date ? utcToLocal(task.due_date) : '',
        notes: task.notes || '',
        estimated_minutes: task.estimated_minutes?.toString() || '',
        tag_ids: task.tags?.map(t => t.id) || [],
      });
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        priority: TaskPriority.Medium,
        due_date: '',
        notes: '',
        estimated_minutes: '',
        tag_ids: [],
      });
    }
    setErrors({});
  }, [task, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (formData.estimated_minutes && isNaN(Number(formData.estimated_minutes))) {
      newErrors.estimated_minutes = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  const handleCreateTag = async (dto: CreateTagDto | UpdateTagDto) => {
    try {
      // Only create new tags (not update) from TaskDialog
      const newTag = await createTagInStore(dto as CreateTagDto);
      // Auto-select the newly created tag
      setFormData(prev => ({
        ...prev,
        tag_ids: [...prev.tag_ids, newTag.id],
      }));
      setIsTagDialogOpen(false);
      toast.success('Tag created', `"${newTag.name}" has been created and added`);
    } catch (error) {
      toast.error('Failed to create tag', error instanceof Error ? error.message : 'Please try again');
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (isEditMode && task) {
        await updateTask({
          ...task,
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          due_date: formData.due_date ? localToUTC(formData.due_date) : undefined,
          notes: formData.notes || undefined,
          estimated_minutes: formData.estimated_minutes ? Number(formData.estimated_minutes) : undefined,
          updated_at: new Date().toISOString(),
          // Note: Tag updates would need a separate endpoint for task_tags table
        });
        toast.success('Task updated', 'Your task has been updated successfully');
      } else {
        // Create new task with proper CreateTaskDto structure
        const newTaskDto = {
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          due_date: formData.due_date ? localToUTC(formData.due_date) : undefined,
          notes: formData.notes || undefined,
          estimated_minutes: formData.estimated_minutes ? Number(formData.estimated_minutes) : undefined,
          tag_ids: formData.tag_ids,
        };
        const created = await createTask(newTaskDto);
        
        if (created) {
          toast.success('Task created', 'Your task has been created successfully');
        } else {
          toast.error('Failed to create task', 'Please try again');
          setIsSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(
        isEditMode ? 'Failed to update task' : 'Failed to create task',
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-dialog-title"
    >
      <div ref={dialogRef} className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="task-dialog-title" className="text-2xl font-semibold">
            {isEditMode ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter task title"
              maxLength={200}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
              placeholder="Enter task description"
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={TaskPriority.Low}>Low</option>
                <option value={TaskPriority.Medium}>Medium</option>
                <option value={TaskPriority.High}>High</option>
                <option value={TaskPriority.Urgent}>Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Estimated Time (minutes)</label>
            <input
              type="number"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., 60"
              min="0"
            />
            {errors.estimated_minutes && (
              <p className="text-red-500 text-sm mt-1">{errors.estimated_minutes}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <button
                type="button"
                onClick={() => setIsTagDialogOpen(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Tag
              </button>
            </div>
            
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available. <button type="button" onClick={() => setIsTagDialogOpen(true)} className="text-primary hover:underline">Create one</button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      formData.tag_ids.includes(tag.id)
                        ? 'ring-2 ring-primary scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: formData.tag_ids.includes(tag.id) ? tag.color : `${tag.color}40`,
                      color: formData.tag_ids.includes(tag.id) ? 'white' : tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            
            {formData.tag_ids.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {formData.tag_ids.length} tag{formData.tag_ids.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              placeholder="Additional notes"
            />
          </div>

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
                isEditMode ? 'Save Changes' : 'Create Task'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Tag Dialog */}
      <TagDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSave={handleCreateTag}
      />
    </div>
  );
}
