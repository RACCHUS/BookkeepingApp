// Temporary debugging utilities

// Function to manually query dev transactions
export const queryDevTransactions = async () => {
  try {
    const response = await fetch('/api/transactions/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🧪 Manual dev transaction query result:', data);
    return data;
  } catch (error) {
    console.error('🧪 Manual query error:', error);
    return null;
  }
};

// Function to check all transaction data directly
export const checkAllTransactions = async () => {
  try {
    // This would need a special endpoint to bypass user filtering
    console.log('📊 Checking all transactions in database...');
    // TODO: Implement if needed
  } catch (error) {
    console.error('Error checking all transactions:', error);
  }
};
