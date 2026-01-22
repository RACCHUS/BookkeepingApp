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
  type: "income" | "expense" | "transfer";
  category: string;
  company_id?: string;
}

/**
 * Generate Profit & Loss report
 * NOTE: Transfer/neutral transactions are excluded from income/expense totals
 * but tracked separately for transparency
 */
function generateProfitLossReport(transactions: Transaction[], startDate: string, endDate: string) {
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const transferByCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfers = 0;

  for (const tx of transactions) {
    const category = tx.category || "Uncategorized";
    
    if (tx.type === "transfer") {
      // Neutral transactions - track separately, don't include in P&L
      transferByCategory[category] = (transferByCategory[category] || 0) + Math.abs(tx.amount);
      totalTransfers += Math.abs(tx.amount);
    } else if (tx.type === "income") {
      incomeByCategory[category] = (incomeByCategory[category] || 0) + tx.amount;
      totalIncome += tx.amount;
    } else {
      // Expense - includes Owner Draws which are tracked for tax purposes
      expenseByCategory[category] = (expenseByCategory[category] || 0) + Math.abs(tx.amount);
      totalExpenses += Math.abs(tx.amount);
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
    // Transfers are tracked separately (owner contributions, loans, etc.)
    transfers: {
      byCategory: transferByCategory,
      total: totalTransfers,
      note: "Neutral transactions (owner contributions, transfers) - not included in P&L calculations",
    },
    netIncome: totalIncome - totalExpenses,
    transactionCount: transactions.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate Tax Summary report (IRS categories)
 * NOTE: Transfer/neutral transactions are excluded from tax calculations
 * Owner Draws are tracked separately (not deductible but reportable)
 */
function generateTaxSummaryReport(transactions: Transaction[], year: number) {
  // IRS Schedule C deductible categories - MUST match shared/constants/categories.js
  const deductibleCategories = [
    // Schedule C Lines 8-27
    "Advertising",
    "Car and Truck Expenses",
    "Commissions and Fees",
    "Contract Labor",
    "Depletion",
    "Depreciation and Section 179",
    "Employee Benefit Programs",
    "Insurance (Other than Health)",
    "Interest (Mortgage)",
    "Interest (Other)",
    "Legal and Professional Services",
    "Office Expenses",
    "Pension and Profit-Sharing Plans",
    "Rent or Lease (Vehicles, Machinery, Equipment)",
    "Rent or Lease (Other Business Property)",
    "Repairs and Maintenance",
    "Supplies (Not Inventory)",
    "Taxes and Licenses",
    "Travel",
    "Meals",
    "Utilities",
    "Wages (Less Employment Credits)",
    "Other Expenses",
    // Cost of Goods Sold
    "Cost of Goods Sold",
    "Beginning Inventory",
    "Inventory Purchases",
    "Cost of Labor (not wages)",
    "Materials and Supplies",
    "Other Costs (shipping, packaging)",
    "Ending Inventory",
    // Other Line 27 Expenses
    "Software Subscriptions",
    "Web Hosting & Domains",
    "Bank Fees",
    "Bad Debts",
    "Dues & Memberships",
    "Training & Education",
    "Trade Publications",
    "Security Services",
    "Business Gifts",
    "Uniforms & Safety Gear",
    "Tools (Under $2,500)",
    "Business Use of Home",
  ];

  const categoryTotals: Record<string, number> = {};
  let totalDeductible = 0;
  let totalIncome = 0;
  let totalOwnerDraws = 0;
  let totalTransfers = 0;

  for (const tx of transactions) {
    const category = tx.category || "Uncategorized";
    
    // Skip neutral/transfer transactions from tax calculations
    if (tx.type === "transfer") {
      totalTransfers += Math.abs(tx.amount);
      continue;
    }
    
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (category === "Owner Draws/Distributions" || category === "Owner Draw/Distribution") {
      // Owner draws are tracked separately - not deductible but important for tax records
      totalOwnerDraws += Math.abs(tx.amount);
    } else if (deductibleCategories.includes(category)) {
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(tx.amount);
      totalDeductible += Math.abs(tx.amount);
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
    ownerDraws: {
      total: totalOwnerDraws,
      note: "Owner draws/distributions - not deductible but tracked for tax records",
    },
    transfers: {
      total: totalTransfers,
      note: "Neutral transactions (owner contributions, transfers) - excluded from tax calculations",
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
 * NOTE: Transfer/neutral transactions are excluded from expense totals
 */
function generateExpenseReport(transactions: Transaction[], startDate: string, endDate: string) {
  // Filter out transfer/neutral transactions - they're not expenses
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
 * NOTE: Transfer/neutral transactions are excluded - they're not income
 */
function generateIncomeReport(transactions: Transaction[], startDate: string, endDate: string) {
  // Filter out transfer/neutral transactions - they're not income
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
