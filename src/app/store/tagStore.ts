import { create } from 'zustand';
import { tagApi, type Tag, type CreateTagDto, type UpdateTagDto } from '@infrastructure/api/tagApi';

interface TagStore {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTags: () => Promise<void>;
  createTag: (dto: CreateTagDto) => Promise<Tag>;
  updateTag: (id: string, dto: UpdateTagDto) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await tagApi.listTags();
      set({ tags, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
        isLoading: false 
      });
    }
  },

  createTag: async (dto: CreateTagDto) => {
    set({ error: null });
    try {
      const newTag = await tagApi.createTag(dto);
      
      // Optimistic update
      set((state) => ({
        tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      
      return newTag;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create tag' });
      throw error;
    }
  },

  updateTag: async (id: string, dto: UpdateTagDto) => {
    const { tags } = get();
    const originalTag = tags.find(t => t.id === id);
    
    if (!originalTag) {
      throw new Error('Tag not found');
    }

    // Optimistic update
    set((state) => ({
      tags: state.tags
        .map(t => t.id === id ? { ...t, ...dto } : t)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    try {
      const updatedTag = await tagApi.updateTag(id, dto);
      
      // Update with server response
      set((state) => ({
        tags: state.tags
          .map(t => t.id === id ? updatedTag : t)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
      
      return updatedTag;
    } catch (error) {
      // Rollback on error
      set((state) => ({
        tags: state.tags.map(t => t.id === id ? originalTag : t),
        error: error instanceof Error ? error.message : 'Failed to update tag',
      }));
      throw error;
    }
  },

  deleteTag: async (id: string) => {
    const { tags } = get();
    const deletedTag = tags.find(t => t.id === id);
    
    if (!deletedTag) {
      throw new Error('Tag not found');
    }

    // Optimistic update
    set((state) => ({
      tags: state.tags.filter(t => t.id !== id),
    }));

    try {
      await tagApi.deleteTag(id);
    } catch (error) {
      // Rollback on error
      set((state) => ({
        tags: [...state.tags, deletedTag].sort((a, b) => a.name.localeCompare(b.name)),
        error: error instanceof Error ? error.message : 'Failed to delete tag',
      }));
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
