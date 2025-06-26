import React from 'react';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  // Mock data for testing
  const summaryData = {
    totalIncome: 5000,
    totalExpenses: 3200,
    netIncome: 1800,
    transactionCount: 25
  };

  const transactions = [
    {
      id: '1',
      date: '2025-06-24',
      description: 'Sample Income',
      amount: 1000,
      type: 'income',
      category: 'Gross Receipts',
      payee: 'Client ABC'
    },
    {
      id: '2',
      date: '2025-06-23',
      description: 'Office Supplies',
      amount: -150,
      type: 'expense',
      category: 'Office Expenses',
      payee: 'Staples'
    }
  ];

  const stats = [
    {
      name: 'Total Income',
      value: `$${summaryData.totalIncome.toLocaleString()}`,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Expenses',
      value: `$${summaryData.totalExpenses.toLocaleString()}`,
      icon: ArrowTrendingDownIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Net Income',
      value: `$${summaryData.netIncome.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: summaryData.netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: summaryData.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      name: 'Transactions',
      value: summaryData.transactionCount.toString(),
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your bookkeeping data (Demo Mode)</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className={`text-lg font-medium ${stat.color}`}>
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        </div>
        <div className="px-6 py-4">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.payee && `${transaction.payee} • `}
                        {transaction.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm text-gray-700">Add Transaction</span>
            </button>
            <button className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50">
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm text-gray-700">Upload Statement</span>
            </button>
            <button className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50">
              <ChartBarIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm text-gray-700">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
