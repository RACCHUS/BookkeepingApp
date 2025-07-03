import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import TransactionModal from '../../components/TransactionModal';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Get current month's data
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['transaction-summary', startOfMonth, endOfMonth],
    queryFn: () => apiClient.transactions.getSummary(
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    ),
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => apiClient.transactions.getAll({
      limit: 5,
      orderBy: 'date',
      order: 'desc'
    }),
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

  const stats = [
    {
      name: 'Total Income',
      value: `$${(summaryData.totalIncome || 0).toLocaleString()}`,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Expenses',
      value: `$${(summaryData.totalExpenses || 0).toLocaleString()}`,
      icon: ArrowTrendingDownIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Net Income',
      value: `$${(summaryData.netIncome || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: summaryData.netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: summaryData.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      name: 'Transactions',
      value: summaryData.transactionCount || 0,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
  ];

  // Add transaction handler
  const handleAddTransaction = async (data) => {
    await apiClient.transactions.create(data);
    setShowAddModal(false);
    // Optionally refetch queries here if needed
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 transition-colors">
          Overview for {startOfMonth.toLocaleDateString()} - {endOfMonth.toLocaleDateString()}
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

      {/* Recent transactions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Recent Transactions</h2>
        </div>
        <div className="card-body p-0">
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Date</th>
                    <th className="table-header-cell">Description</th>
                    <th className="table-header-cell">Category</th>
                    <th className="table-header-cell">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? 'table-row' : 'table-row-alt'}>
                      <td className="table-cell">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.payee && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{transaction.payee}</p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`font-medium ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}$
                          {Math.abs(transaction.amount).toLocaleString()}
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

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-primary-600 dark:text-primary-400 transition-colors" />
            <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">Import transactions from bank statements</p>
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
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-primary-600 dark:text-primary-400 transition-colors" />
            <h3 className="text-lg font-semibold mb-2">Add Transaction</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">Manually enter a new transaction</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Transaction
            </button>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-primary-600 dark:text-primary-400 transition-colors" />
            <h3 className="text-lg font-semibold mb-2">Generate Report</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">Create profit/loss and tax reports</p>
            <button className="btn btn-primary">
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
      />
    </div>
  );
};

export default Dashboard;
