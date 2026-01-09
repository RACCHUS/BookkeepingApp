// Supabase Edge Function for Report Generation
// Generates P&L, tax summary, and expense reports

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface ReportRequest {
  type: "profit-loss" | "tax-summary" | "expense" | "income";
  startDate?: string;
  endDate?: string;
  companyId?: string;
  year?: number;
  format?: "json" | "csv";
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  company_id?: string;
}

/**
 * Generate Profit & Loss report
 */
function generateProfitLossReport(transactions: Transaction[], startDate: string, endDate: string) {
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    const category = tx.category || "Uncategorized";
    
    if (tx.type === "income") {
      incomeByCategory[category] = (incomeByCategory[category] || 0) + tx.amount;
      totalIncome += tx.amount;
    } else {
      expenseByCategory[category] = (expenseByCategory[category] || 0) + tx.amount;
      totalExpenses += tx.amount;
    }
  }

  return {
    reportType: "Profit & Loss",
    period: { startDate, endDate },
    income: {
      byCategory: incomeByCategory,
      total: totalIncome,
    },
    expenses: {
      byCategory: expenseByCategory,
      total: totalExpenses,
    },
    netIncome: totalIncome - totalExpenses,
    transactionCount: transactions.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate Tax Summary report (IRS categories)
 */
function generateTaxSummaryReport(transactions: Transaction[], year: number) {
  const deductibleCategories = [
    "Advertising",
    "Car and Truck Expenses",
    "Commissions and Fees",
    "Contract Labor",
    "Depreciation",
    "Employee Benefits",
    "Insurance",
    "Interest",
    "Legal and Professional Services",
    "Office Expense",
    "Rent or Lease",
    "Repairs and Maintenance",
    "Supplies",
    "Taxes and Licenses",
    "Travel",
    "Meals",
    "Utilities",
    "Wages",
    "Other Expenses",
  ];

  const categoryTotals: Record<string, number> = {};
  let totalDeductible = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    const category = tx.category || "Uncategorized";
    
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (deductibleCategories.includes(category)) {
      categoryTotals[category] = (categoryTotals[category] || 0) + tx.amount;
      totalDeductible += tx.amount;
    }
  }

  return {
    reportType: "Tax Summary",
    taxYear: year,
    grossIncome: totalIncome,
    deductions: {
      byCategory: categoryTotals,
      total: totalDeductible,
    },
    netTaxableIncome: totalIncome - totalDeductible,
    categories: deductibleCategories.map(cat => ({
      name: cat,
      amount: categoryTotals[cat] || 0,
    })).filter(c => c.amount > 0),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate Expense report by category
 */
function generateExpenseReport(transactions: Transaction[], startDate: string, endDate: string) {
  const expenses = transactions.filter(tx => tx.type === "expense");
  const byCategory: Record<string, { total: number; count: number; transactions: any[] }> = {};
  const byMonth: Record<string, number> = {};

  for (const tx of expenses) {
    const category = tx.category || "Uncategorized";
    const month = tx.date.substring(0, 7); // YYYY-MM

    if (!byCategory[category]) {
      byCategory[category] = { total: 0, count: 0, transactions: [] };
    }
    byCategory[category].total += tx.amount;
    byCategory[category].count += 1;
    byCategory[category].transactions.push({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
    });

    byMonth[month] = (byMonth[month] || 0) + tx.amount;
  }

  const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    reportType: "Expense Report",
    period: { startDate, endDate },
    totalExpenses,
    transactionCount: expenses.length,
    byCategory: Object.entries(byCategory).map(([name, data]) => ({
      category: name,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses * 100).toFixed(1) : "0",
    })).sort((a, b) => b.total - a.total),
    byMonth: Object.entries(byMonth).map(([month, total]) => ({
      month,
      total,
    })).sort((a, b) => a.month.localeCompare(b.month)),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate Income report
 */
function generateIncomeReport(transactions: Transaction[], startDate: string, endDate: string) {
  const income = transactions.filter(tx => tx.type === "income");
  const bySource: Record<string, { total: number; count: number }> = {};
  const byMonth: Record<string, number> = {};

  for (const tx of income) {
    const source = tx.category || tx.description.substring(0, 30) || "Other Income";
    const month = tx.date.substring(0, 7);

    if (!bySource[source]) {
      bySource[source] = { total: 0, count: 0 };
    }
    bySource[source].total += tx.amount;
    bySource[source].count += 1;

    byMonth[month] = (byMonth[month] || 0) + tx.amount;
  }

  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    reportType: "Income Report",
    period: { startDate, endDate },
    totalIncome,
    transactionCount: income.length,
    bySource: Object.entries(bySource).map(([name, data]) => ({
      source: name,
      total: data.total,
      count: data.count,
      percentage: totalIncome > 0 ? (data.total / totalIncome * 100).toFixed(1) : "0",
    })).sort((a, b) => b.total - a.total),
    byMonth: Object.entries(byMonth).map(([month, total]) => ({
      month,
      total,
    })).sort((a, b) => a.month.localeCompare(b.month)),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Convert report data to CSV format
 */
function toCSV(report: any): string {
  const lines: string[] = [];
  
  lines.push(`Report Type,${report.reportType}`);
  lines.push(`Generated,${report.generatedAt}`);
  lines.push("");
  
  if (report.period) {
    lines.push(`Period,${report.period.startDate} to ${report.period.endDate}`);
  }
  if (report.taxYear) {
    lines.push(`Tax Year,${report.taxYear}`);
  }
  lines.push("");

  // Add category data
  if (report.byCategory) {
    lines.push("Category,Total,Count,Percentage");
    for (const cat of report.byCategory) {
      lines.push(`"${cat.category}",${cat.total},${cat.count},${cat.percentage}%`);
    }
  }

  if (report.income?.byCategory) {
    lines.push("Income by Category");
    lines.push("Category,Amount");
    for (const [cat, amount] of Object.entries(report.income.byCategory)) {
      lines.push(`"${cat}",${amount}`);
    }
    lines.push(`Total Income,${report.income.total}`);
    lines.push("");
  }

  if (report.expenses?.byCategory) {
    lines.push("Expenses by Category");
    lines.push("Category,Amount");
    for (const [cat, amount] of Object.entries(report.expenses.byCategory)) {
      lines.push(`"${cat}",${amount}`);
    }
    lines.push(`Total Expenses,${report.expenses.total}`);
    lines.push("");
  }

  if (report.netIncome !== undefined) {
    lines.push(`Net Income,${report.netIncome}`);
  }
  if (report.netTaxableIncome !== undefined) {
    lines.push(`Net Taxable Income,${report.netTaxableIncome}`);
  }

  return lines.join("\n");
}

// Main request handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const body: ReportRequest = await req.json();
    const { 
      type, 
      startDate, 
      endDate, 
      companyId, 
      year = new Date().getFullYear(),
      format = "json" 
    } = body;

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, error: "Report type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range
    const effectiveStartDate = startDate || `${year}-01-01`;
    const effectiveEndDate = endDate || `${year}-12-31`;

    // Fetch transactions
    let query = supabase
      .from("transactions")
      .select("*")
      .gte("date", effectiveStartDate)
      .lte("date", effectiveEndDate)
      .order("date", { ascending: true });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    // Generate report based on type
    let report: any;

    switch (type) {
      case "profit-loss":
        report = generateProfitLossReport(transactions || [], effectiveStartDate, effectiveEndDate);
        break;
      case "tax-summary":
        report = generateTaxSummaryReport(transactions || [], year);
        break;
      case "expense":
        report = generateExpenseReport(transactions || [], effectiveStartDate, effectiveEndDate);
        break;
      case "income":
        report = generateIncomeReport(transactions || [], effectiveStartDate, effectiveEndDate);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown report type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Return in requested format
    if (format === "csv") {
      const csv = toCSV(report);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-report-${effectiveStartDate}-to-${effectiveEndDate}.csv"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Report generation error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
