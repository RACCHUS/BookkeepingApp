/**
 * Default Vendor Mappings for Transaction Classification
 * 
 * Maps common vendor names/patterns to IRS Schedule C categories.
 * Used as baseline for new users before they build their own rules.
 * 
 * Category keys reference IRS_CATEGORIES in categories.js
 */

export const DEFAULT_VENDORS = {
  // ============================================
  // GAS STATIONS → Car and Truck Expenses
  // ============================================
  'SHELL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Shell' },
  'CHEVRON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Chevron' },
  'EXXON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Exxon' },
  'EXXONMOBIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'ExxonMobil' },
  'MOBIL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Mobil' },
  'BP': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'BP' },
  'SPEEDWAY': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Speedway' },
  'MARATHON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Marathon' },
  'CIRCLE K': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Circle K' },
  'RACETRAC': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'RaceTrac' },
  'WAWA': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Wawa' },
  'SHEETZ': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Sheetz' },
  'PILOT': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Pilot' },
  'LOVES': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: "Love's" },
  "LOVE'S": { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: "Love's" },
  'SUNOCO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Sunoco' },
  'VALERO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Valero' },
  'CITGO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Citgo' },
  'TEXACO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Texaco' },
  'CUMBERLAND': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Cumberland Farms' },
  'QT': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'QuikTrip' },
  'QUIKTRIP': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'QuikTrip' },
  'KWIK TRIP': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: 'Kwik Trip' },
  '7-ELEVEN': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: '7-Eleven' },
  '7 ELEVEN': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas', vendor: '7-Eleven' },
  
  // ============================================
  // AUTO PARTS & SERVICE → Car and Truck Expenses
  // ============================================
  'AUTOZONE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'AutoZone' },
  'ADVANCE AUTO': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Advance Auto Parts' },
  'OREILLY': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: "O'Reilly Auto Parts" },
  "O'REILLY": { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: "O'Reilly Auto Parts" },
  'NAPA': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'NAPA' },
  'DISCOUNT TIRE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Discount Tire' },
  'FIRESTONE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Firestone' },
  'GOODYEAR': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Tires and Parts', vendor: 'Goodyear' },
  'JIFFY LUBE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Jiffy Lube' },
  'VALVOLINE': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Valvoline' },
  'MIDAS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Repairs & Maintenance', vendor: 'Midas' },
  'PENSKE': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Penske' },
  'UHAUL': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'U-Haul' },
  'U-HAUL': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'U-Haul' },
  'ENTERPRISE': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Enterprise' },
  'HERTZ': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Hertz' },
  'BUDGET RENT': { category: 'RENT_LEASE_VEHICLES', subcategory: null, vendor: 'Budget' },

  // ============================================
  // BUILDING MATERIALS → Materials and Supplies
  // ============================================
  'HOME DEPOT': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Home Depot' },
  'HOMEDEPOT': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Home Depot' },
  'LOWES': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: "Lowe's" },
  "LOWE'S": { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: "Lowe's" },
  'MENARDS': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Menards' },
  '84 LUMBER': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: '84 Lumber' },
  'ACE HARDWARE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Ace Hardware' },
  'TRUE VALUE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'True Value' },
  'HARBOR FREIGHT': { category: 'TOOLS_EQUIPMENT', subcategory: null, vendor: 'Harbor Freight' },
  'NORTHERN TOOL': { category: 'TOOLS_EQUIPMENT', subcategory: null, vendor: 'Northern Tool' },
  'FASTENAL': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Fastenal' },
  'GRAINGER': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Grainger' },
  'FERGUSON': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Ferguson' },
  'FLOOR & DECOR': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Floor & Decor' },
  'SHERWIN': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Sherwin-Williams' },
  'BENJAMIN MOORE': { category: 'MATERIALS_SUPPLIES', subcategory: 'Manufacturing Materials', vendor: 'Benjamin Moore' },
  
  // ============================================
  // OFFICE SUPPLIES → Office Expenses
  // ============================================
  'STAPLES': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'Staples' },
  'OFFICE DEPOT': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'Office Depot' },
  'OFFICEMAX': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'OfficeMax' },
  'OFFICE MAX': { category: 'OFFICE_EXPENSES', subcategory: 'Small Equipment (< $2,500)', vendor: 'OfficeMax' },
  'FED EX OFFICE': { category: 'OFFICE_EXPENSES', subcategory: 'Printer Paper & Ink', vendor: 'FedEx Office' },
  'FEDEX OFFICE': { category: 'OFFICE_EXPENSES', subcategory: 'Printer Paper & Ink', vendor: 'FedEx Office' },
  
  // ============================================
  // SOFTWARE & TECH → Software Subscriptions
  // ============================================
  'ADOBE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Adobe' },
  'MICROSOFT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Microsoft' },
  'MSFT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Microsoft' },
  'GOOGLE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Google' },
  'DROPBOX': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Dropbox' },
  'ZOOM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Zoom' },
  'SLACK': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Slack' },
  'GITHUB': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'GitHub' },
  'ATLASSIAN': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Atlassian' },
  'JIRA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Atlassian' },
  'SALESFORCE': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Salesforce' },
  'HUBSPOT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'HubSpot' },
  'QUICKBOOKS': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'QuickBooks' },
  'INTUIT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Intuit' },
  'CANVA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Canva' },
  'MAILCHIMP': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Mailchimp' },
  'CONSTANT CONTACT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Constant Contact' },
  'DOCUSIGN': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'DocuSign' },
  'NOTION': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Notion' },
  'ASANA': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Asana' },
  'MONDAY.COM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Monday.com' },
  'CALENDLY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Calendly' },
  'GRAMMARLY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Grammarly' },
  'CHATGPT': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'OpenAI' },
  'OPENAI': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'OpenAI' },
  'APPLE.COM': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Apple' },
  'SPOTIFY': { category: 'SOFTWARE_SUBSCRIPTIONS', subcategory: null, vendor: 'Spotify' }, // Could be personal
  
  // ============================================
  // WEB HOSTING → Web Hosting & Domains
  // ============================================
  'GODADDY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'GoDaddy' },
  'NAMECHEAP': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Namecheap' },
  'BLUEHOST': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Bluehost' },
  'HOSTGATOR': { category: 'WEB_HOSTING', subcategory: null, vendor: 'HostGator' },
  'SITEGROUND': { category: 'WEB_HOSTING', subcategory: null, vendor: 'SiteGround' },
  'CLOUDFLARE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Cloudflare' },
  'AWS': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Amazon Web Services' },
  'AMAZON WEB': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Amazon Web Services' },
  'DIGITALOCEAN': { category: 'WEB_HOSTING', subcategory: null, vendor: 'DigitalOcean' },
  'HEROKU': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Heroku' },
  'VERCEL': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Vercel' },
  'NETLIFY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Netlify' },
  'FIREBASE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Firebase' },
  'RENDER': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Render' },
  'SQUARESPACE': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Squarespace' },
  'WIX': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Wix' },
  'WORDPRESS': { category: 'WEB_HOSTING', subcategory: null, vendor: 'WordPress' },
  'SHOPIFY': { category: 'WEB_HOSTING', subcategory: null, vendor: 'Shopify' },
  
  // ============================================
  // UTILITIES
  // ============================================
  'FPL': { category: 'UTILITIES', subcategory: null, vendor: 'Florida Power & Light' },
  'DUKE ENERGY': { category: 'UTILITIES', subcategory: null, vendor: 'Duke Energy' },
  'GEORGIA POWER': { category: 'UTILITIES', subcategory: null, vendor: 'Georgia Power' },
  'CONEDISON': { category: 'UTILITIES', subcategory: null, vendor: 'Con Edison' },
  'CON EDISON': { category: 'UTILITIES', subcategory: null, vendor: 'Con Edison' },
  'PG&E': { category: 'UTILITIES', subcategory: null, vendor: 'PG&E' },
  'PACIFIC GAS': { category: 'UTILITIES', subcategory: null, vendor: 'PG&E' },
  'SOUTHERN CALIFORNIA EDISON': { category: 'UTILITIES', subcategory: null, vendor: 'SCE' },
  'AT&T': { category: 'UTILITIES', subcategory: null, vendor: 'AT&T' },
  'ATT': { category: 'UTILITIES', subcategory: null, vendor: 'AT&T' },
  'VERIZON': { category: 'UTILITIES', subcategory: null, vendor: 'Verizon' },
  'VZWRLSS': { category: 'UTILITIES', subcategory: null, vendor: 'Verizon' },
  'T-MOBILE': { category: 'UTILITIES', subcategory: null, vendor: 'T-Mobile' },
  'TMOBILE': { category: 'UTILITIES', subcategory: null, vendor: 'T-Mobile' },
  'COMCAST': { category: 'UTILITIES', subcategory: null, vendor: 'Comcast' },
  'XFINITY': { category: 'UTILITIES', subcategory: null, vendor: 'Xfinity' },
  'SPECTRUM': { category: 'UTILITIES', subcategory: null, vendor: 'Spectrum' },
  'COX COMM': { category: 'UTILITIES', subcategory: null, vendor: 'Cox' },
  'FRONTIER': { category: 'UTILITIES', subcategory: null, vendor: 'Frontier' },
  'CENTURYLINK': { category: 'UTILITIES', subcategory: null, vendor: 'CenturyLink' },
  'WATER DEPT': { category: 'UTILITIES', subcategory: null, vendor: 'Water Department' },
  'CITY OF': { category: 'UTILITIES', subcategory: null, vendor: 'City Utilities' },
  
  // ============================================
  // INSURANCE
  // ============================================
  'GEICO': { category: 'INSURANCE_OTHER', subcategory: 'Commercial Auto (if not Line 9)', vendor: 'GEICO' },
  'STATE FARM': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'State Farm' },
  'PROGRESSIVE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Progressive' },
  'ALLSTATE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Allstate' },
  'LIBERTY MUTUAL': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Liberty Mutual' },
  'NATIONWIDE': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Nationwide' },
  'FARMERS': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Farmers' },
  'USAA': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'USAA' },
  'TRAVELERS': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'Travelers' },
  'HARTFORD': { category: 'INSURANCE_OTHER', subcategory: null, vendor: 'The Hartford' },
  'CIGNA': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Cigna' },
  'AETNA': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Aetna' },
  'BLUE CROSS': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'Blue Cross' },
  'UNITED HEALTH': { category: 'EMPLOYEE_BENEFIT_PROGRAMS', subcategory: 'Health Insurance', vendor: 'United Healthcare' },
  
  // ============================================
  // SHIPPING & POSTAGE → Other Costs
  // ============================================
  'USPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'USPS' },
  'UPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'UPS' },
  'FEDEX': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'FedEx' },
  'FED EX': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'FedEx' },
  'DHL': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'DHL' },
  'STAMPS.COM': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'Stamps.com' },
  'PIRATESHIP': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'Pirate Ship' },
  'SHIPSTATION': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer', vendor: 'ShipStation' },
  
  // ============================================
  // BANKING & FEES → Bank Fees
  // ============================================
  'CHASE': { category: 'BANK_FEES', subcategory: null, vendor: 'Chase' },
  'BANK OF AMERICA': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank of America' },
  'WELLS FARGO': { category: 'BANK_FEES', subcategory: null, vendor: 'Wells Fargo' },
  'CITI': { category: 'BANK_FEES', subcategory: null, vendor: 'Citi' },
  'CITIBANK': { category: 'BANK_FEES', subcategory: null, vendor: 'Citi' },
  'PNC': { category: 'BANK_FEES', subcategory: null, vendor: 'PNC' },
  'US BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'US Bank' },
  'CAPITAL ONE': { category: 'BANK_FEES', subcategory: null, vendor: 'Capital One' },
  'TD BANK': { category: 'BANK_FEES', subcategory: null, vendor: 'TD Bank' },
  'TRUIST': { category: 'BANK_FEES', subcategory: null, vendor: 'Truist' },
  'REGIONS': { category: 'BANK_FEES', subcategory: null, vendor: 'Regions' },
  'SUNTRUST': { category: 'BANK_FEES', subcategory: null, vendor: 'SunTrust' },
  'INTEREST CHARGE': { category: 'INTEREST_OTHER', subcategory: 'Credit Card Interest', vendor: 'Interest Charge' },
  'FINANCE CHARGE': { category: 'INTEREST_OTHER', subcategory: 'Credit Card Interest', vendor: 'Finance Charge' },
  'MONTHLY SERVICE FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'OVERDRAFT FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'ATM FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  'WIRE FEE': { category: 'BANK_FEES', subcategory: null, vendor: 'Bank Fee' },
  
  // ============================================
  // PAYMENT PROCESSING → Commissions and Fees
  // ============================================
  'PAYPAL': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'PayPal' },
  'STRIPE': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Stripe' },
  'SQUARE': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Square' },
  'SQ *': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Square' },
  'VENMO': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Venmo' },
  'BRAINTREE': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Braintree' },
  'AUTHORIZE.NET': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Authorize.net' },
  'CLOVER': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Clover' },
  'TOAST': { category: 'COMMISSIONS_FEES', subcategory: null, vendor: 'Toast' },
  
  // ============================================
  // ADVERTISING (IMPORTANT: More specific patterns first!)
  // ============================================
  'GOOGLE ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Google Ads' },
  'GOOGLE AD': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Google Ads' },
  'FACEBOOK ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FB ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'FACEBOOK': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'META ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'META': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Facebook/Meta' },
  'INSTAGRAM': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Instagram' },
  'LINKEDIN ADS': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'LinkedIn' },
  'LINKEDIN': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'LinkedIn' },
  'YELP': { category: 'ADVERTISING', subcategory: 'Directory Listings', vendor: 'Yelp' },
  'YELLOW PAGES': { category: 'ADVERTISING', subcategory: 'Directory Listings', vendor: 'Yellow Pages' },
  'VISTAPRINT': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'VistaPrint' },
  'MOOCOM': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'Moo' },
  'MOO.COM': { category: 'ADVERTISING', subcategory: 'Business Cards', vendor: 'Moo' },
  'TWITTER': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'Twitter/X' },
  'TIKTOK': { category: 'ADVERTISING', subcategory: 'Online Ads (Google, Facebook, etc.)', vendor: 'TikTok' },
  
  // ============================================
  // MEALS (50% deductible)
  // ============================================
  'MCDONALDS': { category: 'MEALS', subcategory: null, vendor: "McDonald's" },
  "MCDONALD'S": { category: 'MEALS', subcategory: null, vendor: "McDonald's" },
  'STARBUCKS': { category: 'MEALS', subcategory: null, vendor: 'Starbucks' },
  'CHIPOTLE': { category: 'MEALS', subcategory: null, vendor: 'Chipotle' },
  'SUBWAY': { category: 'MEALS', subcategory: null, vendor: 'Subway' },
  'DUNKIN': { category: 'MEALS', subcategory: null, vendor: "Dunkin'" },
  'BURGER KING': { category: 'MEALS', subcategory: null, vendor: 'Burger King' },
  'WENDYS': { category: 'MEALS', subcategory: null, vendor: "Wendy's" },
  "WENDY'S": { category: 'MEALS', subcategory: null, vendor: "Wendy's" },
  'TACO BELL': { category: 'MEALS', subcategory: null, vendor: 'Taco Bell' },
  'CHICK-FIL-A': { category: 'MEALS', subcategory: null, vendor: 'Chick-fil-A' },
  'CHICKFILA': { category: 'MEALS', subcategory: null, vendor: 'Chick-fil-A' },
  'CHILIS': { category: 'MEALS', subcategory: null, vendor: "Chili's" },
  "CHILI'S": { category: 'MEALS', subcategory: null, vendor: "Chili's" },
  'APPLEBEES': { category: 'MEALS', subcategory: null, vendor: "Applebee's" },
  "APPLEBEE'S": { category: 'MEALS', subcategory: null, vendor: "Applebee's" },
  'OLIVE GARDEN': { category: 'MEALS', subcategory: null, vendor: 'Olive Garden' },
  'PANERA': { category: 'MEALS', subcategory: null, vendor: 'Panera' },
  'PANDA EXPRESS': { category: 'MEALS', subcategory: null, vendor: 'Panda Express' },
  'FIVE GUYS': { category: 'MEALS', subcategory: null, vendor: 'Five Guys' },
  'POPEYES': { category: 'MEALS', subcategory: null, vendor: 'Popeyes' },
  'KFC': { category: 'MEALS', subcategory: null, vendor: 'KFC' },
  'DOMINOS': { category: 'MEALS', subcategory: null, vendor: "Domino's" },
  "DOMINO'S": { category: 'MEALS', subcategory: null, vendor: "Domino's" },
  'PIZZA HUT': { category: 'MEALS', subcategory: null, vendor: 'Pizza Hut' },
  "PAPA JOHN'S": { category: 'MEALS', subcategory: null, vendor: "Papa John's" },
  'PAPA JOHNS': { category: 'MEALS', subcategory: null, vendor: "Papa John's" },
  'DOORDASH': { category: 'MEALS', subcategory: null, vendor: 'DoorDash' },
  'GRUBHUB': { category: 'MEALS', subcategory: null, vendor: 'Grubhub' },
  'UBER EATS': { category: 'MEALS', subcategory: null, vendor: 'Uber Eats' },
  'UBEREATS': { category: 'MEALS', subcategory: null, vendor: 'Uber Eats' },
  'POSTMATES': { category: 'MEALS', subcategory: null, vendor: 'Postmates' },
  'TST*': { category: 'MEALS', subcategory: null, vendor: 'Restaurant (Toast)' },
  'SQ *': { category: 'MEALS', subcategory: null, vendor: 'Restaurant (Square)' },
  
  // ============================================
  // TRAVEL
  // ============================================
  'UBER': { category: 'TRAVEL', subcategory: null, vendor: 'Uber' },
  'LYFT': { category: 'TRAVEL', subcategory: null, vendor: 'Lyft' },
  'DELTA': { category: 'TRAVEL', subcategory: null, vendor: 'Delta Airlines' },
  'AMERICAN AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'American Airlines' },
  'UNITED AIRLINES': { category: 'TRAVEL', subcategory: null, vendor: 'United Airlines' },
  'SOUTHWEST': { category: 'TRAVEL', subcategory: null, vendor: 'Southwest Airlines' },
  'JETBLUE': { category: 'TRAVEL', subcategory: null, vendor: 'JetBlue' },
  'SPIRIT': { category: 'TRAVEL', subcategory: null, vendor: 'Spirit Airlines' },
  'FRONTIER': { category: 'TRAVEL', subcategory: null, vendor: 'Frontier Airlines' },
  'MARRIOTT': { category: 'TRAVEL', subcategory: null, vendor: 'Marriott' },
  'HILTON': { category: 'TRAVEL', subcategory: null, vendor: 'Hilton' },
  'HYATT': { category: 'TRAVEL', subcategory: null, vendor: 'Hyatt' },
  'IHG': { category: 'TRAVEL', subcategory: null, vendor: 'IHG' },
  'HOLIDAY INN': { category: 'TRAVEL', subcategory: null, vendor: 'Holiday Inn' },
  'HAMPTON INN': { category: 'TRAVEL', subcategory: null, vendor: 'Hampton Inn' },
  'BEST WESTERN': { category: 'TRAVEL', subcategory: null, vendor: 'Best Western' },
  'AIRBNB': { category: 'TRAVEL', subcategory: null, vendor: 'Airbnb' },
  'VRBO': { category: 'TRAVEL', subcategory: null, vendor: 'VRBO' },
  'EXPEDIA': { category: 'TRAVEL', subcategory: null, vendor: 'Expedia' },
  'BOOKING.COM': { category: 'TRAVEL', subcategory: null, vendor: 'Booking.com' },
  'HOTELS.COM': { category: 'TRAVEL', subcategory: null, vendor: 'Hotels.com' },
  'KAYAK': { category: 'TRAVEL', subcategory: null, vendor: 'Kayak' },
  'PARKING': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'Parking' },
  'TOLL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'Toll' },
  'SUNPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'SunPass' },
  'E-PASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'E-Pass' },
  'EPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'E-Pass' },
  'EZPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'EZPass' },
  'E-ZPASS': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Parking & Tolls', vendor: 'EZPass' },
  
  // ============================================
  // LEGAL & PROFESSIONAL
  // ============================================
  'LEGALZOOM': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'LegalZoom' },
  'ROCKET LAWYER': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Legal Fees', vendor: 'Rocket Lawyer' },
  'NOLO': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Legal Fees', vendor: 'Nolo' },
  'INC FILE': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'IncFile' },
  'NORTHWEST REGISTERED': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Business Registration/Filing Fees', vendor: 'Northwest Registered Agent' },
  'H&R BLOCK': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'H&R Block' },
  'TURBOTAX': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'TurboTax' },
  'TAXACT': { category: 'LEGAL_PROFESSIONAL', subcategory: 'Accounting & Tax Prep', vendor: 'TaxAct' },
  
  // ============================================
  // DUES & MEMBERSHIPS
  // ============================================
  'COSTCO': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: 'Costco' },
  'SAMS CLUB': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "Sam's Club" },
  "SAM'S CLUB": { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "Sam's Club" },
  'BJS': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "BJ's" },
  "BJ'S": { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: "BJ's" },
  'AMAZON PRIME': { category: 'DUES_MEMBERSHIPS', subcategory: null, vendor: 'Amazon Prime' },
  
  // ============================================
  // TRAINING & EDUCATION
  // ============================================
  'UDEMY': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Udemy' },
  'COURSERA': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Coursera' },
  'LINKEDIN LEARNING': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'LinkedIn Learning' },
  'SKILLSHARE': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Skillshare' },
  'MASTERCLASS': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'MasterClass' },
  'PLURALSIGHT': { category: 'TRAINING_EDUCATION', subcategory: null, vendor: 'Pluralsight' },
  
  // ============================================
  // GENERAL RETAIL (Default to Supplies - user should refine)
  // ============================================
  'AMAZON': { category: 'SUPPLIES', subcategory: null, vendor: 'Amazon' },
  'AMZN': { category: 'SUPPLIES', subcategory: null, vendor: 'Amazon' },
  'WALMART': { category: 'SUPPLIES', subcategory: null, vendor: 'Walmart' },
  'TARGET': { category: 'SUPPLIES', subcategory: null, vendor: 'Target' },
  'BEST BUY': { category: 'SUPPLIES', subcategory: null, vendor: 'Best Buy' },
  'BESTBUY': { category: 'SUPPLIES', subcategory: null, vendor: 'Best Buy' },
  'IKEA': { category: 'OFFICE_EXPENSES', subcategory: 'Office Décor', vendor: 'IKEA' },
  
  // ============================================
  // PERSONAL / NON-DEDUCTIBLE (Flag for review)
  // ============================================
  'ATM WITHDRAWAL': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'ATM Withdrawal' },
  'ATM CASH': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'ATM Withdrawal' },
  'CASH WITHDRAWAL': { category: 'OWNER_DRAWS', subcategory: null, vendor: 'Cash Withdrawal' },
  'ZELLE': { category: 'PERSONAL_TRANSFER', subcategory: null, vendor: 'Zelle' },
  'TRANSFER TO': { category: 'PERSONAL_TRANSFER', subcategory: null, vendor: 'Transfer' },
  'TRANSFER FROM': { category: 'PERSONAL_TRANSFER', subcategory: null, vendor: 'Transfer' },
  'NETFLIX': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Netflix' },
  'HULU': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Hulu' },
  'DISNEY+': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Disney+' },
  'HBO': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'HBO Max' },
  'PARAMOUNT': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Paramount+' },
  'PEACOCK': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Peacock' },
  'GYM': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Gym' },
  'FITNESS': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Fitness' },
  'PLANET FITNESS': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'Planet Fitness' },
  'LA FITNESS': { category: 'PERSONAL_EXPENSE', subcategory: null, vendor: 'LA Fitness' },
};

/**
 * Pattern prefixes commonly found in bank transaction descriptions
 * These should be stripped before vendor matching
 */
export const TRANSACTION_PREFIXES = [
  'CHECKCARD',
  'CHECK CARD',
  'DEBIT CARD',
  'POS PURCHASE',
  'POS DEBIT',
  'POS REFUND',
  'ACH DEBIT',
  'ACH CREDIT',
  'ACH WITHDRAWAL',
  'ACH DEPOSIT',
  'ELECTRONIC DEBIT',
  'ELECTRONIC CREDIT',
  'BILL PAY',
  'BILL PAYMENT',
  'ONLINE PAYMENT',
  'WEB PMNT',
  'INTERNET PMT',
  'AUTOPAY',
  'AUTO PAY',
  'RECURRING',
  'PREAUTHORIZED',
  'PRE-AUTHORIZED',
  'PURCHASE AUTHORIZED',
  'VISA',
  'MASTERCARD',
  'AMEX',
  'DISCOVER',
  'DEBIT',
  'CREDIT',
  'RETURN',
  'REFUND',
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
