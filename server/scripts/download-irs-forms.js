/**
 * Download IRS Form Templates
 * 
 * Downloads official IRS PDF forms for 1099-NEC, 1099-MISC, W-2, and W-3
 * These templates are used by TaxFormService to generate fillable tax forms
 * 
 * Usage: node scripts/download-irs-forms.js
 * 
 * @author BookkeepingApp Team
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IRS form URLs - Official IRS downloads
const IRS_FORMS = {
  'f1099nec.pdf': 'https://www.irs.gov/pub/irs-pdf/f1099nec.pdf',
  'f1099msc.pdf': 'https://www.irs.gov/pub/irs-pdf/f1099msc.pdf',
  'fw2.pdf': 'https://www.irs.gov/pub/irs-pdf/fw2.pdf',
  'fw3.pdf': 'https://www.irs.gov/pub/irs-pdf/fw3.pdf'
};

/**
 * Download a file from URL
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fsSync.createWriteStream(destPath);
    
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fsSync.unlink(destPath, () => {}); // Delete failed file
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Download all IRS forms
 */
async function downloadForms() {
  const templatesDir = path.join(__dirname, '../services/taxForms/templates');
  
  console.log('📁 Creating templates directory...');
  await fs.mkdir(templatesDir, { recursive: true });
  
  console.log('📥 Downloading IRS form templates...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [filename, url] of Object.entries(IRS_FORMS)) {
    const destPath = path.join(templatesDir, filename);
    
    try {
      console.log(`  Downloading ${filename}...`);
      await downloadFile(url, destPath);
      
      // Verify file was downloaded
      const stats = await fs.stat(destPath);
      if (stats.size > 1000) {
        console.log(`  ✅ Downloaded ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
        successCount++;
      } else {
        console.log(`  ⚠️  ${filename} may be incomplete (${stats.size} bytes)`);
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ Failed to download ${filename}: ${error.message}`);
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Download Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));
  
  if (failCount > 0) {
    console.log('\n⚠️  Some forms failed to download. You may need to:');
    console.log('   1. Download manually from irs.gov');
    console.log('   2. Place in: ' + templatesDir);
  }
  
  console.log('\n📋 Important Notes:');
  console.log('   • Downloaded forms are for recipient copies (B, C, 2)');
  console.log('   • Copy A for IRS filing requires e-filing or red scannable paper');
  console.log('   • See TAX_FORMS_IMPLEMENTATION_PLAN.md for compliance details\n');
}

// Run if called directly
downloadForms().catch(console.error);
