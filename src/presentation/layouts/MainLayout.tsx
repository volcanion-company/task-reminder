import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TaskDialog } from '@presentation/components';
import { useKeyboardShortcuts, createNewItemShortcut, createSearchShortcut } from '@shared/utils/keyboard';

export function MainLayout() {
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);

  const handleNewTask = () => {
    setIsNewTaskDialogOpen(true);
    console.log('New task dialog opened');
  };

  const handleSearch = () => {
    // Focus search input
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    searchInput?.focus();
  };

  // Setup global keyboard shortcuts
  useKeyboardShortcuts([
    createNewItemShortcut(handleNewTask),
    createSearchShortcut(handleSearch),
  ]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar onNewTask={handleNewTask} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isNewTaskDialogOpen}
        onClose={() => setIsNewTaskDialogOpen(false)}
        task={null}
      />
    </div>
  );
}
