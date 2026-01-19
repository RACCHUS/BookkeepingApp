import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { LoadingSpinner } from '../../components/ui';
import { QuickReports } from '../../components/common';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { TransactionModal } from '../../components/forms';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Get current month's data
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Format dates as YYYY-MM-DD for database query
  const formatDate = (date) => date.toISOString().split('T')[0];
  const startDateStr = formatDate(startOfMonth);
  const endDateStr = formatDate(endOfMonth);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['transaction-summary', startDateStr, endDateStr],
    queryFn: () => api.transactions.getSummary(startDateStr, endDateStr),
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => api.transactions.getAll({
      limit: 5,
      orderBy: 'date',
      order: 'desc'
    }),
  });

  // Also get summary of all recent transactions (last 30 days) for better UX when current month is empty
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDateStr = formatDate(thirtyDaysAgo);
  
  const { data: recentSummary } = useQuery({
    queryKey: ['recent-summary', recentDateStr],
    queryFn: () => api.transactions.getSummary(recentDateStr, formatDate(new Date())),
    enabled: !summary?.data?.summary?.transactionCount, // Only fetch if current month is empty
  });

  const [showAddModal, setShowAddModal] = React.useState(false);

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading dashboard data: {error.message}</p>
      </div>
    );
  }

  const summaryData = summary?.data?.summary || {};
  const transactions = recentTransactions?.data?.transactions || [];
  
  // Use recent summary if current month has no transactions
  const displaySummary = summaryData.transactionCount > 0 
    ? summaryData 
    : (recentSummary?.data?.summary || summaryData);
  const showingRecentData = summaryData.transactionCount === 0 && recentSummary?.data?.summary?.transactionCount > 0;

  const stats = [
    {
      name: 'Total Income',
      value: `$${(displaySummary.totalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Expenses',
      value: `$${(displaySummary.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowTrendingDownIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Net Income',
      value: `$${(displaySummary.netIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CurrencyDollarIcon,
      color: displaySummary.netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: displaySummary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      name: 'Transactions',
      value: displaySummary.transactionCount || 0,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
  ];

  // Add transaction handler
  const handleAddTransaction = async (data) => {
    await api.transactions.create(data);
    setShowAddModal(false);
    // Refetch recent transactions and summary so new transaction appears with correct Firestore id
    if (typeof window !== 'undefined' && window.__REACT_QUERY_CLIENT__) {
      window.__REACT_QUERY_CLIENT__.invalidateQueries(['recent-transactions']);
      window.__REACT_QUERY_CLIENT__.invalidateQueries(['transaction-summary', startDateStr, endDateStr]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 transition-colors">
          {showingRecentData ? (
            <>Last 30 days (no transactions in {startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</>
          ) : (
            <>Overview for {startOfMonth.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} - {endOfMonth.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</>
          )}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">{stat.name}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent transactions - full width */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Recent Transactions</h2>
            </div>
            <div className="card-body p-0">
              {transactions.length > 0 ? (
                <div>
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell w-28">Date</th>
                        <th className="table-header-cell">Description</th>
                        <th className="table-header-cell w-32">Category</th>
                        <th className="table-header-cell w-28 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction, index) => (
                        <tr key={transaction.id} className={index % 2 === 0 ? 'table-row' : 'table-row-alt'}>
                          <td className="table-cell w-28">
                            {new Date(transaction.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="table-cell max-w-0">
                            <p className="font-medium truncate" title={transaction.description}>{transaction.description}</p>
                          </td>
                          <td className="table-cell w-32">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors truncate max-w-full">
                              {transaction.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="table-cell w-28 text-right">
                            <span className={`font-medium ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}$
                              {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600 transition-colors" />
                  <p>No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reports Section */}
      <QuickReports />

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload CSV</h3>
            <p className="text-gray-700 dark:text-gray-200 mb-4">Import transactions from bank statements</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
            >
              Upload Now
            </button>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Add Transaction</h3>
            <p className="text-gray-700 dark:text-gray-200 mb-4">Manually enter a new transaction</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Transaction
            </button>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generate Report</h3>
            <p className="text-gray-700 dark:text-gray-200 mb-4">Create profit/loss and tax reports</p>
            <button className="btn btn-primary" onClick={() => navigate('/reports')}>
              View Reports
            </button>
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddTransaction}
        mode="create"
        refreshTrigger={Date.now()}
      />
    </div>
  );
};

export default Dashboard;
