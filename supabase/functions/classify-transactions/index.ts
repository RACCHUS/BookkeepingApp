// Supabase Edge Function for Transaction Classification
// Uses Google Gemini API (Free Tier) to classify bank transactions
// into IRS Schedule C tax categories

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gemini API configuration (Free Tier limits)
// Using gemini-2.5-flash - best price-performance model (as of Jan 2026)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_BATCH_SIZE = 100; // With optimized prompt, can handle more transactions
const RATE_LIMIT_DELAY = 4000; // 4 seconds between batches (15 RPM = 4s)

// IRS Schedule C Categories - MUST match shared/constants/categories.js EXACTLY
const IRS_CATEGORIES = [
  // === BUSINESS INCOME ===
  "Gross Receipts or Sales",
  "Returns and Allowances",
  "Other Income",
  
  // === COST OF GOODS SOLD ===
  "Cost of Goods Sold",
  "Beginning Inventory",
  "Inventory Purchases",
  "Cost of Labor (not wages)",
  "Materials and Supplies",
  "Other Costs (shipping, packaging)",
  "Ending Inventory",
  
  // === SCHEDULE C EXPENSES (Lines 8-27) ===
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
  
  // === OTHER LINE 27 EXPENSES ===
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
  "Depreciation Detail",
  "Vehicle Detail",
  
  // === PERSONAL (Non-Deductible but tracked) ===
  "Personal Expense",
  "Personal Transfer",
  "Owner Draws/Distributions",  // EXPENSE - tracked for tax purposes, NOT neutral
  "Owner Contribution/Capital",
  "Uncategorized",
  "Split Transaction",
  
  // === NEUTRAL CATEGORIES (type='transfer') ===
  // NOTE: Owner Draws is NOT here - it's an expense category
  "Owner Contribution/Capital",
  "Transfer Between Accounts",
  "Loan Received",
  "Loan Payment (Principal)",
  "Refund Received",
  "Refund Issued",
  "Security Deposit",
  "Security Deposit Return",
  "Escrow Deposit",
  "Escrow Release",
  "Credit Card Payment",
  "Sales Tax Collected",
  "Sales Tax Payment",
  "Payroll Tax Deposit",
  "Reimbursement Received",
  "Reimbursement Paid",
  "Personal Funds Added",
  "Personal Funds Withdrawn",
  "Opening Balance",
  "Balance Adjustment",
];

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type?: string;
}

interface ClassificationResult {
  id: string;
  category: string | null;
  subcategory: string | null;
  vendor: string | null;
  confidence: number;
  reasoning?: string;
}

interface RequestBody {
  transactions: Transaction[];
  userId: string;
}

/**
 * Build the Gemini prompt for transaction classification
 */
function buildClassificationPrompt(transactions: Transaction[]): string {
  // Compact transaction format: id|description|amount|type
  // Use full description - do not truncate
  const transactionLines = transactions.map(t => 
    `${t.id}|${(t.description || '').trim()}|${t.amount}|${t.type || (t.amount > 0 ? 'CREDIT' : 'DEBIT')}`
  ).join("\n");

  return `You are a bookkeeping AI that classifies bank transactions for a small business (HVAC/AC service company).

IMPORTANT: Read the FULL description carefully. Look for specific keywords that indicate the transaction type.

EXPENSE CATEGORIES (ONLY for DEBIT/negative amounts) - use EXACT names:
- Schedule C Lines 8-27: Advertising, Car and Truck Expenses, Commissions and Fees, Contract Labor, Depletion, Depreciation and Section 179, Employee Benefit Programs, Insurance (Other than Health), Interest (Mortgage), Interest (Other), Legal and Professional Services, Office Expenses, Pension and Profit-Sharing Plans, Rent or Lease (Vehicles, Machinery, Equipment), Rent or Lease (Other Business Property), Repairs and Maintenance, Supplies (Not Inventory), Taxes and Licenses, Travel, Meals, Utilities, Wages (Less Employment Credits), Other Expenses
- Cost of Goods Sold: Cost of Goods Sold, Beginning Inventory, Inventory Purchases, Materials and Supplies, Cost of Labor (not wages), Other Costs (shipping, packaging), Ending Inventory
- Other Line 27: Software Subscriptions, Web Hosting & Domains, Bank Fees, Bad Debts, Dues & Memberships, Training & Education, Trade Publications, Security Services, Business Gifts, Uniforms & Safety Gear, Tools (Under $2,500)
- Special: Business Use of Home, Personal Expense, Personal Transfer, Depreciation Detail, Vehicle Detail
- Owner Draws: Owner Draws/Distributions (EXPENSE - tracked for tax purposes, money owner takes out)

INCOME CATEGORIES (for CREDIT/positive business revenue) - use EXACT names:
Gross Receipts or Sales, Returns and Allowances, Other Income

NEUTRAL CATEGORIES (type='transfer' - NOT income or expense) - use EXACT names:
- Owner Contribution/Capital (owner depositing personal funds INTO business)
- Transfer Between Accounts (moving money between business accounts)
- Loan Received (borrowed money is NOT income)
- Loan Payment (Principal) (paying back loan principal)
- Refund Received (return of money previously spent)
- Refund Issued (returning money to customer)
- Credit Card Payment (paying credit card bill - NOT the same as Bank Fees)
- Sales Tax Collected, Sales Tax Payment
- Reimbursement Received, Reimbursement Paid
- Personal Funds Added, Personal Funds Withdrawn
- Opening Balance, Balance Adjustment

STRICT CLASSIFICATION RULES:
1. FIRST check the transaction type/amount: DEBIT or amount<0 = EXPENSE. CREDIT or amount>0 = INCOME or NEUTRAL.
2. DEBIT transactions should ONLY use EXPENSE categories (including Owner Draws/Distributions).
3. CREDIT transactions can be INCOME or NEUTRAL - determine based on source.

VEHICLE & AUTO LOANS (Important - read full description!):
4. "AUTO", "AUTO FINANCE", "AUTO LOAN", "CAR PAYMENT", "VEHICLE LOAN" = Car and Truck Expenses (even if bank name like "Capital One Auto")
5. Auto insurance (GEICO, Progressive, State Farm, Allstate + "auto") = Insurance (Other than Health)
6. GAS STATIONS (Wawa, Speedway, Sunoco, Shell, BP, Exxon, RaceTrac, Cumberland, Marathon, Citgo, Valero, 7-Eleven, etc.): <$15 = Meals, >=$15 = Car and Truck Expenses
7. Auto parts, tires, oil change, car wash = Car and Truck Expenses
8. FLORIDA GAS STATIONS: Descriptions with "[NAME] [NUMBER] [CITY] FL" or "[ADDRESS] [CITY] FL [ID]" patterns are gas stations. Examples: "SUNSHINE 63 SUNRISE FL", "2185 N UNIVERSITY SUNRISE FL", "MICHELLE FUEL PO SUNRISE FL" = Gas Stations (use <$15/$15+ rule)

BANK TRANSACTIONS (distinguish by context):
9. "SERVICE FEE", "MONTHLY FEE", "OVERDRAFT", "NSF FEE", "WIRE FEE" = Bank Fees
10. Credit card PAYMENT (paying your card balance) = Credit Card Payment (NEUTRAL)
11. Bank to bank transfers = Transfer Between Accounts (NEUTRAL)
12. Only use Bank Fees for actual fees charged BY the bank, not for payments TO financial institutions

DEPOSITS & INCOME:
13. ATM CASH DEPOSIT = Owner Contribution/Capital (NOT income) - NEUTRAL
14. TRANSFER FROM another account = Owner Contribution/Capital or Transfer Between Accounts - NEUTRAL
15. ACH/wire from COMPANIES (property managers, clients, businesses) = Gross Receipts or Sales
16. CHECK DEPOSIT, REMOTE DEPOSIT = Gross Receipts or Sales (customer payment)
17. Generic DEPOSIT without company name = Owner Contribution/Capital - NEUTRAL

OTHER:
18. ATM WITHDRAWAL = Owner Draws/Distributions (EXPENSE)
19. Restaurants, fast food, TST* (Toast POS) = Meals
20. Hardware stores (Home Depot, Lowe's, AC Supply, Gemaire) = Materials and Supplies
21. Travel is ONLY for hotels, flights, lodging - NOT gas stations
22. Amazon, Walmart can be Office Expenses, Supplies, or Materials depending on context

TRANSACTIONS TO CLASSIFY (id|description|amount|type):
${transactionLines}

RESPOND WITH ONLY A JSON ARRAY. NO MARKDOWN. NO EXPLANATIONS. NO TEXT BEFORE OR AFTER.
Format: [{"id":"...","category":"...","subcategory":"specific type or null","vendor":"extracted name","confidence":0.9}]`;
}

/**
 * Call Gemini API to classify transactions
 */
async function callGeminiAPI(transactions: Transaction[], apiKey: string): Promise<ClassificationResult[]> {
  const prompt = buildClassificationPrompt(transactions);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent categorization
        maxOutputTokens: 16384, // Increased for larger batches (200 transactions)
        responseMimeType: "application/json", // Request JSON directly
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Log full response for debugging
  console.log("Gemini raw response:", JSON.stringify(data, null, 2));
  
  // Extract text from Gemini response
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    console.error("No text content in Gemini response:", JSON.stringify(data));
    throw new Error("No content in Gemini response");
  }

  console.log("Gemini text content (first 1000 chars):", textContent.substring(0, 1000));

  // Parse JSON from response (handle markdown code blocks if present)
  let jsonStr = textContent.trim();
  
  // Remove markdown code blocks - handle both complete and truncated responses
  // First try: match complete code block
  let jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else if (jsonStr.startsWith("```")) {
    // Handle truncated response - starts with ``` but no closing
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").trim();
  }
  
  // If still not valid JSON array, try to extract it
  if (!jsonStr.startsWith("[")) {
    const arrayStart = jsonStr.indexOf("[");
    if (arrayStart !== -1) {
      jsonStr = jsonStr.substring(arrayStart);
    }
  }
  
  // If JSON array is incomplete (truncated), try to fix it
  if (jsonStr.startsWith("[") && !jsonStr.endsWith("]")) {
    // Find last complete object
    const lastCompleteObjEnd = jsonStr.lastIndexOf("},");
    if (lastCompleteObjEnd !== -1) {
      jsonStr = jsonStr.substring(0, lastCompleteObjEnd + 1) + "]";
      console.log("Fixed truncated JSON - recovered partial results");
    } else {
      // Try finding just a single complete object
      const lastObjEnd = jsonStr.lastIndexOf("}");
      if (lastObjEnd !== -1 && lastObjEnd > jsonStr.indexOf("{")) {
        jsonStr = jsonStr.substring(0, lastObjEnd + 1) + "]";
        console.log("Fixed truncated JSON - recovered single result");
      }
    }
  }
  
  console.log("Parsed JSON string (first 500 chars):", jsonStr.substring(0, 500));

  try {
    const results: ClassificationResult[] = JSON.parse(jsonStr);
    
    // Validate and sanitize results
    return results.map(r => ({
      id: r.id,
      category: IRS_CATEGORIES.includes(r.category) ? r.category : null,
      subcategory: r.subcategory || null,
      vendor: r.vendor || null,
      confidence: Math.min(Math.max(r.confidence || 0.5, 0), 1),
      reasoning: r.reasoning,
    }));
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", jsonStr, parseError);
    throw new Error("Failed to parse Gemini classification response");
  }
}

/**
 * Process transactions in batches with rate limiting
 */
async function processBatches(
  transactions: Transaction[],
  apiKey: string
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  
  // Split into batches
  for (let i = 0; i < transactions.length; i += MAX_BATCH_SIZE) {
    const batch = transactions.slice(i, i + MAX_BATCH_SIZE);
    
    try {
      const batchResults = await callGeminiAPI(batch, apiKey);
      results.push(...batchResults);
      
      // Rate limit delay between batches (not after last batch)
      if (i + MAX_BATCH_SIZE < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (error) {
      console.error(`Batch ${Math.floor(i / MAX_BATCH_SIZE) + 1} failed:`, error);
      
      // Add failed transactions with null classification
      for (const t of batch) {
        results.push({
          id: t.id,
          category: null,
          subcategory: null,
          vendor: null,
          confidence: 0,
          reasoning: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  }
  
  return results;
}

/**
 * Log usage for monitoring (stored in Supabase for analytics)
 */
async function logUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transactionCount: number,
  successCount: number
): Promise<void> {
  try {
    await supabase.from("classification_usage_logs").insert({
      user_id: userId,
      transaction_count: transactionCount,
      success_count: successCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical, just log
    console.error("Failed to log usage:", error);
  }
}

// Main Edge Function handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: RequestBody = await req.json();
    const { transactions, userId } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transactions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Classifying ${transactions.length} transactions for user ${userId}`);

    // Process transactions
    const results = await processBatches(transactions, geminiApiKey);
    
    // Count successes
    const successCount = results.filter(r => r.category !== null).length;

    // Log usage (non-blocking)
    logUsage(supabase, userId, transactions.length, successCount);

    console.log(`Classification complete: ${successCount}/${transactions.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        stats: {
          total: transactions.length,
          classified: successCount,
          failed: transactions.length - successCount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Classification function error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
