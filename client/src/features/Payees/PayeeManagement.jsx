import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import PayeeList from './PayeeList';
import PayeeForm from './PayeeForm';
import CheckPayeeAssignment from './CheckPayeeAssignment';

const PayeeManagement = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [showForm, setShowForm] = useState(false);
  const [editingPayee, setEditingPayee] = useState(null);

  // Fetch payees based on active tab
  const { data: payeesData, isLoading, refetch } = useQuery({
    queryKey: ['payees', activeTab],
    queryFn: () => {
      if (activeTab === 'employees') {
        return api.payees.getEmployees();
      } else if (activeTab === 'vendors') {
        return api.payees.getVendors();
      } else {
        return api.payees.getAll();
      }
    }
  });

  // Fetch unassigned check transactions
  const { data: unassignedChecks, refetch: refetchUnassigned } = useQuery({
    queryKey: ['unassigned-checks'],
    queryFn: () => api.payees.getTransactionsWithoutPayees({ paymentMethod: 'check' })
  });

  const payeesRaw = payeesData?.payees || payeesData?.employees || payeesData?.vendors;
  const payees = Array.isArray(payeesRaw) ? payeesRaw : [];
  const unassignedTxns = unassignedChecks?.transactions;
  const unassignedCheckCount = Array.isArray(unassignedTxns) ? unassignedTxns.length : 0;

  const handleCreatePayee = () => {
    setEditingPayee(null);
    setShowForm(true);
  };

  const handleEditPayee = (payee) => {
    setEditingPayee(payee);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPayee(null);
    refetch();
  };

  const handleDeletePayee = async (payeeId) => {
    if (!window.confirm('Are you sure you want to delete this payee? This action cannot be undone.')) {
      return;
    }

    try {
      await api.payees.delete(payeeId);
      toast.success('Payee deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting payee:', error);
      toast.error('Failed to delete payee');
    }
  };

  const tabs = [
    { key: 'employees', label: 'Employees', icon: '👥' },
    { key: 'assignment', label: `Check Assignment ${unassignedCheckCount > 0 ? `(${unassignedCheckCount})` : ''}`, icon: '📝', badge: unassignedCheckCount }
  ];

  if (showForm) {
    return (
      <PayeeForm
        payee={editingPayee}
        onClose={handleFormClose}
        type={activeTab === 'employees' ? 'employee' : 'vendor'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Employee Management
        </h1>
        {activeTab !== 'assignment' && (
          <button
            onClick={handleCreatePayee}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Employee
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {activeTab === 'assignment' ? (
          <CheckPayeeAssignment 
            onAssignmentComplete={() => {
              refetchUnassigned();
              refetch();
            }}
          />
        ) : (
          <PayeeList
            payees={payees}
            isLoading={isLoading}
            type={activeTab}
            onEdit={handleEditPayee}
            onDelete={handleDeletePayee}
          />
        )}
      </div>
    </div>
  );
};

export default PayeeManagement;
