// Repeat interval - now supports custom format
// Format: "{type}_{value}_{unit}" e.g. "every_10_minutes", "after_1_hour"
// Special case: "none" for no repeat
export type RepeatInterval = string;

// Reminder entity
export interface Reminder {
  id: string;
  task_id?: string;
  title: string;
  description?: string;
  remind_at: string; // ISO 8601 datetime
  repeat_interval: RepeatInterval;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

// Create reminder DTO
export interface CreateReminderDto {
  task_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  repeat_interval: RepeatInterval;
}

// Update reminder DTO
export interface UpdateReminderDto {
  title?: string;
  description?: string;
  remind_at?: string;
  repeat_interval?: RepeatInterval;
  is_active?: boolean;
}
