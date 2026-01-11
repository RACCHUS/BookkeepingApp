import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TagIcon,
  BuildingOfficeIcon,
  FolderIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  CreditCardIcon,
  WalletIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  ReceiptPercentIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Transactions', href: '/transactions', icon: DocumentTextIcon },
    { name: 'Income', href: '/income', icon: BanknotesIcon },
    { name: 'Income Sources', href: '/income-sources', icon: WalletIcon },
    { name: 'Expenses', href: '/expenses', icon: CreditCardIcon },
    { name: 'Inventory', href: '/inventory', icon: CubeIcon },
    { name: 'Import Documents', href: '/documents', icon: FolderIcon },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Payees', href: '/payees', icon: UserGroupIcon },
    { name: 'Vendors', href: '/vendors', icon: BuildingStorefrontIcon },
    { name: 'Catalogue', href: '/catalogue', icon: ClipboardDocumentListIcon },
    { name: 'Quotes', href: '/quotes', icon: DocumentCheckIcon },
    { name: 'Invoices', href: '/invoices', icon: ReceiptPercentIcon },
    { name: 'Recurring', href: '/recurring', icon: ArrowPathIcon },
    { name: 'Classification', href: '/classification', icon: TagIcon },
    { name: 'Tax Forms', href: '/tax-forms', icon: DocumentDuplicateIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  ];

  return (
    <div className={`flex flex-col h-screen ${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-blue-600 dark:bg-blue-700">
        {isCollapsed ? (
          <span className="text-xl font-bold text-white">B</span>
        ) : (
          <h1 className="text-xl font-bold text-white">BookKeeper</h1>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-5 h-5" />
        ) : (
          <ChevronLeftIcon className="w-5 h-5" />
        )}
      </button>

      {/* Navigation - scrollable with hidden scrollbar */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-600">
        <div className={`flex items-center text-xs text-gray-500 dark:text-gray-400 ${isCollapsed ? 'justify-center' : ''}`}>
          <Cog6ToothIcon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && <span>Version 1.0.0</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
