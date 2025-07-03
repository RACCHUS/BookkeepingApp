/**
 * Handles classification and payee extraction for Chase transactions.
 */
class ChaseClassifier {
  static classify(description, amount, type) {
    // Simple keyword-based classification (expand as needed)
    const upperDesc = description.toUpperCase();
    let category = 'Uncategorized';
    let confidence = 0.3;
    if (type === 'income' && upperDesc.includes('DEPOSIT')) {
      category = 'Business Income';
      confidence = 0.8;
    } else if (type === 'expense' && upperDesc.includes('FEE')) {
      category = 'Bank Service Charges';
      confidence = 0.8;
    }
    // ...add more rules as needed...
    return {
      category,
      type,
      confidence,
      needsReview: category === 'Uncategorized',
      payee: this.extractPayee(description),
    };
  }

  static extractPayee(description) {
    // Simple payee extraction (expand as needed)
    return description.split(' ')[0];
  }
}

export default ChaseClassifier;
