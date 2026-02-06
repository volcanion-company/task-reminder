import { useEffect, useState } from 'react';
import { Tag as TagIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { useTagStore } from '@app/store/tagStore';
import { toast } from '@app/store/toastStore';
import { TagDialog, LoadingSpinner, ConfirmDialog } from '@presentation/components';
import type { Tag, CreateTagDto, UpdateTagDto } from '@infrastructure/api/tagApi';

export default function Tags() {
  const { tags, isLoading, error, fetchTags, createTag, updateTag, deleteTag } = useTagStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; tag: Tag | null }>({
    show: false,
    tag: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Add delay to ensure Tauri is ready
    const timer = setTimeout(() => {
      fetchTags();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchTags]);

  const handleCreateTag = () => {
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const handleDeleteTag = async (tag: Tag) => {
    setConfirmDelete({ show: true, tag });
  };

  const confirmDeleteTag = async () => {
    if (!confirmDelete.tag) return;

    setIsDeleting(true);
    try {
      await deleteTag(confirmDelete.tag.id);
      toast.success('Tag deleted', `"${confirmDelete.tag.name}" has been removed`);
      setConfirmDelete({ show: false, tag: null });
    } catch (err) {
      toast.error('Failed to delete tag', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTag = async (dto: CreateTagDto | UpdateTagDto) => {
    try {
      if (editingTag) {
        await updateTag(editingTag.id, dto as UpdateTagDto);
        toast.success('Tag updated', `"${editingTag.name}" has been updated`);
      } else {
        const newTag = await createTag(dto as CreateTagDto);
        toast.success('Tag created', `"${newTag.name}" has been created`);
      }
      setIsDialogOpen(false);
      setEditingTag(null);
    } catch (err) {
      // Error already handled in store
      throw err;
    }
  };

  if (isLoading && tags.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <LoadingSpinner message="Loading tags..." />
      </div>
    );
  }

  if (error && tags.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => fetchTags()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            aria-label="Retry loading tags"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tags</h1>
          <p className="text-muted-foreground">Organize your tasks with custom tags</p>
        </div>
        <button
          onClick={handleCreateTag}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          aria-label="Create new tag"
        >
          <Plus className="w-5 h-5" />
          New Tag
        </button>
      </div>

      {/* Tag Grid */}
      {tags.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <TagIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No tags yet</p>
          <button
            onClick={handleCreateTag}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            aria-label="Create your first tag"
          >
            Create your first tag
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium text-lg">{tag.name}</span>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditTag(tag)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                    title="Edit tag"
                    aria-label={`Edit tag ${tag.name}`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete tag"
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created {new Date(tag.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tag Dialog */}
      <TagDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTag(null);
        }}
        onSave={handleSaveTag}
        tag={editingTag}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, tag: null })}
        onConfirm={confirmDeleteTag}
        title="Delete Tag"
        message={`Are you sure you want to delete "${confirmDelete.tag?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
