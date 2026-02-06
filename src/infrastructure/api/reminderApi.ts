import { invoke } from '@tauri-apps/api/core';
import type { Reminder, CreateReminderDto, UpdateReminderDto } from '@domain/entities/Reminder';

/**
 * Get all reminders for a task
 */
export async function getReminders(taskId: string): Promise<Reminder[]> {
  return await invoke<Reminder[]>('get_reminders', { taskId });
}

/**
 * Get ALL reminders across all tasks
 */
export async function getAllReminders(): Promise<Reminder[]> {
  return await invoke<Reminder[]>('get_reminders', { taskId: null });
}

/**
 * Get a single reminder by ID
 */
export async function getReminder(id: string): Promise<Reminder> {
  return await invoke<Reminder>('get_reminder', { id });
}

/**
 * Create a new reminder
 */
export async function createReminder(data: CreateReminderDto): Promise<Reminder> {
  return await invoke<Reminder>('create_reminder', { data });
}

/**
 * Update an existing reminder
 */
export async function updateReminder(id: string, data: UpdateReminderDto): Promise<Reminder> {
  return await invoke<Reminder>('update_reminder', { id, data });
}

/**
 * Delete a reminder
 */
export async function deleteReminder(id: string): Promise<void> {
  await invoke('delete_reminder', { id });
}

/**
 * Get due reminders (for notification service)
 */
export async function getDueReminders(): Promise<Reminder[]> {
  return await invoke<Reminder[]>('get_due_reminders');
}

/**
 * Export all reminders to JSON format
 */
export async function exportRemindersToJSON(): Promise<string> {
  try {
    const json = await invoke<string>('export_reminders_json');
    return json;
  } catch (error) {
    console.error('Failed to export reminders:', error);
    throw error;
  }
}

/**
 * Export all reminders to CSV format
 */
export async function exportRemindersToCSV(): Promise<string> {
  try {
    const csv = await invoke<string>('export_reminders_csv');
    return csv;
  } catch (error) {
    console.error('Failed to export reminders:', error);
    throw error;
  }
}

/**
 * Import reminders from JSON
 */
export async function importRemindersFromJSON(jsonData: string): Promise<number> {
  try {
    const count = await invoke<number>('import_reminders_json', { jsonData });
    return count;
  } catch (error) {
    console.error('Failed to import reminders:', error);
    throw error;
  }
}

/**
 * Import reminders from CSV
 */
export async function importRemindersFromCSV(csvData: string): Promise<number> {
  try {
    const count = await invoke<number>('import_reminders_csv', { csvData });
    return count;
  } catch (error) {
    console.error('Failed to import reminders:', error);
    throw error;
  }
}
