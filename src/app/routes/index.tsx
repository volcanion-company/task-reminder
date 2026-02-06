import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@presentation/layouts';
import { ErrorBoundary } from '@presentation/components';

// Lazy load page components
import { lazy } from 'react';

const Dashboard = lazy(() => import('@presentation/pages/Dashboard/Dashboard'));
const TaskList = lazy(() => import('@presentation/pages/Tasks/TaskList'));
const TaskDetail = lazy(() => import('@presentation/pages/Tasks/TaskDetail'));
const Calendar = lazy(() => import('@presentation/pages/Calendar/Calendar'));
const ReminderList = lazy(() => import('@presentation/pages/Reminders/ReminderList'));
const Tags = lazy(() => import('@presentation/pages/Tags/Tags'));
const Settings = lazy(() => import('@presentation/pages/Settings/Settings'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <ErrorBoundary><Dashboard /></ErrorBoundary>,
      },
      {
        path: 'tasks',
        element: <ErrorBoundary><TaskList /></ErrorBoundary>,
      },
      {
        path: 'tasks/:id',
        element: <ErrorBoundary><TaskDetail /></ErrorBoundary>,
      },
      {
        path: 'calendar',
        element: <ErrorBoundary><Calendar /></ErrorBoundary>,
      },
      {
        path: 'reminders',
        element: <ErrorBoundary><ReminderList /></ErrorBoundary>,
      },
      {
        path: 'tags',
        element: <ErrorBoundary><Tags /></ErrorBoundary>,
      },
      {
        path: 'settings',
        element: <ErrorBoundary><Settings /></ErrorBoundary>,
      },
    ],
  },
]);
