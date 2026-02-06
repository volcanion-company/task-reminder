import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
  theme: string;
  language: string;
  notification_sound: boolean;
  show_completed_tasks: boolean;
  default_task_priority: string;
}

export interface UpdateSettingsDto {
  theme?: string;
  language?: string;
  notification_sound?: boolean;
  show_completed_tasks?: boolean;
  default_task_priority?: string;
}

/**
 * Get application settings
 */
export async function getSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>('get_settings');
}

/**
 * Update application settings
 */
export async function updateSettings(data: UpdateSettingsDto): Promise<AppSettings> {
  return await invoke<AppSettings>('update_settings', { dto: data });
}
