// Supabase Storage Service
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @returns {Promise<string>} Public URL
 */
export async function uploadFileToSupabase(fileBuffer, fileName) {
  const { data, error } = await supabase.storage.from('uploads').upload(fileName, fileBuffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  });
  if (error) throw error;
  return supabase.storage.from('uploads').getPublicUrl(fileName).publicUrl;
}

/**
 * Deletes a file from Supabase Storage
 * @param {string} fileName
 */
export async function deleteFileFromSupabase(fileName) {
  const { error } = await supabase.storage.from('uploads').remove([fileName]);
  if (error) throw error;
}
