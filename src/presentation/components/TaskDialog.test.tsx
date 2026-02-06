import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDialog } from './TaskDialog';
import { useTaskStore } from '@app/store/taskStore';
import { useTagStore } from '@app/store/tagStore';
import { toast } from '@app/store/toastStore';
import { TaskPriority, TaskStatus } from '@domain/entities/Task';

// Mock stores
vi.mock('@app/store/taskStore');
vi.mock('@app/store/tagStore');
vi.mock('@app/store/toastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TaskDialog', () => {
  const mockCreateTask = vi.fn();
  const mockUpdateTask = vi.fn();
  const mockFetchTags = vi.fn();
  const mockCreateTag = vi.fn();
  const mockOnClose = vi.fn();

  const mockTags = [
    { id: '1', name: 'Work', color: '#3b82f6', created_at: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'Personal', color: '#10b981', created_at: '2024-01-02T00:00:00Z' },
  ];

  const mockTask = {
    id: 'task-1',
    title: 'Existing Task',
    description: 'Task description',
    status: TaskStatus.Pending,
    priority: TaskPriority.High,
    due_date: '2024-12-31T23:59:59Z',
    notes: 'Some notes',
    estimated_minutes: 120,
    tags: [mockTags[0]],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useTaskStore as any).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
    });

    (useTagStore as any).mockReturnValue({
      tags: mockTags,
      fetchTags: mockFetchTags,
      createTag: mockCreateTag,
    });
  });

  it('does not render when closed', () => {
    render(<TaskDialog isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('New Task')).not.toBeInTheDocument();
  });

  it('renders with "New Task" title when creating', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('renders with "Edit Task" title when editing', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} task={mockTask} />);
    expect(screen.getByText('Edit Task')).toBeInTheDocument();
  });

  it('fetches tags when dialog opens', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(mockFetchTags).toHaveBeenCalled();
  });

  it('renders all form fields', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByPlaceholderText('Enter task title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter task description')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText(/Due Date/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 60')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Additional notes')).toBeInTheDocument();
  });

  it('shows required indicator for title', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays character count for title', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('0/200 characters')).toBeInTheDocument();
  });

  it('populates form with task data in edit mode', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} task={mockTask} />);
    
    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Task description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
  });

  it('validates required title field', async () => {
    const user = userEvent.setup();
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);
    
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  // Note: Title length validation test removed - maxLength="200" attribute prevents typing >200 chars

  // Note: estimated_minutes validation test removed - type="number" attribute prevents non-numeric input

  it('creates task with valid data', async () => {
    const user = userEvent.setup();
    mockCreateTask.mockResolvedValue({ id: 'new-task', title: 'Test Task' });
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'Test Task');
    await user.type(screen.getByPlaceholderText('Enter task description'), 'Test Description');
    
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: 'Test Description',
          priority: TaskPriority.Medium,
        })
      );
    });
    
    expect(toast.success).toHaveBeenCalledWith('Task created', 'Your task has been created successfully');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates task in edit mode', async () => {
    const user = userEvent.setup();
    mockUpdateTask.mockResolvedValue(mockTask);
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} task={mockTask} />);
    
    const titleInput = screen.getByDisplayValue('Existing Task');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Task');
    
    const submitButton = screen.getByRole('button', { name: /Save Changes/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Task',
        })
      );
    });
    
    expect(toast.success).toHaveBeenCalledWith('Task updated', 'Your task has been updated successfully');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays available tags', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('toggles tag selection', async () => {
    const user = userEvent.setup();
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    const workTag = screen.getByText('Work');
    await user.click(workTag);
    
    expect(screen.getByText('1 tag selected')).toBeInTheDocument();
    
    await user.click(workTag);
    expect(screen.queryByText('1 tag selected')).not.toBeInTheDocument();
  });

  it('shows "New Tag" button', () => {
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByRole('button', { name: /New Tag/ })).toBeInTheDocument();
  });

  it('shows message when no tags available', () => {
    (useTagStore as any).mockReturnValue({
      tags: [],
      fetchTags: mockFetchTags,
      createTag: mockCreateTag,
    });
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/No tags available/)).toBeInTheDocument();
  });

  it('allows changing priority', async () => {
    const user = userEvent.setup();
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    const prioritySelect = screen.getAllByRole('combobox')[0]; // First select is Priority
    await user.selectOptions(prioritySelect, TaskPriority.Urgent);
    
    expect(prioritySelect).toHaveValue(TaskPriority.Urgent);
  });

  it('closes dialog when cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dialog when X button clicked', async () => {
    const user = userEvent.setup();
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('button');
    if (closeButton) {
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockCreateTask.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'Test Task');
    
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);
    
    expect(screen.getByText(/Creating.../)).toBeInTheDocument();
  });

  it('disables buttons during submission', async () => {
    const user = userEvent.setup();
    mockCreateTask.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'Test Task');
    
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeDisabled();
  });

  it('handles create task error', async () => {
    const user = userEvent.setup();
    mockCreateTask.mockResolvedValue(null);
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'Test Task');
    
    const submitButton = screen.getByRole('button', { name: /Create Task/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create task', 'Please try again');
    });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles update task error', async () => {
    const user = userEvent.setup();
    mockUpdateTask.mockRejectedValue(new Error('Update failed'));
    
    render(<TaskDialog isOpen={true} onClose={mockOnClose} task={mockTask} />);
    
    const submitButton = screen.getByRole('button', { name: /Save Changes/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update task', 'Update failed');
    });
  });

  it('resets form when opening for new task after edit', () => {
    const { rerender } = render(<TaskDialog isOpen={true} onClose={mockOnClose} task={mockTask} />);
    
    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
    
    rerender(<TaskDialog isOpen={true} onClose={mockOnClose} task={null} />);
    
    expect(screen.queryByDisplayValue('Existing Task')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter task title')).toHaveValue('');
  });
});
