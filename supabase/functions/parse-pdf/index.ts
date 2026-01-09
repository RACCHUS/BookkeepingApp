// Supabase Edge Function for PDF Parsing
// Extracts text and transactions from bank statement PDFs
// Uses pdf-lib for PDF text extraction (Deno-compatible)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  checkNumber?: string;
}

interface ParseResult {
  success: boolean;
  transactions: Transaction[];
  bank: string;
  rawText?: string;
  uploadId?: string;
  error?: string;
}

/**
 * Detect bank from PDF text content
 */
function detectBank(text: string): string {
  const textLower = text.toLowerCase();
  
  if (textLower.includes("chase") || textLower.includes("jpmorgan")) {
    return "Chase";
  }
  if (textLower.includes("bank of america")) {
    return "Bank of America";
  }
  if (textLower.includes("wells fargo")) {
    return "Wells Fargo";
  }
  if (textLower.includes("capital one")) {
    return "Capital One";
  }
  if (textLower.includes("citibank") || textLower.includes("citi")) {
    return "Citibank";
  }
  if (textLower.includes("us bank") || textLower.includes("u.s. bank")) {
    return "US Bank";
  }
  if (textLower.includes("pnc")) {
    return "PNC";
  }
  
  return "Unknown";
}

/**
 * Parse Chase bank statement format
 */
function parseChaseTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split("\n");
  const currentYear = new Date().getFullYear();
  
  // Chase pattern: MM/DD followed by description and amount
  const datePattern = /^(\d{1,2})\/(\d{1,2})\s+(.+?)\s+(-?[\d,]+\.\d{2})$/;
  const altPattern = /(\d{1,2}\/\d{1,2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})/g;
  
  for (const line of lines) {
    const match = line.trim().match(datePattern);
    if (match) {
      const [_, month, day, description, amountStr] = match;
      const date = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
      
      // Skip summary lines
      if (description.includes("ENDING BALANCE") || 
          description.includes("BEGINNING BALANCE") ||
          description.includes("ACCOUNT NUMBER")) {
        continue;
      }
      
      transactions.push({
        date,
        description: description.trim(),
        amount: Math.abs(amount),
        type: amount < 0 ? "expense" : "income",
      });
    }
  }
  
  // If no transactions found with strict pattern, try alternate
  if (transactions.length === 0) {
    let match;
    while ((match = altPattern.exec(text)) !== null) {
      const [_, dateStr, description, amountStr] = match;
      const [month, day] = dateStr.split("/");
      const date = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
      
      if (description.includes("BALANCE") || description.includes("ACCOUNT")) {
        continue;
      }
      
      transactions.push({
        date,
        description: description.trim(),
        amount: Math.abs(amount),
        type: amount < 0 ? "expense" : "income",
      });
    }
  }
  
  return transactions;
}

/**
 * Parse Bank of America statement format
 */
function parseBofATransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const currentYear = new Date().getFullYear();
  
  // BofA pattern: MM/DD/YY Description Amount
  const pattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [_, dateStr, description, amountStr] = match;
    const dateParts = dateStr.split("/");
    const month = dateParts[0];
    const day = dateParts[1];
    const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
    
    const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
    
    transactions.push({
      date,
      description: description.trim(),
      amount: Math.abs(amount),
      type: amount < 0 ? "expense" : "income",
    });
  }
  
  return transactions;
}

/**
 * Generic transaction parser for unknown bank formats
 */
function parseGenericTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const currentYear = new Date().getFullYear();
  
  // Try various date-amount patterns
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/?\d{0,4})\s+(.+?)\s+\$?(-?[\d,]+\.\d{2})/g,
    /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+\$?(-?[\d,]+\.\d{2})/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [_, dateStr, description, amountStr] = match;
      
      let date = dateStr;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        const month = parts[0].padStart(2, "0");
        const day = parts[1].padStart(2, "0");
        const year = parts[2] || String(currentYear);
        date = `${year.length === 2 ? "20" + year : year}-${month}-${day}`;
      }
      
      const amount = parseFloat(amountStr.replace(/[$,]/g, ""));
      
      transactions.push({
        date,
        description: description.trim().substring(0, 200),
        amount: Math.abs(amount),
        type: amount < 0 ? "expense" : "income",
      });
    }
    
    if (transactions.length > 0) break;
  }
  
  return transactions;
}

/**
 * Extract text from PDF using a simple approach
 * Note: For complex PDFs, consider using external PDF parsing services
 */
async function extractPDFText(buffer: ArrayBuffer): Promise<string> {
  // Convert buffer to Uint8Array for processing
  const bytes = new Uint8Array(buffer);
  
  // Simple PDF text extraction - looks for text streams
  // This works for basic PDFs but may not work for all
  let text = "";
  
  // Try to decode as UTF-8 first to find readable text
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = decoder.decode(bytes);
    
    // Extract text between BT and ET (Begin Text / End Text markers)
    const textMatches = rawText.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
    for (const match of textMatches) {
      // Extract Tj and TJ operators (text showing operators)
      const tjMatches = match[1].matchAll(/\((.*?)\)\s*Tj/g);
      for (const tj of tjMatches) {
        text += tj[1] + " ";
      }
      
      // Handle TJ arrays
      const tjArrayMatches = match[1].matchAll(/\[(.*?)\]\s*TJ/g);
      for (const tja of tjArrayMatches) {
        const items = tja[1].matchAll(/\((.*?)\)/g);
        for (const item of items) {
          text += item[1];
        }
        text += " ";
      }
    }
    
    // Also try to find plain text content
    const plainTextMatches = rawText.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
    for (const match of plainTextMatches) {
      // Try to decode the stream if it contains readable text
      const streamText = match[1].replace(/[^\x20-\x7E\n]/g, " ");
      if (streamText.match(/\d{1,2}\/\d{1,2}/)) {
        text += "\n" + streamText;
      }
    }
  } catch (e) {
    console.error("Text extraction error:", e);
  }
  
  return text.trim();
}

// Main request handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ success: false, error: "File must be a PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    
    // Check file size (max 10MB)
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "File too large (max 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from PDF
    console.log("Extracting text from PDF:", file.name);
    const pdfText = await extractPDFText(buffer);
    
    if (!pdfText || pdfText.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not extract text from PDF. The file may be image-based or encrypted.",
          suggestion: "Try using a PDF with selectable text, or OCR the document first."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect bank
    const bank = detectBank(pdfText);
    console.log("Detected bank:", bank);

    // Parse transactions based on bank
    let transactions: Transaction[];
    
    switch (bank) {
      case "Chase":
        transactions = parseChaseTransactions(pdfText);
        break;
      case "Bank of America":
        transactions = parseBofATransactions(pdfText);
        break;
      default:
        transactions = parseGenericTransactions(pdfText);
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Save upload record to database
    let uploadId: string | undefined;
    
    if (userId) {
      const { data: uploadRecord, error: uploadError } = await supabase
        .from("pdf_uploads")
        .insert({
          user_id: userId,
          company_id: companyId || null,
          file_name: file.name,
          file_size: file.size,
          bank_detected: bank,
          transaction_count: transactions.length,
          status: transactions.length > 0 ? "parsed" : "no_transactions",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (uploadError) {
        console.error("Failed to save upload record:", uploadError);
      } else {
        uploadId = uploadRecord?.id;
      }
    }

    const result: ParseResult = {
      success: true,
      transactions,
      bank,
      uploadId,
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("PDF parsing error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
