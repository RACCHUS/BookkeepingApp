# PDF Upload Company Selection Debug Guide

## Issue Description
User selects a company but the PDF upload area still shows "Select a company above to start uploading" and doesn't allow file uploads.

## Changes Made for Debugging

### 1. Added Console Logging
- **handleCompanyChange**: Now logs when a company is selected
- **onDrop**: Logs the current state when files are dropped

### 2. Auto-Selection Logic
- **Default Company**: Automatically selects the default company when the page loads
- **Single Company**: If only one company exists, automatically selects it
- **Console Logging**: Shows when auto-selection occurs

### 3. Debug Information Panel
Added a temporary debug panel that shows:
- `selectedCompany`: The ID of the selected company
- `selectedCompanyData`: The name of the selected company 
- `hasCompanies`: Whether any companies exist
- `companiesCount`: Number of companies loaded

## How to Debug

### 1. Check the Debug Panel
Look at the gray debug box on the PDF upload page to see:
- Is `selectedCompany` showing an ID or "null"?
- Is `selectedCompanyData` showing a company name or "null"?
- Is `hasCompanies` showing "true"?
- Is `companiesCount` showing the expected number?

### 2. Check Console Logs
When you select a company, you should see:
```
Company selected: { companyId: "abc123", companyData: { name: "Company Name", ... } }
```

When auto-selection happens, you should see:
```
Auto-selecting default company: { name: "Company Name", ... }
```
or
```
Auto-selecting single company: { name: "Company Name", ... }
```

When you try to drop/upload files, you should see:
```
onDrop called with: { selectedCompany: "abc123", selectedCompanyData: {...}, filesCount: 1 }
Company is selected, proceeding with upload
```

### 3. Visual Indicators
- **Upload Area**: Should not be grayed out and should show "Drag & drop PDF files here"
- **Company Info**: Should show "Selected: Company Name" below the selector
- **Selector**: Should display the company name instead of placeholder text

## Common Issues and Solutions

### Issue: selectedCompany is "null"
**Possible Causes:**
- Companies not loading properly
- CompanySelector not calling onChange
- Auto-selection not working

**Solution:**
- Check if companies are loading in the debug panel
- Try manually selecting a company from the dropdown
- Check browser console for any errors

### Issue: selectedCompany has value but upload area is still disabled
**Possible Causes:**
- State update not triggering re-render
- Conditional logic error in upload area

**Solution:**
- Check if selectedCompanyData is also set
- Refresh the page and try again

### Issue: Auto-selection not working
**Possible Causes:**
- No default company set
- Multiple companies but no default

**Solution:**
- Set a default company in company management
- Or manually select a company from the dropdown

## Expected Behavior
1. Page loads → Companies are fetched
2. If default company exists → Auto-select it
3. If only one company → Auto-select it
4. User can manually select different company
5. Upload area becomes enabled when company is selected
6. Files can be dropped/uploaded successfully

## Next Steps
1. Check the debug panel information
2. Look at console logs when selecting companies
3. If issue persists, check for JavaScript errors in console
4. Remove debug panel once issue is resolved
