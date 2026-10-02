import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import App from './App';

const Expenses = lazy(() => import('./components/Expenses'));
const Loans = lazy(() => import('./components/Loans'));
const Savings = lazy(() => import('./components/Savings'));
const GoogleSheetsConfig = lazy(() => import('./components/GoogleSheetsConfig'));
const OAuth2Callback = lazy(() => import('./components/OAuth2Callback'));

const withSuspense = (element: React.ReactNode) => (
  <Suspense
    fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    }
  >
    {element}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Navigate to="/expenses" replace />
      },
      {
        path: 'expenses',
        element: withSuspense(<Expenses />)
      },
      {
        path: 'investments',
        element: withSuspense(<Loans />)
      },
      {
        path: 'savings',
        element: withSuspense(<Savings />)
      },
      {
        path: 'configuration',
        element: withSuspense(<GoogleSheetsConfig />)
      }
    ]
  },
  {
    path: '/oauth-callback',
    element: withSuspense(<OAuth2Callback />)
  }
]);