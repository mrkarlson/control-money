import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import GoogleSheetsConfig from './components/GoogleSheetsConfig';
import Expenses from './components/Expenses';
import Loans from './components/Loans';
import Savings from './components/Savings';
import OAuth2Callback from './components/OAuth2Callback';

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
        element: <Expenses />
      },
      {
        path: 'investments',
        element: <Loans />
      },
      {
        path: 'savings',
        element: <Savings />
      },
      {
        path: 'configuration',
        element: <GoogleSheetsConfig />
      }
    ]
  },
  {
    path: '/oauth-callback',
    element: <OAuth2Callback />
  }
]);