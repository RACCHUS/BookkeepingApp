/**
 * Default Vendor Mappings for Transaction Classification
 * 
 * Maps common vendor names/patterns to IRS Schedule C categories.
 * Used as baseline for new users before they build their own rules.
 * 
 * Category keys reference IRS_CATEGORIES in categories.js
 * 
 * ORGANIZED ALPHABETICALLY BY VENDOR KEY FOR EASY LOOKUP
 * 
 * NOTES:
 * - Generic words removed to avoid false matches (e.g., 'SHELL', 'DELTA', 'ZOOM')
 * - Personal expense vendors removed (Netflix, gyms) - could be business for some users
 * - Ambiguous retailers removed (Amazon, Walmart, Target) - let Gemini/user decide
 */

export const DEFAULT_VENDORS = {
  // ===== # =====
  '7-ELEVEN': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: '7-Eleven' },
  '7 ELEVEN': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: '7-Eleven' },
  '24 HOUR FITNESS': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: '24 Hour Fitness' },
  '84 LUMBER': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: '84 Lumber' },
  
  // ===== A =====
  'ACE HARDWARE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Ace Hardware' },
  'ADOBE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Adobe' },
  'ADVANCE AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Advance Auto Parts' },
  'AETNA': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Aetna' },
  'AIRBNB': { category: 'TRAVEL', subcategory: null, vendor: 'Airbnb' },
  'ALLSTATE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Allstate' },
  // Auto finance companies - MUST be before generic bank entries
  'ALLY AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Ally Auto Finance' },
  'ALLY FINANCIAL AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Ally Auto Finance' },
  'ALLY BANK AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Ally Auto Finance' },
  'AMAZON PRIME': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: 'Amazon Prime' },
  'AMAZON WEB': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Amazon Web Services' },
  'AMERICAN AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'American Airlines' },
  "APPLEBEE'S": { category: 'MEALS', subcategory: null, vendor: "Applebee's" },
  'APPLEBEES': { category: 'MEALS', subcategory: null, vendor: "Applebee's" },
  'APPLE.COM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Apple' },
  'ARCO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'ARCO' },
  'ASANA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Asana' },
  'AT&T': { category: 'UTILITIES', subcategory: null, vendor: 'AT&T' },
  'ATLASSIAN': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Atlassian' },
  'ATM CASH': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'ATM Withdrawal' },
  'ATM FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'ATM WITHDRAWAL': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'ATM Withdrawal' },
  'ATT': { category: 'UTILITIES', subcategory: null, vendor: 'AT&T' },
  'AUTHORIZE.NET': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Authorize.net' },
  'AUTOZONE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'AutoZone' },
  'AWS': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Amazon Web Services' },
  
  // ===== B =====
  'BANK OF AMERICA': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank of America' },
  'BENJAMIN MOORE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Benjamin Moore' },
  'BEST BUY': { category: 'SUPPLIES', subcategory: null, vendor: 'Best Buy' },
  'BEST WESTERN': { category: 'TRAVEL', subcategory: null, vendor: 'Best Western' },
  'BESTBUY': { category: 'SUPPLIES', subcategory: null, vendor: 'Best Buy' },
  "BJ'S": { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "BJ's" },
  'BJS': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "BJ's" },
  'BLUE CROSS': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Blue Cross' },
  'BLUEHOST': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Bluehost' },
  'BOOKING.COM': { category: 'TRAVEL', subcategory: null, vendor: 'Booking.com' },
  'BP': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'BP' },
  'BRAINTREE': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Braintree' },
  'BUDGET RENT': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Budget' },
  'BURGER KING': { category: 'MEALS', subcategory: null, vendor: 'Burger King' },
  
  // ===== C =====
  // CHECK patterns - expenses (negative) = payments made, income (positive) = deposits received
  // Note: Classification service checks amount direction, so expense categories only match negative amounts
  'CHECK': { category: 'Other Expenses', subcategory: null, vendor: 'Check Payment' },
  'CHECK #': { category: 'Other Expenses', subcategory: null, vendor: 'Check Payment' },
  'CHECK DEPOSIT': { category: 'Gross Receipts or Sales', subcategory: null, vendor: 'Check Deposit' },
  'REMOTE DEPOSIT': { category: 'Gross Receipts or Sales', subcategory: null, vendor: 'Check Deposit' },
  'MOBILE DEPOSIT': { category: 'Gross Receipts or Sales', subcategory: null, vendor: 'Check Deposit' },
  'CALENDLY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Calendly' },
  'CANVA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Canva' },
  // Capital One - specific products FIRST (more specific match wins)
  'CAPITAL ONE AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Capital One Auto Finance' },
  'CAPITAL ONE AUTO FINANCE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Capital One Auto Finance' },
  'CAPITALONE AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Capital One Auto Finance' },
  'CAP ONE AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Capital One Auto Finance' },
  // Capital One generic (credit card fees, bank fees)
  'CAPITAL ONE': { category: 'BANK_FEES', subcategory: null, vendor: 'Capital One' },
  'CAPITAL ONE CARD': { category: 'CREDIT_CARD_PAYMENT', subcategory: null, vendor: 'Capital One' },
  'CASH WITHDRAWAL': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'Cash Withdrawal' },
  'CENTURYLINK': { category: 'UTILITIES', subcategory: null, vendor: 'CenturyLink' },
  'CHASE BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'Chase' },
  'CHASE FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Chase' },
  'CHATGPT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'OpenAI' },
  'CHEVRON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Chevron' },
  'CHICK-FIL-A': { category: 'MEALS', subcategory: null, vendor: 'Chick-fil-A' },
  'CHICKFILA': { category: 'MEALS', subcategory: null, vendor: 'Chick-fil-A' },
  "CHILI'S": { category: 'MEALS', subcategory: null, vendor: "Chili's" },
  'CHILIS': { category: 'MEALS', subcategory: null, vendor: "Chili's" },
  'CHIPOTLE': { category: 'MEALS', subcategory: null, vendor: 'Chipotle' },
  'CIGNA': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Cigna' },
  'CITI': { category: 'BANK_FEES', subcategory: null, vendor: 'Citi' },
  'CITIBANK': { category: 'BANK_FEES', subcategory: null, vendor: 'Citi' },
  'CITGO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Citgo' },
  'CITY OF': { category: 'UTILITIES', subcategory: null, vendor: 'City Utilities' },
  'CLOUDFLARE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Cloudflare' },
  'CLOVER NETWORK': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Clover' },
  'CLOVER.COM': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Clover' },
  'COMCAST': { category: 'UTILITIES', subcategory: null, vendor: 'Comcast' },
  'CON EDISON': { category: 'UTILITIES', subcategory: null, vendor: 'Con Edison' },
  'CONEDISON': { category: 'UTILITIES', subcategory: null, vendor: 'Con Edison' },
  'CONOCO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Conoco' },
  'CONSTANT CONTACT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Constant Contact' },
  'COSTCO': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: 'Costco' },
  'COURSERA': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Coursera' },
  'COX COMM': { category: 'UTILITIES', subcategory: null, vendor: 'Cox' },
  
  // ===== D =====
  'DELTA AIR': { category: 'TRAVEL', subcategory: null, vendor: 'Delta Airlines' },
  'DELTA AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'Delta Airlines' },
  'DHL': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'DHL' },
  'DIGITALOCEAN': { category: 'WEB_HOSTING', subcategory: null, vendor: 'DigitalOcean' },
  'DISCOUNT TIRE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Discount Tire' },
  'DOCUSIGN': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'DocuSign' },
  "DOMINO'S": { category: 'MEALS', subcategory: null, vendor: "Domino's" },
  'DOMINOS': { category: 'MEALS', subcategory: null, vendor: "Domino's" },
  'DOORDASH': { category: 'MEALS', subcategory: null, vendor: 'DoorDash' },
  'DROPBOX': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Dropbox' },
  'DUKE ENERGY': { category: 'UTILITIES', subcategory: null, vendor: 'Duke Energy' },
  'DUNKIN': { category: 'MEALS', subcategory: null, vendor: "Dunkin'" },
  
  // ===== E =====
  'E-PASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'E-Pass' },
  'E-ZPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'EZPass' },
  'ENTERPRISE': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Enterprise' },
  'EPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'E-Pass' },
  'EXPEDIA': { category: 'TRAVEL', subcategory: null, vendor: 'Expedia' },
  'EXXON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Exxon' },
  'EXXONMOBIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'ExxonMobil' },
  'EZPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'EZPass' },
  
  // ===== F =====
  'FACEBOOK ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FACEBK': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FARMERS': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Farmers' },
  'FASTENAL': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Fastenal' },
  'FASTRAK': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'FasTrak' },
  'FB *': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FB ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FED EX': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'FedEx' },
  'FED EX OFFICE': { category: 'OFFICE_EXPENSES', subcategory: 'Printer Paper & Ink', vendor: 'FedEx Office' },
  'FEDEX': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'FedEx' },
  'FEDEX OFFICE': { category: 'OFFICE_EXPENSES', subcategory: 'Printer Paper & Ink', vendor: 'FedEx Office' },
  'FERGUSON': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Ferguson' },
  'FINANCE CHARGE': { category: 'INTEREST_OTHER', subcategory: 'Credit Card Interest', vendor: 'Finance Charge' },
  'FIREBASE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Firebase' },
  'FIRESTONE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Firestone' },
  'FIVE GUYS': { category: 'MEALS', subcategory: null, vendor: 'Five Guys' },
  'FLOOR & DECOR': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Floor & Decor' },
  'FLYING J': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Flying J' },
  // Auto finance - Ford
  'FORD MOTOR CREDIT': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Ford Motor Credit' },
  'FORD CREDIT': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Ford Motor Credit' },
  'FPL': { category: 'UTILITIES', subcategory: null, vendor: 'Florida Power & Light' },
  'FRONTIER': { category: 'UTILITIES', subcategory: null, vendor: 'Frontier Communications' },
  'FRONTIER AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'Frontier Airlines' },
  
  // ===== G =====
  'GEICO': { category: 'INSURANCE_OTHER', subcategory: 'Commercial Auto (if not Line 9)', vendor: 'GEICO' },
  'GEORGIA POWER': { category: 'UTILITIES', subcategory: null, vendor: 'Georgia Power' },
  'GITHUB': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'GitHub' },
  'GODADDY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'GoDaddy' },
  'GOOGLE AD': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Google Ads' },
  'GOOGLE ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Google Ads' },
  'GOOGLE WORKSPACE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Google' },
  'GOODYEAR': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Goodyear' },
  'GOSQ.COM': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Square' },
  'GRAINGER': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Grainger' },
  'GRAMMARLY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Grammarly' },
  'GRUBHUB': { category: 'MEALS', subcategory: null, vendor: 'Grubhub' },
  'GULF GAS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Gulf' },
  'GULF OIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Gulf' },
  
  // ===== H =====
  'H&R BLOCK': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'H&R Block' },
  'HAMPTON INN': { category: 'TRAVEL', subcategory: null, vendor: 'Hampton Inn' },
  'HARBOR FREIGHT': { category: 'TOOLS_EQUIPMENT', subcategory: null, vendor: 'Harbor Freight' },
  'HARTFORD': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'The Hartford' },
  'HEROKU': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Heroku' },
  'HERTZ': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Hertz' },
  'HILTON': { category: 'TRAVEL', subcategory: null, vendor: 'Hilton' },
  'HOLIDAY INN': { category: 'TRAVEL', subcategory: null, vendor: 'Holiday Inn' },
  'HOME DEPOT': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Home Depot' },
  'HOMEDEPOT': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Home Depot' },
  // Auto finance - Honda
  'HONDA FINANCIAL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Honda Financial Services' },
  'AMERICAN HONDA FINANCE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Honda Financial Services' },
  'HOSTGATOR': { category: 'WEB_HOSTING', subcategory: null, vendor: 'HostGator' },
  'HOTELS.COM': { category: 'TRAVEL', subcategory: null, vendor: 'Hotels.com' },
  'HUBSPOT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'HubSpot' },
  'HYATT': { category: 'TRAVEL', subcategory: null, vendor: 'Hyatt' },
  
  // ===== I =====
  'IHG': { category: 'TRAVEL', subcategory: null, vendor: 'IHG' },
  'IKEA': { category: 'OFFICE_EXPENSES', subcategory: 'Office Décor', vendor: 'IKEA' },
  'INC FILE': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'IncFile' },
  'INSTAGRAM ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Instagram' },
  'INTEREST CHARGE': { category: 'INTEREST_OTHER', subcategory: 'Credit Card Interest', vendor: 'Interest Charge' },
  'INTUIT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Intuit' },
  'IPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'I-PASS' },
  
  // ===== J =====
  'JETBLUE': { category: 'TRAVEL', subcategory: null, vendor: 'JetBlue' },
  'JIFFY LUBE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Jiffy Lube' },
  'JIRA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Atlassian' },
  'JPMORGAN CHASE': { category: 'BANK_FEES', subcategory: null, vendor: 'Chase' },
  
  // ===== K =====
  'KAYAK': { category: 'TRAVEL', subcategory: null, vendor: 'Kayak' },
  'KFC': { category: 'MEALS', subcategory: null, vendor: 'KFC' },
  
  // ===== L =====
  'LEGALZOOM': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'LegalZoom' },
  'LIBERTY MUTUAL': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Liberty Mutual' },
  'LINKEDIN ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'LinkedIn' },
  'LINKEDIN LEARNING': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'LinkedIn Learning' },
  'LINKEDIN MARKETING': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'LinkedIn' },
  "LOVE'S": { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: "Love's" },
  "LOVE'S TRAVEL": { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: "Love's" },
  'LOVES TRAVEL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: "Love's" },
  "LOWE'S": { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: "Lowe's" },
  'LOWES': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: "Lowe's" },
  'LYFT': { category: 'TRAVEL', subcategory: null, vendor: 'Lyft' },
  
  // ===== M =====
  'MAILCHIMP': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Mailchimp' },
  'MARATHON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Marathon' },
  'MARATHON GAS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Marathon' },
  'MARATHON PETROLEUM': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Marathon' },
  'MARRIOTT': { category: 'TRAVEL', subcategory: null, vendor: 'Marriott' },
  'MASTERCLASS': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'MasterClass' },
  "MCDONALD'S": { category: 'MEALS', subcategory: null, vendor: "McDonald's" },
  'MCDONALDS': { category: 'MEALS', subcategory: null, vendor: "McDonald's" },
  'MENARDS': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Menards' },
  'META ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'META PLATFORMS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'MICROSOFT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Microsoft' },
  'MIDAS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Midas' },
  'MOBIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Mobil' },
  'MONDAY.COM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Monday.com' },
  'MONTHLY SERVICE FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'MOO.COM': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'Moo' },
  'MOOCOM': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'Moo' },
  'MSFT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Microsoft' },
  
  // ===== N =====
  'NAMECHEAP': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Namecheap' },
  'NAPA': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'NAPA' },
  'NATIONWIDE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Nationwide' },
  'NETLIFY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Netlify' },
  'NOLO': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Legal Fees', vendor: 'Nolo' },
  'NORTHERN TOOL': { category: 'TOOLS_EQUIPMENT', subcategory: null, vendor: 'Northern Tool' },
  'NORTHWEST REGISTERED': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'Northwest Registered Agent' },
  'NOTION': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Notion' },
  
  // ===== O =====
  "O'REILLY": { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: "O'Reilly Auto Parts" },
  'OFFICE DEPOT': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'Office Depot' },
  'OFFICE MAX': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'OfficeMax' },
  'OFFICEMAX': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'OfficeMax' },
  'OLIVE GARDEN': { category: 'MEALS', subcategory: null, vendor: 'Olive Garden' },
  'OPENAI': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'OpenAI' },
  'OREILLY': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: "O'Reilly Auto Parts" },
  'OVERDRAFT FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  
  // ===== P =====
  'PACIFIC GAS': { category: 'UTILITIES', subcategory: null, vendor: 'PG&E' },
  'PANDA EXPRESS': { category: 'MEALS', subcategory: null, vendor: 'Panda Express' },
  'PANERA': { category: 'MEALS', subcategory: null, vendor: 'Panera' },
  "PAPA JOHN'S": { category: 'MEALS', subcategory: null, vendor: "Papa John's" },
  'PAPA JOHNS': { category: 'MEALS', subcategory: null, vendor: "Papa John's" },
  'PARK MOBILE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'ParkMobile' },
  'PARKMOBILE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'ParkMobile' },
  'PAYPAL': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'PayPal' },
  'PEACH PASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'Peach Pass' },
  'PENSKE': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Penske' },
  'PETRO STOPPING': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Petro' },
  'PETRO-CANADA': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Petro-Canada' },
  'PG&E': { category: 'UTILITIES', subcategory: null, vendor: 'PG&E' },
  'PHILLIPS 66': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Phillips 66' },
  'PILOT FLYING J': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Pilot' },
  'PILOT TRAVEL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Pilot' },
  'PIRATESHIP': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'Pirate Ship' },
  'PIZZA HUT': { category: 'MEALS', subcategory: null, vendor: 'Pizza Hut' },
  'PLURALSIGHT': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Pluralsight' },
  'PNC': { category: 'BANK_FEES', subcategory: null, vendor: 'PNC' },
  'POPEYES': { category: 'MEALS', subcategory: null, vendor: 'Popeyes' },
  'POSTMATES': { category: 'MEALS', subcategory: null, vendor: 'Postmates' },
  'PROGRESSIVE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Progressive' },
  
  // ===== Q =====
  'QUICKBOOKS': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'QuickBooks' },
  
  // ===== R =====
  'REGIONS BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'Regions' },
  'REGIONS FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Regions' },
  'RENDER': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Render' },
  'ROCKET LAWYER': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Legal Fees', vendor: 'Rocket Lawyer' },
  
  // ===== S =====
  'SALESFORCE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Salesforce' },
  "SAM'S CLUB": { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "Sam's Club" },
  'SAMS CLUB': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "Sam's Club" },
  'SHELL GAS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Shell' },
  'SHELL OIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Shell' },
  'SHELL SERVICE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Shell' },
  'SHERWIN': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Sherwin-Williams' },
  'SHIPSTATION': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'ShipStation' },
  'SHOPIFY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Shopify' },
  'SINCLAIR': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Sinclair' },
  'SITEGROUND': { category: 'WEB_HOSTING', subcategory: null, vendor: 'SiteGround' },
  'SKILLSHARE': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Skillshare' },
  'SLACK TECHNOLOGIES': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Slack' },
  'SLACK.COM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Slack' },
  'SOUTHERN CALIFORNIA EDISON': { category: 'UTILITIES', subcategory: null, vendor: 'SCE' },
  'SOUTHWEST AIR': { category: 'TRAVEL', subcategory: null, vendor: 'Southwest Airlines' },
  'SOUTHWEST AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'Southwest Airlines' },
  'SPECTRUM': { category: 'UTILITIES', subcategory: null, vendor: 'Spectrum' },
  'SPIRIT AIR': { category: 'TRAVEL', subcategory: null, vendor: 'Spirit Airlines' },
  'SPIRIT AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'Spirit Airlines' },
  'SPOTIFY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Spotify' },
  'SPOTHERO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'SpotHero' },
  'SQ *': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Square' },
  'SQUARE INC': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Square' },
  'SQUARESPACE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Squarespace' },
  'STAMPS.COM': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'Stamps.com' },
  'STAPLES': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'Staples' },
  'STARBUCKS': { category: 'MEALS', subcategory: null, vendor: 'Starbucks' },
  'STATE FARM': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'State Farm' },
  'STRIPE FEE': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Stripe' },
  'STRIPE PAYMENTS': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Stripe' },
  'SUBWAY': { category: 'MEALS', subcategory: null, vendor: 'Subway' },
  'SUNOCO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Sunoco' },
  'SUNSHINE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Sunshine Gasoline' },
  'SUNPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'SunPass' },
  'SUNTRUST': { category: 'BANK_FEES', subcategory: null, vendor: 'SunTrust' },
  
  // ===== T =====
  'T-MOBILE': { category: 'UTILITIES', subcategory: null, vendor: 'T-Mobile' },
  'TA TRAVEL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'TA Travel Center' },
  'TACO BELL': { category: 'MEALS', subcategory: null, vendor: 'Taco Bell' },
  'TAXACT': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'TaxAct' },
  'TD BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'TD Bank' },
  'TEXACO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Texaco' },
  'TIKTOK': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'TikTok' },
  'TMOBILE': { category: 'UTILITIES', subcategory: null, vendor: 'T-Mobile' },
  'TOAST INC': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Toast' },
  'TOAST TAB': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Toast' },
  'TOASTTAB': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Toast' },
  // Auto finance companies - Toyota, Honda, Ford, etc.
  'TOYOTA FINANCIAL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Toyota Financial Services' },
  'TOYOTA MOTOR CREDIT': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Auto Loan Payment', vendor: 'Toyota Financial Services' },
  'TRAVELERS': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Travelers' },
  'TRUE VALUE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'True Value' },
  'TRUIST': { category: 'BANK_FEES', subcategory: null, vendor: 'Truist' },
  'TST*': { category: 'MEALS', subcategory: null, vendor: 'Restaurant (Toast)' },
  'TURBOTAX': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'TurboTax' },
  'TWITTER': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Twitter/X' },
  'TXTAG': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'TxTag' },
  
  // ===== U =====
  'U-HAUL': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'U-Haul' },
  'UBER': { category: 'TRAVEL', subcategory: null, vendor: 'Uber' },
  'UBER EATS': { category: 'MEALS', subcategory: null, vendor: 'Uber Eats' },
  'UBEREATS': { category: 'MEALS', subcategory: null, vendor: 'Uber Eats' },
  'UDEMY': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Udemy' },
  'UHAUL': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'U-Haul' },
  'UNITED AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'United Airlines' },
  'UNITED HEALTH': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'United Healthcare' },
  'UPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'UPS' },
  'US BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'US Bank' },
  'USAA': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'USAA' },
  'USPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'USPS' },
  
  // ===== V =====
  'VALERO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Valero' },
  'VALVOLINE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Valvoline' },
  'VENMO': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Venmo' },
  'VERCEL': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Vercel' },
  'VERIZON': { category: 'UTILITIES', subcategory: null, vendor: 'Verizon' },
  'VISTAPRINT': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'VistaPrint' },
  'VRBO': { category: 'TRAVEL', subcategory: null, vendor: 'VRBO' },
  'VZWRLSS': { category: 'UTILITIES', subcategory: null, vendor: 'Verizon' },
  
  // ===== W =====
  'WATER DEPT': { category: 'UTILITIES', subcategory: null, vendor: 'Water Department' },
  'WELLS FARGO': { category: 'BANK_FEES', subcategory: null, vendor: 'Wells Fargo' },
  "WENDY'S": { category: 'MEALS', subcategory: null, vendor: "Wendy's" },
  'WENDYS': { category: 'MEALS', subcategory: null, vendor: "Wendy's" },
  'WIRE FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'WIX': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Wix' },
  'WORDPRESS': { category: 'WEB_HOSTING', subcategory: null, vendor: 'WordPress' },
  
  // ===== X =====
  'XFINITY': { category: 'UTILITIES', subcategory: null, vendor: 'Xfinity' },
  
  // ===== Y =====
  'YELLOW PAGES': { category: 'ADVERTISING', subcategory: 'Directory Listings', vendor: 'Yellow Pages' },
  'YELP': { category: 'ADVERTISING', subcategory: 'Directory Listings', vendor: 'Yelp' },
  
  // ===== Z =====
  'ZOOM VIDEO': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Zoom' },
  'ZOOM.US': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Zoom' },
};

/**
 * Pattern prefixes commonly found in bank transaction descriptions
 * These should be stripped before vendor matching (also alphabetized)
 */
export const TRANSACTION_PREFIXES = [
  'ACH CREDIT',
  'ACH DEBIT',
  'ACH DEPOSIT',
  'ACH WITHDRAWAL',
  'AMEX',
  'AUTO PAY',
  'AUTOPAY',
  'BILL PAY',
  'BILL PAYMENT',
  'CHECK CARD',
  'CHECKCARD',
  'CREDIT',
  'DEBIT',
  'DEBIT CARD',
  'DISCOVER',
  'ELECTRONIC CREDIT',
  'ELECTRONIC DEBIT',
  'INTERNET PMT',
  'MASTERCARD',
  'ONLINE PAYMENT',
  'POS DEBIT',
  'POS PURCHASE',
  'POS REFUND',
  'PRE-AUTHORIZED',
  'PREAUTHORIZED',
  'PURCHASE AUTHORIZED',
  'RECURRING',
  'REFUND',
  'RETURN',
  'VISA',
  'WEB PMNT',
];

/**
 * Common suffixes/noise to strip from descriptions
 */
export const TRANSACTION_SUFFIXES = [
  /\d{2}\/\d{2}$/,           // Date: 01/15
  /\s+\d{4,}$/,              // Long numbers at end
  /#\d+$/,                   // Store numbers: #1234
  /\s+[A-Z]{2}$/,            // State codes: FL, NY
  /\s+\d{5}(-\d{4})?$/,      // ZIP codes
  /\s+USA$/i,
  /\s+US$/i,
];

export default DEFAULT_VENDORS;
