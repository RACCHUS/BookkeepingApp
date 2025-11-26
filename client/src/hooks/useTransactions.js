// React hook for fetching transactions from Firestore
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/firestoreTransactions';

/**
 * Custom hook to fetch transactions for a user
 * @param {string} userId
 * @param {number} maxResults
 */
export function useTransactions(userId, maxResults = 50) {
  return useQuery({
    queryKey: ['transactions', userId, maxResults],
    queryFn: () => getTransactions(userId, maxResults),
    enabled: !!userId
  });
}
