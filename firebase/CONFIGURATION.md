# Firebase Configuration

This document describes the Firebase setup and configuration for the Bookkeeping App.

## Project Structure

```
Root/
├── firebase.json              # Main Firebase configuration
├── .firebaserc               # Firebase project aliases
└── firebase/                 # Firebase configuration files
    ├── firestore.rules        # Firestore security rules  
    ├── firestore.indexes.json # Firestore database indexes
    └── storage.rules          # Firebase Storage security rules
```

## Firebase Services Used

### 1. Firebase Authentication
- **Purpose**: User authentication and authorization
- **Configuration**: Enabled providers in Firebase Console
- **Supported Providers**: 
  - Email/Password (primary)
  - Google Sign-In (optional)
  
### 2. Firestore Database
- **Purpose**: Store application data (transactions, companies, users)
- **Mode**: Native mode
- **Location**: Multi-region (nam5)
- **Security**: Rules-based access control

### 3. Firebase Storage
- **Purpose**: Store uploaded PDF files and generated reports
- **Security**: Rules-based access control
- **File Types**: PDF bank statements, receipts, generated reports

### 4. Cloud Functions
- **Purpose**: Backend API and PDF processing
- **Runtime**: Node.js 18
- **Source**: `server/` directory

### 5. Firebase Hosting
- **Purpose**: Host React frontend application
- **Source**: `client/dist` directory (Vite build output)

## Configuration Files

### firebase.json
Main configuration file that defines:
- **Hosting**: Static site deployment settings
- **Functions**: Backend API configuration  
- **Firestore**: Database rules and indexes
- **Storage**: File storage rules
- **Emulators**: Local development environment

Key settings:
```json
{
  "hosting": {
    "public": "client/dist",
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  },
  "functions": {
    "source": "server",
    "runtime": "nodejs18"
  },
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "storage": {
    "rules": "firebase/storage.rules"
  }
}
```

### firestore.rules
Security rules that enforce:
- **User isolation**: Users can only access their own data
- **Authentication requirement**: All operations require valid auth token
- **Collection-level permissions**: Specific rules for each collection

### firestore.indexes.json
Composite indexes for optimal query performance:
- **Transactions**: User + date, User + company + date, User + category + date
- **Uploads**: User + creation date, User + company + creation date
- **Companies**: User + name
- **Payees**: User + company + name

### storage.rules
File access rules:
- **User isolation**: Users can only access files in their directory
- **File type restrictions**: Only PDF, CSV, Excel, and images allowed
- **Size limits**: 10MB for uploads, 5MB for receipts
- **Directory structure**: `/users/{userId}/uploads/`, `/users/{userId}/reports/`

## Development Setup

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Initialize Project
```bash
firebase use --add your-project-id --alias default
```

### 3. Start Emulators
```bash
firebase emulators:start
```

This starts:
- **Firestore Emulator**: localhost:8080
- **Auth Emulator**: localhost:9099  
- **Functions Emulator**: localhost:5001
- **Storage Emulator**: localhost:9199
- **Hosting Emulator**: localhost:5000
- **Emulator UI**: localhost:4000

### 4. Environment Variables
Set in `client/.env.local`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_USE_EMULATOR=true
```

Set in `server/.env`:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_USE_EMULATOR=true
```

## Production Deployment

### 1. Build and Deploy
```bash
# Install dependencies
npm run install:all

# Build client
cd client && npm run build && cd ..

# Deploy all services
firebase deploy
```

### 2. Deploy Individual Services
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only database rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes
```

### 3. Environment-Specific Deployment
```bash
# Deploy to staging
firebase use staging
firebase deploy

# Deploy to production
firebase use production
firebase deploy
```

## Security Configuration

### Authentication Rules
1. **Email Verification**: Required for all new accounts
2. **Password Requirements**: Minimum 6 characters
3. **Session Management**: Auto-logout after inactivity

### Database Security
1. **User Isolation**: All data scoped to authenticated user
2. **Input Validation**: Type checking in security rules
3. **Rate Limiting**: Built-in Firestore quotas

### Storage Security
1. **File Type Validation**: Only allowed MIME types
2. **Size Restrictions**: Prevent large file uploads
3. **Access Control**: User-scoped file access

## Monitoring and Logging

### Firebase Console
- **Authentication**: Monitor user sign-ups and activity
- **Firestore**: Query performance and usage metrics
- **Functions**: Execution logs and performance
- **Storage**: File upload activity and storage usage

### Cloud Logging
```bash
# View function logs
firebase functions:log

# Stream real-time logs
firebase functions:log --follow

# Filter by function
firebase functions:log --only api
```

### Performance Monitoring
Enable in client application:
```javascript
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

## Backup and Recovery

### Database Backup
```bash
# Export Firestore data
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)

# Import from backup
gcloud firestore import gs://your-backup-bucket/20240115
```

### Security Rules Versioning
- Rules are versioned automatically in Firebase Console
- Keep local copies in version control
- Test rules before deployment with emulator

## Troubleshooting

### Common Issues

**Authentication Errors**
- Check API keys in environment variables
- Verify authorized domains in Firebase Console
- Clear browser cache and local storage

**Firestore Permission Denied**
- Verify security rules match data structure
- Check user authentication status
- Ensure userId fields are correctly set

**Function Deployment Failures**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review function logs for specific errors

**Storage Upload Failures**
- Check file size and type restrictions
- Verify storage rules allow the operation
- Ensure user has proper authentication

### Debug Commands
```bash
# Validate Firestore rules
firebase firestore:rules:validate

# Test security rules locally
firebase emulators:exec --ui "npm test"

# Check project configuration
firebase projects:list
firebase use --debug
```

## Migration Notes

### From Previous Versions
1. **Collection Renames**: 
   - `classificationRules` → `classification-rules`
   - `userProfiles` → `users`
   - `employees` → `payees`

2. **Index Updates**: 
   - Added company-scoped indexes
   - Updated field names for consistency

3. **Security Rule Changes**:
   - Simplified authentication checks
   - Added missing collection rules
   - Updated collection names

### Data Migration
If migrating existing data:
1. Export current data
2. Transform collection/field names
3. Re-import with new structure
4. Verify with test queries

## Cost Optimization

### Firestore
- Use pagination to limit reads
- Implement caching strategies
- Optimize query patterns

### Storage
- Implement lifecycle policies for old files
- Compress PDFs before upload
- Clean up temporary files

### Functions
- Use appropriate memory allocation
- Implement connection pooling
- Monitor execution time

## Future Enhancements

### Planned Features
1. **Multi-region deployment** for global performance
2. **Advanced security rules** with custom claims
3. **Real-time notifications** using FCM
4. **Automated backups** with Cloud Scheduler
5. **Performance monitoring** dashboards

### Infrastructure Improvements
1. **CDN integration** for faster file delivery
2. **Database optimization** with advanced indexing
3. **Error tracking** integration
4. **Load balancing** for high availability
