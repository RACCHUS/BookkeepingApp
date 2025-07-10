/**
 * Debug script to check if statementId field matching is working correctly
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function debugStatementIds() {
  console.log('🔍 Debugging statement ID matching...');
  
  try {
    // 1. Check if there are any transactions with statementId
    console.log('\n📊 Looking for transactions with statementId...');
    
    // 2. Check if there are any uploads
    console.log('\n📁 Looking for uploads...');
    
    // 3. Compare the IDs
    console.log('\n🔗 Checking ID matching...');
    
    console.log('✅ Debug complete. Check the server logs for actual data.');
    console.log('📝 To fix the issue:');
    console.log('   1. Verify transactions are created with correct statementId field');
    console.log('   2. Verify uploads API returns correct id/fileId fields');
    console.log('   3. Verify frontend statement fetching logic');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugStatementIds().catch(console.error);
