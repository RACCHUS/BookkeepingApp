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
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const MAX_BATCH_SIZE = 200; // Process up to 200 transactions per batch (safe within 32K token limit)
const RATE_LIMIT_DELAY = 4000; // 4 seconds between batches (15 RPM = 4s)

// IRS Schedule C Categories for classification
const IRS_CATEGORIES = [
  "ADVERTISING",
  "CAR_TRUCK_EXPENSES",
  "COMMISSIONS_FEES",
  "CONTRACT_LABOR",
  "DEPLETION",
  "DEPRECIATION",
  "EMPLOYEE_BENEFIT_PROGRAMS",
  "INSURANCE_OTHER",
  "INTEREST_MORTGAGE",
  "INTEREST_OTHER",
  "LEGAL_PROFESSIONAL",
  "OFFICE_EXPENSES",
  "PENSION_PROFIT_SHARING",
  "RENT_LEASE_VEHICLES",
  "RENT_LEASE_EQUIPMENT",
  "RENT_LEASE_PROPERTY",
  "REPAIRS_MAINTENANCE",
  "SUPPLIES",
  "TAXES_LICENSES",
  "TRAVEL",
  "MEALS",
  "UTILITIES",
  "WAGES",
  "OTHER_EXPENSES",
  "GROSS_RECEIPTS",
  "RETURNS_ALLOWANCES",
  "COST_OF_GOODS_SOLD",
  // Non-deductible categories
  "PERSONAL_EXPENSE",
  "PERSONAL_TRANSFER",
  "OWNER_DRAWS",
  // Extended categories
  "MATERIALS_SUPPLIES",
  "SOFTWARE_SUBSCRIPTIONS",
  "WEB_HOSTING",
  "BANK_FEES",
  "TRAINING_EDUCATION",
  "DUES_MEMBERSHIPS",
  "TOOLS_EQUIPMENT",
];

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
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
  const categoryList = IRS_CATEGORIES.join(", ");
  
  const transactionLines = transactions.map((t, i) => 
    `${i + 1}. ID: ${t.id} | Description: "${t.description}" | Amount: $${Math.abs(t.amount).toFixed(2)} | Date: ${t.date}`
  ).join("\n");

  return `You are a bookkeeping assistant that classifies bank transactions into IRS Schedule C categories for small business tax purposes.

IMPORTANT RULES:
1. Only use categories from this exact list: ${categoryList}
2. Be conservative - if unsure, use "OTHER_EXPENSES" for business expenses or "PERSONAL_EXPENSE" if likely personal
3. Extract the vendor/merchant name from the description
4. Consider the amount when classifying (small amounts at restaurants = MEALS, large amounts at restaurants = possibly catering/OTHER_EXPENSES)
5. Common patterns:
   - Gas stations → CAR_TRUCK_EXPENSES
   - Software (Adobe, Microsoft, etc.) → SOFTWARE_SUBSCRIPTIONS
   - Office supplies stores → OFFICE_EXPENSES
   - Hardware stores → MATERIALS_SUPPLIES or REPAIRS_MAINTENANCE
   - Shipping (UPS, FedEx) → OTHER_EXPENSES (shipping)
   - ATM/Cash withdrawals → OWNER_DRAWS
   - Transfers between accounts → PERSONAL_TRANSFER

Classify these transactions. For each, provide:
- category: The IRS category (must be from the list above)
- subcategory: A more specific description (can be null)
- vendor: The merchant/vendor name extracted from description
- confidence: 0.0 to 1.0 (how confident you are)
- reasoning: Brief explanation (one sentence)

TRANSACTIONS:
${transactionLines}

Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON:
[
  {"id": "transaction_id", "category": "CATEGORY_NAME", "subcategory": "optional", "vendor": "Vendor Name", "confidence": 0.85, "reasoning": "Brief explanation"}
]`;
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
        maxOutputTokens: 4096,
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
  
  // Extract text from Gemini response
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    console.error("No text content in Gemini response:", data);
    throw new Error("No content in Gemini response");
  }

  // Parse JSON from response (handle markdown code blocks if present)
  let jsonStr = textContent.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

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
