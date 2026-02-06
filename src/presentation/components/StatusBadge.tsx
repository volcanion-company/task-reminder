import { memo } from 'react';
import { clsx } from 'clsx';
import { TaskStatus } from '@domain/entities/Task';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  [TaskStatus.Pending]: {
    label: 'Pending',
    // Improved contrast: darker yellow/amber text
    className: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700',
  },
  [TaskStatus.InProgress]: {
    label: 'In Progress',
    // Improved contrast: darker blue text
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700',
  },
  [TaskStatus.Completed]: {
    label: 'Completed',
    // Improved contrast: darker green text
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-700',
  },
  [TaskStatus.Cancelled]: {
    label: 'Cancelled',
    // Improved contrast: darker gray text
    className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600',
  },
};

function StatusBadgeComponent({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        // Increased from text-xs to text-sm (14px) for better WCAG compliance
        // Added font-semibold for better readability
        'inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold border',
        config.className,
        className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

// Memoize to prevent unnecessary re-renders
export const StatusBadge = memo(StatusBadgeComponent);
