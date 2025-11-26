import api from './api';

/**
 * Get details for a specific upload
 * @param {string} uploadId
 */
export async function getUploadDetails(uploadId) {
  // Calls GET /api/uploads/:id
  const response = await api.get(`/uploads/${uploadId}`);
  return response.data;
}
