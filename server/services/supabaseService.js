// Supabase Storage Service with Cloudinary Fallback
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Cloudinary
let cloudinaryConfigured = false;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  cloudinaryConfigured = true;
  console.log('☁️ Cloudinary configured for PDF fallback');
}

/**
 * Uploads a PDF buffer to Cloudinary
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadPDFToCloudinary(fileBuffer, fileName) {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:application/pdf;base64,${base64}`;
  
  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: `pdfs/${fileName.replace(/\//g, '_')}`,
    folder: 'bookkeeping-pdfs',
    resource_type: 'raw', // PDFs are raw files, not images
    tags: ['pdf', 'bank-statement'],
    context: {
      originalName: fileName,
      uploadedAt: new Date().toISOString()
    }
  });
  
  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

/**
 * Deletes a PDF from Cloudinary
 * @param {string} publicId
 */
async function deletePDFFromCloudinary(publicId) {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'raw'
  });
  return result.result === 'ok';
}

/**
 * Uploads a file buffer to Supabase Storage, falls back to Cloudinary if Supabase fails
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @returns {Promise<{url: string, storageProvider: string, cloudinaryPublicId?: string}>}
 */
export async function uploadFileToSupabase(fileBuffer, fileName) {
  // Try Supabase first
  try {
    const { data, error } = await supabase.storage.from('uploads').upload(fileName, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    });
    
    if (error) {
      // Check if it's a quota/storage full error
      const isStorageFullError = error.message?.toLowerCase().includes('quota') ||
                                  error.message?.toLowerCase().includes('storage') ||
                                  error.message?.toLowerCase().includes('limit') ||
                                  error.message?.toLowerCase().includes('full') ||
                                  error.statusCode === 413 ||
                                  error.statusCode === 507;
      
      if (isStorageFullError && cloudinaryConfigured) {
        console.log('⚠️ Supabase storage full, falling back to Cloudinary...');
        const cloudResult = await uploadPDFToCloudinary(fileBuffer, fileName);
        console.log(`✅ PDF uploaded to Cloudinary: ${cloudResult.publicId}`);
        return {
          url: cloudResult.url,
          storageProvider: 'cloudinary',
          cloudinaryPublicId: cloudResult.publicId
        };
      }
      
      throw error;
    }
    
    const publicUrl = supabase.storage.from('uploads').getPublicUrl(fileName).data.publicUrl;
    return {
      url: publicUrl,
      storageProvider: 'supabase'
    };
  } catch (error) {
    // If Supabase fails for any reason and Cloudinary is configured, try Cloudinary
    if (cloudinaryConfigured) {
      console.log(`⚠️ Supabase upload failed (${error.message}), trying Cloudinary...`);
      try {
        const cloudResult = await uploadPDFToCloudinary(fileBuffer, fileName);
        console.log(`✅ PDF uploaded to Cloudinary: ${cloudResult.publicId}`);
        return {
          url: cloudResult.url,
          storageProvider: 'cloudinary',
          cloudinaryPublicId: cloudResult.publicId
        };
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary upload also failed:', cloudinaryError.message);
        throw new Error(`Both storage providers failed. Supabase: ${error.message}, Cloudinary: ${cloudinaryError.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Deletes a file from the appropriate storage provider
 * @param {string} fileName - Supabase file name or path
 * @param {string} storageProvider - 'supabase' or 'cloudinary'
 * @param {string} cloudinaryPublicId - Required if storageProvider is 'cloudinary'
 */
export async function deleteFileFromSupabase(fileName, storageProvider = 'supabase', cloudinaryPublicId = null) {
  if (storageProvider === 'cloudinary' && cloudinaryPublicId) {
    const success = await deletePDFFromCloudinary(cloudinaryPublicId);
    if (!success) {
      throw new Error(`Failed to delete file from Cloudinary: ${cloudinaryPublicId}`);
    }
    console.log(`🗑️ Deleted from Cloudinary: ${cloudinaryPublicId}`);
    return;
  }
  
  // Default: delete from Supabase
  const { error } = await supabase.storage.from('uploads').remove([fileName]);
  if (error) throw error;
  console.log(`🗑️ Deleted from Supabase: ${fileName}`);
}

/**
 * Check if Cloudinary is configured as a fallback
 * @returns {boolean}
 */
export function isCloudinaryConfigured() {
  return cloudinaryConfigured;
}
