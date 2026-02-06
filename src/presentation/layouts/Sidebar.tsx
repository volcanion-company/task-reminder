import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Bell,
  Tag,
  Settings,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTaskStore } from '@app/store/taskStore';
import { useReminderStore } from '@app/store/reminderStore';

interface SidebarProps {
  onNewTask: () => void;
}

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/tags', icon: Tag, label: 'Tags' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ onNewTask }: SidebarProps) {
  const location = useLocation();
  const tasks = useTaskStore((state) => state.tasks);
  const reminders = useReminderStore((state) => state.reminders);
  
  // Calculate stats
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const upcomingReminders = reminders.filter(r => r.is_active).length;

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* App logo/title */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Task Reminder</h1>
        <p className="text-sm text-muted-foreground mt-1">Stay organized</p>
      </div>

      {/* New Task Button */}
      <div className="p-4">
        <button
          onClick={onNewTask}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors no-select',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer/Stats */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Active tasks</span>
            <span className="font-medium text-foreground">{activeTasks}</span>
          </div>
          <div className="flex justify-between">
            <span>Upcoming reminders</span>
            <span className="font-medium text-foreground">{upcomingReminders}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
