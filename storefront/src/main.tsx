import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { warmUpServer } from './api/client';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // The shop server sleeps when idle and can take a minute to wake. Network failures are retried
      // patiently (about 5 tries over ~20s, on top of the 60s wait per try); answers like 404 are not.
      retry: (count, error) => !(error as { response?: unknown }).response && count < 5,
      retryDelay: (attempt) => Math.min(2000 * (attempt + 1), 8000),
    },
  },
});

warmUpServer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
