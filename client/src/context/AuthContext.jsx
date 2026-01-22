import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signOut,
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth, googleProvider } from '../services/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
      // If user changed (logout or different user login), clear the cache
      if (user && (!newUser || newUser.uid !== user.uid)) {
        console.log('🔄 User changed, clearing query cache');
        queryClient.clear();
      }
      setUser(newUser);
      setLoading(false);
    });    return unsubscribe;
  }, [user, queryClient]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { user } = await signInWithPopup(auth, googleProvider);
      toast.success('Signed in with Google successfully!');
      return user;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear all cached data before signing out
      queryClient.clear();
      await signOut(auth);
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
