import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import TestPage from './components/TestPage';

// Feature components
import Login from './features/Auth/Login';
import Dashboard from './features/Dashboard/Dashboard';
import TransactionList from './features/Transactions/TransactionList';
import PDFUpload from './features/PDFUpload/PDFUpload';
import Classification from './features/Classification/Classification';
import Reports from './features/Reports/Reports';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router 
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'dark:bg-gray-800 dark:text-white',
                  style: {
                    background: 'var(--toast-bg, #363636)',
                    color: 'var(--toast-color, #fff)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                }}
              />
              <Routes>
                {/* Test routes */}
                <Route path="/test" element={<TestPage />} />
                <Route 
                  path="/api-test" 
                  element={
                    <div className="p-8 dark:text-white">
                      <h1 className="text-2xl font-bold">Simple Test Page</h1>
                      <p>If you can see this, the React app is working!</p>
                      <a href="/login" className="text-blue-600 dark:text-blue-400 underline block mt-4">Go to Login</a>
                      <a href="/test" className="text-blue-600 dark:text-blue-400 underline block mt-2">Go to Full Test Page</a>
                    </div>
                  } 
                />
                
                {/* Public routes */}
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } 
                />
                
                {/* Protected routes with Layout */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="transactions" element={<TransactionList />} />
                  <Route path="upload" element={<PDFUpload />} />
                  <Route path="classification" element={<Classification />} />
                  <Route path="reports" element={<Reports />} />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
