import { invoke } from '@tauri-apps/api/core';
import type { Task, CreateTaskDto, UpdateTaskDto } from '@domain/entities/Task';
import { log } from '@shared/utils/logger';
import { handleApiCall } from './apiErrorHandler';
import { dedupedRequest, generateCacheKey, requestDeduplicator } from './requestDeduplicator';

export interface TaskFilters {
  status?: string;
  priority?: string;
  tag_id?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Get all tasks with optional filters and pagination
 * Uses request deduplication to prevent multiple simultaneous calls
 */
export async function getTasks(
  filters?: TaskFilters,
  pagination?: PaginationParams
): Promise<TaskListResponse> {
  const cacheKey = generateCacheKey('tasks', { filters, pagination });
  
  return dedupedRequest(cacheKey, () => 
    handleApiCall('fetch tasks', async () => {
      log.api.request('GET', '/tasks', { filters, pagination });
      const response = await invoke<TaskListResponse>('get_tasks', {
        filters,
        pagination,
      });
      log.api.response('/tasks', response);
      return response;
    })
  );
}

/**
 * Get a single task by ID
 * Uses request deduplication for concurrent requests
 */
export async function getTask(id: string): Promise<Task> {
  const cacheKey = generateCacheKey('task', { id });
  
  return dedupedRequest(cacheKey, () =>
    handleApiCall('get task', async () => {
      log.api.request('GET', `/tasks/${id}`);
      const task = await invoke<Task>('get_task', { id });
      log.api.response(`/tasks/${id}`, task);
      return task;
    })
  );
}

/**
 * Create a new task
 * Invalidates task list cache after creation
 */
export async function createTask(data: CreateTaskDto): Promise<Task> {
  return handleApiCall('create task', async () => {
    log.api.request('POST', '/tasks', data);
    const task = await invoke<Task>('create_task', { data });
    log.api.response('/tasks', task);
    
    // Invalidate all task list caches
    requestDeduplicator.invalidatePattern(/^tasks/);
    
    return task;
  });
}

/**
 * Update an existing task
 * Invalidates related caches after update
 */
export async function updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
  return handleApiCall('update task', async () => {
    log.api.request('PUT', `/tasks/${id}`, data);
    const task = await invoke<Task>('update_task', { id, data });
    log.api.response(`/tasks/${id}`, task);
    
    // Invalidate task and task list caches
    requestDeduplicator.invalidate(generateCacheKey('task', { id }));
    requestDeduplicator.invalidatePattern(/^tasks/);
    
    return task;
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  try {
    log.api.request('DELETE', `/tasks/${id}`);
    await invoke('delete_task', { id });
    log.api.response(`/tasks/${id}`, 'deleted');
  } catch (error) {
    log.api.error(`/tasks/${id}`, error);
    throw error;
  }
}

/**
 * Mark a task as done
 */
export async function markTaskDone(id: string): Promise<Task> {
  try {
    log.api.request('PATCH', `/tasks/${id}/done`);
    const task = await invoke<Task>('mark_task_done', { id });
    log.api.response(`/tasks/${id}/done`, task);
    return task;
  } catch (error) {
    log.api.error(`/tasks/${id}/done`, error);
    throw error;
  }
}

/**
 * Search tasks by query
 */
export async function searchTasks(query: string): Promise<Task[]> {
  try {
    log.api.request('GET', `/tasks/search`, { query });
    const tasks = await invoke<Task[]>('search_tasks', { query });
    log.api.response(`/tasks/search`, tasks);
    return tasks;
  } catch (error) {
    log.api.error(`/tasks/search`, error);
    throw error;
  }
}

/**
 * Export all tasks to JSON format
 */
export async function exportTasksToJSON(): Promise<string> {
  try {
    log.api.request('GET', '/tasks/export');
    const json = await invoke<string>('export_tasks_json');
    log.api.response('/tasks/export', 'JSON data');
    return json;
  } catch (error) {
    log.api.error('/tasks/export', error);
    throw error;
  }
}

/**
 * Export all tasks to CSV format
 */
export async function exportTasksToCSV(): Promise<string> {
  try {
    log.api.request('GET', '/tasks/export/csv');
    const csv = await invoke<string>('export_tasks_csv');
    log.api.response('/tasks/export/csv', 'CSV data');
    return csv;
  } catch (error) {
    log.api.error('/tasks/export/csv', error);
    throw error;
  }
}

/**
 * Import tasks from JSON
 */
export async function importTasksFromJSON(jsonData: string): Promise<number> {
  try {
    log.api.request('POST', '/tasks/import');
    const count = await invoke<number>('import_tasks_json', { jsonData });
    log.api.response('/tasks/import', `Imported ${count} tasks`);
    return count;
  } catch (error) {
    log.api.error('/tasks/import', error);
    throw error;
  }
}

/**
 * Import tasks from CSV
 */
export async function importTasksFromCSV(csvData: string): Promise<number> {
  try {
    log.api.request('POST', '/tasks/import/csv');
    const count = await invoke<number>('import_tasks_csv', { csvData });
    log.api.response('/tasks/import/csv', `Imported ${count} tasks`);
    return count;
  } catch (error) {
    log.api.error('/tasks/import/csv', error);
    throw error;
  }
}

/**
 * Backup all data (tasks + reminders) to JSON
 */
export async function backupData(): Promise<string> {
  try {
    log.api.request('GET', '/backup');
    const backup = await invoke<string>('backup_data');
    log.api.response('/backup', 'Backup created');
    return backup;
  } catch (error) {
    log.api.error('/backup', error);
    throw error;
  }
}

/**
 * Restore data from backup JSON
 */
export async function restoreData(backupData: string): Promise<{ tasks: number; reminders: number }> {
  try {
    log.api.request('POST', '/restore');
    const [tasks, reminders] = await invoke<[number, number]>('restore_data', { backupData });
    log.api.response('/restore', `Restored ${tasks} tasks and ${reminders} reminders`);
    return { tasks, reminders };
  } catch (error) {
    log.api.error('/restore', error);
    throw error;
  }
}
