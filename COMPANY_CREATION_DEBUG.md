# Company Creation 400 Error Debug Guide

## Issue Description
Getting 400 Bad Request error when trying to create a company via POST /api/companies

## Error Details
```
POST http://localhost:5000/api/companies 400 (Bad Request)
```

## Backend Validation Requirements

### Required Fields
- `name`: string, 1-200 characters

### Optional Fields with Validation
- `legalName`: string, max 200 characters
- `businessType`: enum ['LLC', 'Corp', 'Partnership', 'Sole Proprietorship', 'S-Corp', 'Non-Profit', 'Other']
- `taxId`: regex pattern `^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$` (EIN or SSN format)
- `address.street`: string, max 200 characters
- `address.city`: string, max 100 characters
- `address.state`: string, exactly 2 characters
- `address.zipCode`: regex pattern `^\d{5}(-\d{4})?$`
- `phone`: regex pattern `^\+?[\d\s\-\(\)\.]+$`
- `email`: valid email format
- `website`: valid URL format

## Debugging Steps Taken

### 1. Fixed Frontend Validation
- Updated CompanyForm validation to match backend requirements
- Added proper regex validation for taxId, zipCode, phone
- Made legalName optional (removed required indicator and validation)
- Added state transformation to uppercase
- Added error display for all form fields

### 2. Added Data Sanitization
- Remove empty optional fields to avoid validation issues
- Clean up address object if all fields are empty
- Log sanitized data being sent to API

### 3. Enhanced Error Logging
- Added detailed console logging in CompanyForm
- Enhanced error handling in CompanyManagement to show validation details
- Log the exact data being sent to the API

## How to Debug Further

### 1. Check Console Logs
When attempting to create a company, check browser console for:
- "Form submission attempted with data:" - shows raw form data
- "Validation passed, calling onSave with sanitized data:" - shows cleaned data
- "handleSaveCompany called with:" - shows data received by management component
- "Calling createMutation.mutate with:" - shows data sent to API
- "Create company error:" - shows error details including validation failures

### 2. Check Network Tab
In browser dev tools Network tab, look for the POST request to `/api/companies`:
- Check request payload
- Check response status and error details

### 3. Backend Validation Details
If validation fails, the response should include:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Company name is required",
      "param": "name",
      "location": "body"
    }
  ]
}
```

## Common Issues and Solutions

### Issue: State validation fails
**Solution**: Ensure state is exactly 2 uppercase letters (e.g., "FL", "CA")

### Issue: Tax ID validation fails
**Solution**: Use format XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)

### Issue: ZIP code validation fails
**Solution**: Use format XXXXX or XXXXX-XXXX (digits only)

### Issue: Business type validation fails
**Solution**: Ensure businessType is one of the allowed values exactly as specified

## Test Data
Use this minimal test data to create a company:
```json
{
  "name": "Test Company",
  "businessType": "LLC"
}
```

## Next Steps
1. Test with minimal data above
2. Check console logs for exact validation failures
3. If still failing, check backend logs for more details
4. Verify API endpoint and server is running correctly
