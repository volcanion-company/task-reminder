// Task status enumeration
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

// Task priority enumeration
export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

// Effective task status (includes computed Overdue)
export enum EffectiveTaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Done = 'done',
  Overdue = 'overdue',
  Cancelled = 'cancelled',
}

// Task entity
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string; // ISO 8601 datetime
  completed_at?: string;
  image_path?: string;
  notes?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

// Tag entity
export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

// Create task DTO
export interface CreateTaskDto {
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
  image_path?: string;
  notes?: string;
  estimated_minutes?: number;
  tag_ids: string[];
}

// Update task DTO
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  image_path?: string;
  notes?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  tag_ids?: string[];
}
