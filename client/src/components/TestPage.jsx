import React, { useState } from 'react';
import api from '../services/api';

const TestPage = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setTestResult({ success: true, data });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testAuthenticatedApi = async () => {
    setLoading(true);
    try {
      const response = await api.transactions.getAll({ limit: 1 });
      setTestResult({ 
        success: true, 
        data: response.data,
        message: 'Authenticated API call successful!'
      });
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.response?.data?.message || error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testApiConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Basic API Connection'}
          </button>
        </div>
        
        <div>
          <button
            onClick={testAuthenticatedApi}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Authenticated API'}
          </button>
        </div>
      </div>

      {testResult && (
        <div className="mt-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">
            Result: {testResult.success ? '✅ Success' : '❌ Error'}
          </h3>
          {testResult.success ? (
            <div>
              {testResult.message && (
                <p className="text-green-600 mb-2">{testResult.message}</p>
              )}
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-auto text-gray-900 dark:text-gray-100 transition-colors">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <p className="text-red-600 dark:text-red-400 transition-colors">Error: {testResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestPage;
