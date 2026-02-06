import { useState, useEffect } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { useFocusTrap } from '@app/hooks/useFocusTrap';
import type { Tag, CreateTagDto, UpdateTagDto } from '@infrastructure/api/tagApi';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreateTagDto | UpdateTagDto) => Promise<void>;
  tag?: Tag | null;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
  '#6b7280', // gray
];

export default function TagDialog({ isOpen, onClose, onSave, tag }: TagDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name);
        setColor(tag.color);
      } else {
        setName('');
        setColor(PRESET_COLORS[0]);
      }
      setError(null);
    }
  }, [isOpen, tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Tag name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (tag) {
        // Update existing tag
        const dto: UpdateTagDto = {};
        if (name !== tag.name) dto.name = name;
        if (color !== tag.color) dto.color = color;
        await onSave(dto);
      } else {
        // Create new tag
        const dto: CreateTagDto = { name, color };
        await onSave(dto);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-dialog-title"
    >
      <div ref={dialogRef} className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5" />
            <h2 id="tag-dialog-title" className="text-xl font-semibold">
              {tag ? 'Edit Tag' : 'Create Tag'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tag Name */}
          <div>
            <label htmlFor="tag-name" className="block text-sm font-medium mb-2">
              Tag Name
            </label>
            <input
              id="tag-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work, Personal, Urgent"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Color
            </label>
            <div className="grid grid-cols-9 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-md transition-transform ${
                    color === presetColor ? 'ring-2 ring-primary scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  disabled={isSubmitting}
                  aria-label={`Select color ${presetColor}`}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 border border-border rounded cursor-pointer"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="#3b82f6"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Preview
            </label>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {name || 'Tag Name'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Saving...' : tag ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
