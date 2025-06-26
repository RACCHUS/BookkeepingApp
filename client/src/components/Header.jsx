import React from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { 
  UserCircleIcon,
  BellIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - can add breadcrumbs or page title */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h2>
        </div>

        {/* Right side - user menu */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <button className="p-2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors">
            <BellIcon className="w-6 h-6" />
          </button>

          {/* User profile */}
          <div className="flex items-center space-x-3">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-gray-300" />
            )}
            
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
