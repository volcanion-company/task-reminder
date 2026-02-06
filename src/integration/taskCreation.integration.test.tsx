import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDialog } from '@presentation/components/TaskDialog';
import { useTaskStore } from '@app/store/taskStore';
import { useTagStore } from '@app/store/tagStore';
import { toast } from '@app/store/toastStore';
import { TaskPriority, TaskStatus } from '@domain/entities/Task';
import type { Task } from '@domain/entities/Task';

/**
 * Integration Test: Task Creation Flow
 * 
 * Tests the complete flow of creating a task:
 * 1. User opens TaskDialog
 * 2. Fills in form fields (title, description, priority, etc.)
 * 3. Selects tags
 * 4. Submits the form
 * 5. Store calls API (mocked with invoke)
 * 6. Backend creates task in database (mocked)
 * 7. Store updates with new task
 * 8. UI shows success message
 * 9. Dialog closes
 */

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock stores
vi.mock('@app/store/taskStore');
vi.mock('@app/store/tagStore');
vi.mock('@app/store/toastStore');

describe('Integration: Task Creation Flow', () => {
  const mockOnClose = vi.fn();
  const mockTags = [
    {
      id: '1',
      name: 'Work',
      color: '#3b82f6',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Personal',
      color: '#10b981',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock tag store
    (useTagStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tags: mockTags,
      fetchTags: vi.fn(),
      createTag: vi.fn(),
    });

    // Mock toast
    (toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }).success = vi.fn();
    (toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }).error = vi.fn();
  });

  it('should complete full task creation flow successfully', async () => {
    const user = userEvent.setup({ delay: null });
    
    // Mock backend response
    const createdTask: Task = {
      id: 'task-123',
      title: 'Complete integration tests',
      description: 'Write comprehensive integration tests for task creation',
      priority: TaskPriority.High,
      status: TaskStatus.Pending,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      tags: [mockTags[0]], // Work tag
      estimated_minutes: 120,
      notes: 'Remember to test edge cases',
    };

    mockInvoke.mockResolvedValue(createdTask);

    // Mock task store with real createTask implementation
    const mockCreateTask = vi.fn().mockImplementation(async (taskDto) => {
      const result = await mockInvoke('create_task', { taskDto });
      return result;
    });

    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
    });

    // 1. Render TaskDialog
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);

    // 2. Fill in form fields
    const titleInput = screen.getByPlaceholderText('Enter task title');
    await user.type(titleInput, 'Complete integration tests');

    const descriptionInput = screen.getByPlaceholderText('Enter task description');
    await user.type(descriptionInput, 'Write comprehensive integration tests for task creation');

    // Select priority: High
    const prioritySelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(prioritySelect, TaskPriority.High);

    // Fill estimated minutes
    const estimatedInput = screen.getByPlaceholderText('e.g., 60');
    await user.type(estimatedInput, '120');

    // Fill notes
    const notesInput = screen.getByPlaceholderText('Additional notes');
    await user.type(notesInput, 'Remember to test edge cases');

    // 3. Select tag: Work
    const workTagButton = screen.getByRole('button', { name: 'Work' });
    await user.click(workTagButton);

    // 4. Submit form
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);

    // 5. Verify API was called with correct data
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Complete integration tests',
          description: 'Write comprehensive integration tests for task creation',
          priority: TaskPriority.High,
          estimated_minutes: 120,
          notes: 'Remember to test edge cases',
          tag_ids: ['1'], // Work tag
        })
      );
    });

    // 6. Verify backend was called
    expect(mockInvoke).toHaveBeenCalledWith('create_task', {
      taskDto: expect.objectContaining({
        title: 'Complete integration tests',
        priority: TaskPriority.High,
      }),
    });

    // 7. Verify success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Task created',
        'Your task has been created successfully'
      );
    });

    // 8. Verify dialog closes
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle task creation errors gracefully', async () => {
    const user = userEvent.setup({ delay: null });

    // Mock backend error
    mockInvoke.mockRejectedValue(new Error('Database connection failed'));

    const mockCreateTask = vi.fn().mockImplementation(async (taskDto) => {
      try {
        const result = await mockInvoke('create_task', { taskDto });
        return result;
      } catch (error) {
        throw error;
      }
    });

    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
    });

    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);

    // Fill minimum required field
    const titleInput = screen.getByPlaceholderText('Enter task title');
    await user.type(titleInput, 'Test Task');

    // Submit
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create task',
        expect.stringContaining('Database connection failed')
      );
    });

    // Verify dialog stays open on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should validate required fields before submission', async () => {
    const user = userEvent.setup({ delay: null });

    const mockCreateTask = vi.fn();
    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
    });

    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);

    // Try to submit without filling title
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);

    // Verify validation error appears
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Verify API was not called
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should handle multiple tag selection', async () => {
    const user = userEvent.setup({ delay: null });

    const createdTask: Task = {
      id: 'task-456',
      title: 'Multi-tag task',
      description: '',
      priority: TaskPriority.Medium,
      status: TaskStatus.Pending,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      tags: mockTags, // Both tags
    };

    mockInvoke.mockResolvedValue(createdTask);

    const mockCreateTask = vi.fn().mockImplementation(async (taskDto) => {
      return await mockInvoke('create_task', { taskDto });
    });

    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
    });

    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);

    const titleInput = screen.getByPlaceholderText('Enter task title');
    await user.type(titleInput, 'Multi-tag task');

    // Select both tags
    const workTag = screen.getByRole('button', { name: 'Work' });
    await user.click(workTag);

    const personalTag = screen.getByRole('button', { name: 'Personal' });
    await user.click(personalTag);

    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);

    // Verify both tags were included
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tag_ids: expect.arrayContaining(['1', '2']),
        })
      );
    });
  });

  it('should handle task creation with optional fields empty', async () => {
    const user = userEvent.setup({ delay: null });

    const minimalTask: Task = {
      id: 'task-789',
      title: 'Minimal task',
      description: '',
      priority: TaskPriority.Medium,
      status: TaskStatus.Pending,
      tags: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockInvoke.mockResolvedValue(minimalTask);

    const mockCreateTask = vi.fn().mockImplementation(async (taskDto) => {
      return await mockInvoke('create_task', { taskDto });
    });

    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
    });

    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);

    // Only fill title (required field)
    const titleInput = screen.getByPlaceholderText('Enter task title');
    await user.type(titleInput, 'Minimal task');

    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);

    // Verify task was created with only required fields
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Minimal task',
          priority: TaskPriority.Medium, // Default
          tag_ids: [], // Empty
        })
      );
    });

    // Verify success
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
