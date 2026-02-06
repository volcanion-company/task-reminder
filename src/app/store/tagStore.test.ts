import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTagStore } from './tagStore';
import { tagApi } from '@infrastructure/api/tagApi';
import type { Tag, CreateTagDto, UpdateTagDto } from '@infrastructure/api/tagApi';

// Mock the tagApi methods
vi.mock('@infrastructure/api/tagApi', () => ({
  tagApi: {
    listTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

const mockTag: Tag = {
  id: '1',
  name: 'Work',
  color: '#3b82f6',
  created_at: '2026-02-01T00:00:00Z',
};

describe('tagStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useTagStore());
    act(() => {
      result.current.tags = [];
      result.current.isLoading = false;
      result.current.error = null;
    });
    vi.clearAllMocks();
  });

  describe('fetchTags', () => {
    it('should fetch tags successfully', async () => {
      const tags = [mockTag];
      vi.mocked(tagApi.listTags).mockResolvedValue(tags);

      const { result } = renderHook(() => useTagStore());

      await act(async () => {
        await result.current.fetchTags();
      });

      expect(result.current.tags).toEqual(tags);
      expect(result.current.isLoading).toBe(false);
      expect(tagApi.listTags).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch';
      vi.mocked(tagApi.listTags).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTagStore());

      await act(async () => {
        await result.current.fetchTags();
      });

      expect(result.current.tags).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch');
    });
  });

  describe('createTag', () => {
    it('should create tag with optimistic update', async () => {
      const createDto: CreateTagDto = {
        name: 'Personal',
        color: '#10b981',
      };

      const createdTag: Tag = {
        id: '2',
        name: createDto.name,
        color: createDto.color,
        created_at: '2026-02-05T00:00:00Z',
      };

      vi.mocked(tagApi.createTag).mockResolvedValue(createdTag);

      const { result } = renderHook(() => useTagStore());

      let returnedTag: Tag | null = null;
      await act(async () => {
        returnedTag = await result.current.createTag(createDto);
      });

      expect(returnedTag).toEqual(createdTag);
      expect(result.current.tags).toContainEqual(createdTag);
      expect(tagApi.createTag).toHaveBeenCalledWith(createDto);
    });

    it('should sort tags alphabetically after creation', async () => {
      const tag1: Tag = { id: '1', name: 'Work', color: '#blue', created_at: '2026-01-01T00:00:00Z' };
      const tag2: Tag = { id: '2', name: 'Personal', color: '#green', created_at: '2026-01-02T00:00:00Z' };
      const tag3: Tag = { id: '3', name: 'Urgent', color: '#red', created_at: '2026-01-03T00:00:00Z' };

      vi.mocked(tagApi.createTag).mockResolvedValue(tag3);

      const { result } = renderHook(() => useTagStore());

      // Set existing tags
      act(() => {
        result.current.tags = [tag1, tag2];
      });

      await act(async () => {
        await result.current.createTag({ name: tag3.name, color: tag3.color });
      });

      // Should be sorted: Personal, Urgent, Work
      expect(result.current.tags[0].name).toBe('Personal');
      expect(result.current.tags[1].name).toBe('Urgent');
      expect(result.current.tags[2].name).toBe('Work');
    });

    it('should handle create error', async () => {
      const createDto: CreateTagDto = {
        name: 'Test',
        color: '#000000',
      };

      vi.mocked(tagApi.createTag).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useTagStore());

      await act(async () => {
        try {
          await result.current.createTag(createDto);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('updateTag', () => {
    it('should update tag with optimistic update', async () => {
      const updatedTag: Tag = {
        ...mockTag,
        name: 'Updated Work',
        color: '#ef4444',
      };

      vi.mocked(tagApi.updateTag).mockResolvedValue(updatedTag);

      const { result } = renderHook(() => useTagStore());

      // Set initial tags
      act(() => {
        result.current.tags = [mockTag];
      });

      const updateDto: UpdateTagDto = {
        name: 'Updated Work',
        color: '#ef4444',
      };

      await act(async () => {
        await result.current.updateTag('1', updateDto);
      });

      expect(result.current.tags[0].name).toBe('Updated Work');
      expect(result.current.tags[0].color).toBe('#ef4444');
      expect(tagApi.updateTag).toHaveBeenCalledWith('1', updateDto);
    });

    it('should rollback on update error', async () => {
      vi.mocked(tagApi.updateTag).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useTagStore());

      // Set initial tag
      act(() => {
        result.current.tags = [mockTag];
      });

      await expect(async () => {
        await act(async () => {
          await result.current.updateTag('1', { name: 'Failed Update' });
        });
      }).rejects.toThrow('Update failed');

      // Should rollback to original name
      await waitFor(() => {
        expect(result.current.tags[0].name).toBe(mockTag.name);
      });
    });

    it('should throw error if tag not found', async () => {
      const { result } = renderHook(() => useTagStore());

      await expect(async () => {
        await act(async () => {
          await result.current.updateTag('non-existent', { name: 'Test' });
        });
      }).rejects.toThrow('Tag not found');
    });
  });

  describe('deleteTag', () => {
    it('should delete tag successfully', async () => {
      vi.mocked(tagApi.deleteTag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTagStore());

      // Set initial tags
      act(() => {
        result.current.tags = [mockTag];
      });

      await act(async () => {
        await result.current.deleteTag('1');
      });

      expect(result.current.tags).toEqual([]);
      expect(tagApi.deleteTag).toHaveBeenCalledWith('1');
    });

    it('should rollback on delete error', async () => {
      vi.mocked(tagApi.deleteTag).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useTagStore());

      // Set initial tags
      act(() => {
        result.current.tags = [mockTag];
      });

      await expect(async () => {
        await act(async () => {
          await result.current.deleteTag('1');
        });
      }).rejects.toThrow('Delete failed');

      // Should restore tag after failed delete
      await waitFor(() => {
        expect(result.current.tags).toContainEqual(mockTag);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useTagStore());

      // Set error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
