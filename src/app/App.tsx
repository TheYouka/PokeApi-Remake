// Raíz de React: QueryClientProvider → RouterProvider (§8.1).
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { queryClient } from './queryClient';
import { getRouter } from './router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={getRouter()} />
    </QueryClientProvider>
  );
}
