// Check classification_rules table
import { createClient } from '@supabase/supabase-js';

// Use anon key for testing
const supabaseUrl = 'https://jjkcrknddmehqcscfceo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Checking classification_rules table...');
  
  // Try to query the table
  const { data, error } = await supabase
    .from('classification_rules')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Table query error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Table exists! Schema working. Data:', data);
  }
  
  // Try to insert a test record
  console.log('\\nTrying to insert a test rule...');
  const { data: insertData, error: insertError } = await supabase
    .from('classification_rules')
    .insert({
      user_id: 'test-user',
      pattern: 'TEST PATTERN',
      category: 'MEALS',
      pattern_type: 'contains',
      vendor_name: 'Test Vendor',
      confidence: 0.9,
      source: 'gemini',
      is_active: true,
      match_count: 0,
    })
    .select();
    
  if (insertError) {
    console.error('Insert error:', JSON.stringify(insertError, null, 2));
  } else {
    console.log('Insert successful:', insertData);
    
    // Clean up test record
    await supabase.from('classification_rules').delete().eq('user_id', 'test-user');
  }
}

run();
