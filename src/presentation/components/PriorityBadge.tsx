import { memo } from 'react';
import { clsx } from 'clsx';
import { TaskPriority } from '@domain/entities/Task';
import { AlertCircle, ArrowUp, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  [TaskPriority.Low]: {
    label: 'Low',
    // Improved contrast: darker text on light background
    className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600',
    icon: Minus,
  },
  [TaskPriority.Medium]: {
    label: 'Medium',
    // Improved contrast: darker blue text
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700',
    icon: Minus,
  },
  [TaskPriority.High]: {
    label: 'High',
    // Improved contrast: darker orange text
    className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700',
    icon: ArrowUp,
  },
  [TaskPriority.Urgent]: {
    label: 'Urgent',
    // Improved contrast: darker red text
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-700',
    icon: AlertCircle,
  },
};

function PriorityBadgeComponent({ priority, className, showIcon = true }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        // Increased from text-xs to text-sm (14px) for better WCAG compliance
        // Added font-semibold for better readability (qualifies as "large text")
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-semibold border',
        config.className,
        className
      )}
      role="status"
      aria-label={`Priority: ${config.label}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {config.label}
    </span>
  );
}

// Memoize to prevent unnecessary re-renders
export const PriorityBadge = memo(PriorityBadgeComponent);
