// Utility to extract company info from Chase PDF text

/**
 * Extract company information from Chase PDF statement header
 * @param {string} text - PDF text content
 * @returns {object} Company information object (never null fields)
 */
export default function extractCompanyInfo(text) {
  const lines = text.split('\n').slice(0, 20);
  let companyName = '';
  let companyAddress = '';

  const businessPatterns = [
    /^([A-Z\s]+(?:INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|CONSTRUCTION|ENTERPRISES|SERVICES|GROUP)\.?),?\s*$/i,
    /^([A-Z\s]+(?:&|AND)\s+[A-Z\s]+(?:INC|LLC|CORP|CONSTRUCTION)\.?),?\s*$/i,
    /^([A-Z][A-Za-z\s]+(?:CONSTRUCTION|CONTRACTING|BUILDER|BUILDERS|COMPANY)\.?),?\s*$/i,
    /^([A-Z][A-Za-z\s]{10,50})\s*$/
  ];
  const addressPatterns = [
    /^\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Way|Place|Pl)\.?\s*$/i,
    /^[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line ||
      line.includes('Chase') ||
      line.includes('Statement') ||
      line.includes('Account') ||
      line.includes('Period') ||
      line.includes('Balance') ||
      line.includes('Page') ||
      line.match(/^\d+$/)) {
      continue;
    }
    if (!companyName) {
      for (const pattern of businessPatterns) {
        const match = line.match(pattern);
        if (match) {
          companyName = match[1].trim();
          break;
        }
      }
    }
    if (companyName && !companyAddress) {
      for (const pattern of addressPatterns) {
        if (pattern.test(line)) {
          companyAddress = line;
          break;
        }
      }
    }
    if (companyName && companyAddress) break;
  }
  return {
    name: companyName || '',
    address: companyAddress || '',
    extracted: !!(companyName || companyAddress)
  };
}
