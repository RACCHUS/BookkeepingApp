// Migration script: Ensures all uploads in /uploads have a unique id and a metadata file for user-friendly naming
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateUploads() {
  const uploadsDir = path.join(__dirname, '../uploads');
  let files;
  try {
    files = await fs.readdir(uploadsDir);
  } catch (e) {
    console.error('Uploads directory not found.');
    return;
  }
  let migrated = 0;
  for (const fileName of files) {
    if (fileName.endsWith('.meta.json')) continue; // skip meta files
    const filePath = path.join(uploadsDir, fileName);
    const fileId = fileName.split('-')[0];
    const metaPath = filePath + '.meta.json';
    // If meta file exists, skip
    try {
      await fs.access(metaPath);
      continue;
    } catch {}
    // Write a default meta file
    const originalName = fileName.substring(fileId.length + 1);
    const meta = {
      id: fileId,
      name: originalName,
      originalName,
      migratedAt: new Date().toISOString()
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    migrated++;
  }
  console.log(`Migration complete. ${migrated} uploads updated with metadata.`);
}

migrateUploads();
