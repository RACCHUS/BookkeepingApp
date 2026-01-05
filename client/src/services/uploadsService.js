import { api } from './api';
import { auth } from './firebase';

/**
 * Get uploads for the current user
 * @param {object} params - filter, pagination, etc.
 */
export async function getUploads(params = {}) {
  // Ensure user is authenticated and token is present
  const user = auth.currentUser;
  if (!user) {
    console.error('[getUploads] No authenticated user found.');
    throw new Error('User not authenticated');
  }
  const token = await user.getIdToken();
  console.debug('[getUploads] Using token:', token);
  // Calls GET /api/pdf/uploads with query params and explicit Authorization header
  const response = await api.get('/pdf/uploads', {
    params,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  // Return only the uploads array
  return response.data?.data || [];
}

/**
 * Rename an upload
 * @param {string} uploadId
 * @param {string} name
 */
export async function renameUpload(uploadId, name) {
  // Calls PUT /api/pdf/uploads/:id/rename
  const response = await api.put(`/pdf/uploads/${uploadId}/rename`, { name });
  return response.data;
}

/**
 * Delete an upload
 * @param {string} uploadId
 * @param {object} options - { deleteTransactions: boolean }
 */
export async function deleteUpload(uploadId, options = {}) {
  // Calls DELETE /api/pdf/uploads/:id with optional deleteTransactions param
  const params = {};
  if (options.deleteTransactions !== undefined) {
    params.deleteTransactions = options.deleteTransactions;
  }
  const response = await api.delete(`/pdf/uploads/${uploadId}`, { params });
  return response.data;
}

/**
 * Batch delete multiple uploads
 * @param {string[]} uploadIds - Array of upload IDs to delete
 * @param {object} options - { deleteTransactions: boolean }
 * @returns {Promise<{ successful: Array, failed: Array }>}
 */
export async function batchDeleteUploads(uploadIds, options = {}) {
  const response = await api.post('/pdf/uploads/batch-delete', {
    uploadIds,
    deleteTransactions: options.deleteTransactions || false
  });
  return response.data;
}
