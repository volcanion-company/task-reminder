import { invoke } from '@tauri-apps/api/core';

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTagDto {
  name: string;
  color: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export const tagApi = {
  /**
   * List all tags
   */
  listTags: async (): Promise<Tag[]> => {
    return await invoke<Tag[]>('list_tags');
  },

  /**
   * Get a single tag by ID
   */
  getTag: async (id: string): Promise<Tag | null> => {
    return await invoke<Tag | null>('get_tag', { id });
  },

  /**
   * Create a new tag
   */
  createTag: async (dto: CreateTagDto): Promise<Tag> => {
    return await invoke<Tag>('create_tag', { dto });
  },

  /**
   * Update an existing tag
   */
  updateTag: async (id: string, dto: UpdateTagDto): Promise<Tag> => {
    return await invoke<Tag>('update_tag', { id, dto });
  },

  /**
   * Delete a tag
   */
  deleteTag: async (id: string): Promise<void> => {
    await invoke('delete_tag', { id });
  },
};
