# Troubleshooting Guide

This guide helps diagnose and resolve common issues encountered when developing or using the Bookkeeping App.

## Quick Diagnosis

### 1. Application Won't Start

**Symptoms:**
- Server fails to start
- Client build errors
- Firebase connection errors

**Quick Fixes:**
```bash
# Clear all caches and reinstall
rm -rf client/node_modules server/node_modules
rm -rf client/dist client/.vite
npm run install:all

# Check Node.js version (requires Node 16+)
node --version

# Verify Firebase CLI
firebase --version
```

### 2. Authentication Issues

**Symptoms:**
- Users can't log in
- "Auth domain not authorized" errors
- Token validation failures

**Quick Fixes:**
- Check Firebase Auth configuration in console
- Verify authorized domains include your localhost/domain
- Clear browser storage and try again

### 3. Database Connection Issues

**Symptoms:**
- Firestore permission denied errors
- Data not loading
- "Missing or insufficient permissions"

**Quick Fixes:**
- Check Firestore security rules
- Verify user authentication status
- Test with Firebase emulator

## Detailed Troubleshooting

### Frontend Issues

#### Build Errors

**Error: `Module not found`**
```bash
# Check if file exists with correct case
ls -la client/src/components/

# Clear Vite cache
rm -rf client/node_modules/.vite
npm run dev
```

**Error: `Environment variable not defined`**
```javascript
// Check environment file exists
// client/.env.local should contain:
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**Error: React hooks rules violation**
```javascript
// Ensure hooks are only called at top level
const MyComponent = () => {
  // ✅ Correct
  const [state, setState] = useState();
  
  // ❌ Wrong - conditional hook
  if (condition) {
    const [state2, setState2] = useState();
  }
};
```

#### Runtime Errors

**Error: `Firebase: Error (auth/invalid-api-key)`**
```javascript
// Verify API key in .env.local
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY);

// Check Firebase project configuration
// Ensure API key matches Firebase console
```

**Error: `Network Error` when calling API**
```javascript
// Check API base URL
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

// In development, should be:
// http://localhost:5001/your-project/us-central1/api

// Verify CORS settings in server
```

**Error: React Query errors**
```javascript
// Check React Query DevTools
import { ReactQueryDevtools } from 'react-query/devtools';

// Add to App.jsx in development
{import.meta.env.DEV && <ReactQueryDevtools />}
```

### Backend Issues

#### Server Startup Errors

**Error: `Cannot find module`**
```bash
# Install missing dependencies
cd server
npm install

# Check package.json for correct dependencies
cat package.json
```

**Error: `Firebase Admin SDK initialization failed`**
```javascript
// Check environment variables
console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Private key exists:', !!process.env.FIREBASE_PRIVATE_KEY);

// For local development with emulator:
export FIREBASE_USE_EMULATOR=true

// For production, ensure service account key is properly set
```

**Error: `Port already in use`**
```bash
# Find process using port 5001
lsof -i :5001
netstat -tulpn | grep :5001

# Kill process
kill -9 <PID>

# Or use different port
PORT=5002 npm start
```

#### API Errors

**Error: `CORS policy blocking request`**
```javascript
// server/index.js - Check CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? true  // Allow all origins in dev
    : [process.env.CORS_ORIGIN], // Specific origin in prod
  credentials: true
};

app.use(cors(corsOptions));
```

**Error: `Authentication required`**
```javascript
// Check middleware order
app.use(authMiddleware); // Should be before protected routes
app.use('/api/transactions', transactionRoutes);

// Debug token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token received:', !!token);
  // ... rest of middleware
};
```

**Error: Firestore permission denied**
```javascript
// Check security rules in Firebase console
// Ensure user ID matches in rules:
allow read, write: if request.auth != null && 
  request.auth.uid == resource.data.userId;

// Debug user context
console.log('User ID from token:', decodedToken.uid);
console.log('User ID in document:', documentData.userId);
```

### PDF Processing Issues

#### Upload Failures

**Error: `File too large`**
```javascript
// Check file size limits
// server/middlewares/upload.js
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Client-side validation
if (file.size > 10 * 1024 * 1024) {
  alert('File too large. Maximum size is 10MB.');
  return;
}
```

**Error: `Invalid PDF format`**
```javascript
// Check file type validation
const allowedTypes = ['application/pdf'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Only PDF files are allowed');
}

// Check PDF parsing
const pdfParse = require('pdf-parse');
try {
  const data = await pdfParse(buffer);
  console.log('PDF pages:', data.numpages);
  console.log('Text length:', data.text.length);
} catch (error) {
  console.error('PDF parsing failed:', error.message);
}
```

#### Processing Errors

**Error: `No transactions found in PDF`**
```javascript
// Debug PDF text extraction
console.log('Raw PDF text:', text.substring(0, 500));

// Check section detection
const sections = detectSections(text);
console.log('Detected sections:', sections.map(s => s.title));

// Verify transaction patterns
const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/g;
const matches = text.match(transactionRegex);
console.log('Transaction matches:', matches?.length || 0);
```

**Error: `Classification rules not working`**
```javascript
// Debug rule matching
const matchesPattern = (text, rule) => {
  console.log(`Testing "${rule.pattern}" against "${text}"`);
  
  if (rule.useRegex) {
    try {
      const regex = new RegExp(rule.pattern, rule.caseSensitive ? 'g' : 'gi');
      const result = regex.test(text);
      console.log(`Regex result: ${result}`);
      return result;
    } catch (error) {
      console.error('Invalid regex:', error.message);
      return false;
    }
  } else {
    const searchText = rule.caseSensitive ? text : text.toLowerCase();
    const searchPattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
    const result = searchText.includes(searchPattern);
    console.log(`Text search result: ${result}`);
    return result;
  }
};
```

### Database Issues

#### Firestore Errors

**Error: `Quota exceeded`**
```bash
# Check Firebase usage in console
# Monitor read/write operations

# Optimize queries to reduce reads
const query = db.collection('transactions')
  .where('userId', '==', userId)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .limit(100); // Add pagination
```

**Error: `Index not found`**
```bash
# Deploy missing indexes
firebase deploy --only firestore:indexes

# Check firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "date", "order": "DESCENDING"}
      ]
    }
  ]
}
```

**Error: `Transaction write failed`**
```javascript
// Use batched writes for multiple operations
const batch = db.batch();

transactions.forEach(transaction => {
  const ref = db.collection('transactions').doc();
  batch.set(ref, transaction);
});

try {
  await batch.commit();
  console.log('Batch write successful');
} catch (error) {
  console.error('Batch write failed:', error);
}
```

### Authentication Issues

#### Login Problems

**Error: `User not found`**
```javascript
// Check if user is properly created
const user = await createUserWithEmailAndPassword(auth, email, password);

// Create user document in Firestore
await db.collection('users').doc(user.uid).set({
  email: user.email,
  displayName: user.displayName,
  createdAt: serverTimestamp()
});
```

**Error: `Token expired`**
```javascript
// Handle token refresh
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Get fresh token
    const token = await user.getIdToken(true);
    
    // Update API client headers
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;
  }
});
```

**Error: `Email not verified`**
```javascript
// Check email verification status
if (user && !user.emailVerified) {
  await sendEmailVerification(user);
  alert('Please verify your email before continuing.');
}
```

### Performance Issues

#### Slow Loading

**Symptoms:**
- Long initial load times
- Slow transaction filtering
- Heavy API responses

**Solutions:**
```javascript
// Implement pagination
const useTransactions = (filters, page = 1, limit = 50) => {
  return useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => apiClient.transactions.getAll({
      ...filters,
      page,
      limit
    }),
    keepPreviousData: true
  });
};

// Add loading states
const TransactionList = () => {
  const { data, isLoading, isFetching } = useTransactions(filters);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {isFetching && <LoadingBar />}
      {/* Transaction list */}
    </div>
  );
};
```

#### Memory Issues

**Error: `Out of memory` during PDF processing**
```javascript
// Process PDFs in chunks
const processLargePDF = async (buffer) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const chunks = [];
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize));
  }
  
  // Process chunks sequentially
  const results = [];
  for (const chunk of chunks) {
    const result = await processChunk(chunk);
    results.push(result);
    
    // Allow garbage collection
    if (global.gc) global.gc();
  }
  
  return mergeResults(results);
};
```

## Diagnostic Tools

### 1. Debug Mode

**Enable Debug Logging:**
```javascript
// Client - Add to .env.local
VITE_DEBUG_MODE=true
VITE_ENABLE_LOGGING=true

// Server - Add to .env  
DEBUG_PDF=true
DEBUG_CLASSIFICATION=true
LOG_LEVEL=debug
```

### 2. Health Check Endpoint

**Test API Health:**
```bash
# Check if server is responding
curl http://localhost:5001/api/health

# Check specific endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/transactions
```

### 3. Firebase Emulator UI

**Access Emulator Interface:**
```bash
# Start emulators with UI
firebase emulators:start

# Open browser to:
http://localhost:4000
```

**Useful emulator features:**
- View Firestore data and rules
- Test authentication flows
- Monitor function logs
- Simulate network conditions

### 4. Browser Developer Tools

**Check Network Tab:**
- Failed API requests
- CORS errors
- Response times

**Check Console:**
- JavaScript errors
- Firebase warnings
- React development warnings

**Check Application Tab:**
- Local storage values
- Session storage
- IndexedDB data

## Common Error Messages

### Firebase Errors

| Error Code | Cause | Solution |
|------------|-------|----------|
| `auth/invalid-api-key` | Wrong API key | Check Firebase config |
| `auth/user-not-found` | User doesn't exist | Handle registration |
| `permission-denied` | Firestore rules | Check security rules |
| `quota-exceeded` | Too many operations | Optimize queries |

### Vite Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot resolve module` | Missing dependency | `npm install <package>` |
| `Environment variable undefined` | Missing .env file | Create .env.local |
| `Build failed` | Syntax errors | Check console logs |

### Express Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot GET /api/*` | Route not found | Check route definitions |
| `CORS error` | Origin not allowed | Update CORS config |
| `500 Internal Error` | Server crash | Check server logs |

## Getting Help

### 1. Check Logs

**Client Logs:**
- Browser Developer Tools Console
- Network tab for API calls

**Server Logs:**
```bash
# Local development
npm run dev

# Firebase Functions
firebase functions:log

# Cloud Function logs in Firebase Console
```

### 2. Debug Information

When reporting issues, include:
- Environment (development/production)
- Browser and version
- Node.js version
- Error messages and stack traces
- Steps to reproduce

### 3. Testing Isolation

**Isolate the Problem:**
```javascript
// Test individual components
npm run test ComponentName

// Test specific API endpoints
curl -X POST http://localhost:5001/api/test

// Test with minimal data
// Create simple test case with known data
```

### 4. Reset to Known State

**Complete Reset:**
```bash
# Clear all data and restart
rm -rf client/node_modules server/node_modules
rm -rf client/dist client/.vite
npm run install:all

# Reset Firebase emulator data
firebase emulators:exec --project demo-project \
  "echo 'Clearing data'" --import=./emulator-data --export-on-exit

# Clear browser data
# In Chrome: DevTools > Application > Storage > Clear storage
```
