import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from '@app/providers/AppProvider';
import { router } from '@app/routes';

function App() {
  return (
    <AppProvider>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  );
}

export default App;
