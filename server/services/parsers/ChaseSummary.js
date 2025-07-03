/**
 * Generates summary statistics from a list of transactions.
 */
class ChaseSummary {
  static generate(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      categorySummary: {},
      needsReview: 0
    };
    transactions.forEach(tx => {
      if (tx.type === 'income') summary.totalIncome += tx.amount;
      else summary.totalExpenses += tx.amount;
      if (tx.needsReview) summary.needsReview++;
      if (!summary.categorySummary[tx.category]) {
        summary.categorySummary[tx.category] = { total: 0, count: 0, type: tx.type };
      }
      summary.categorySummary[tx.category].total += tx.amount;
      summary.categorySummary[tx.category].count++;
    });
    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    return summary;
  }
}

export default ChaseSummary;
