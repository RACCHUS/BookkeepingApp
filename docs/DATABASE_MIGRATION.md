# Database Provider Migration Guide

## Overview

The Bookkeeping App now supports multiple database providers through an adapter pattern. You can switch between **Supabase** (default) and **Firebase** by changing a single environment variable.

## Quick Start

### Using Supabase (Default)

1. Create a Supabase project at https://supabase.com

2. Add to your `.env` file:
```env
# Database Provider
DB_PROVIDER=supabase

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run the database schema:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `server/database/supabase-schema.sql`
   - Execute the SQL

### Using Firebase (Legacy)

1. Add to your `.env` file:
```env
# Database Provider
DB_PROVIDER=firebase

# Firebase Configuration (existing)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PROVIDER` | Database provider: `supabase` or `firebase` | `supabase` |
| `AUTH_PROVIDER` | Auth provider (if different from DB) | Same as `DB_PROVIDER` |
| `SUPABASE_URL` | Supabase project URL | Required for Supabase |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Required for Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server) | Required for Supabase |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Controllers/Routes                       │
│                  (Use `db` from services)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseAdapter                           │
│               (Abstract interface)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  SupabaseAdapter │    │  FirebaseAdapter │
│   (PostgreSQL)   │    │   (Firestore)    │
└──────────────────┘    └──────────────────┘
```

## File Structure

```
server/
├── config/
│   └── supabase.js          # Supabase client configuration
├── database/
│   └── supabase-schema.sql  # PostgreSQL schema
├── services/
│   ├── adapters/
│   │   ├── DatabaseAdapter.js   # Abstract base class
│   │   ├── SupabaseAdapter.js   # Supabase implementation
│   │   ├── FirebaseAdapter.js   # Firebase wrapper
│   │   └── index.js             # Factory & exports
│   └── legacy/
│       └── firebase/            # Original Firebase services
│           ├── cleanFirebaseService.js
│           ├── companyService.js
│           ├── payeeService.js
│           └── incomeSourceService.js
```

## Usage in Code

### New Code (Recommended)

```javascript
import { db } from './services/index.js';

// Use the adapter directly
const transactions = await db.getTransactions(userId, { limit: 100 });
const company = await db.createCompany(userId, { name: 'My Company' });
```

### Legacy Code (Still Works)

```javascript
import { firebaseService } from './services/index.js';

// Old Firebase service still available
const transactions = await firebaseService.getTransactions(userId);
```

## Switching Providers at Runtime

```javascript
import { switchDatabaseProvider } from './services/adapters/index.js';

// Switch to Firebase temporarily
await switchDatabaseProvider('firebase');

// Switch back to Supabase
await switchDatabaseProvider('supabase');
```

## Database Schema Mapping

| Firestore Collection | Supabase Table | Notes |
|---------------------|----------------|-------|
| `transactions` | `transactions` | Full feature parity |
| `companies` | `companies` | Full feature parity |
| `payees` | `payees` | Full feature parity |
| `uploads` | `uploads` | Full feature parity |
| `incomeSources` | `income_sources` | Snake_case in PG |
| `classificationRules` | `classification_rules` | Snake_case in PG |

## Supabase Benefits

1. **Unlimited reads** on free tier (vs Firebase 50k/day)
2. **PostgreSQL** - Better for relational financial data
3. **Built-in auth** with Row Level Security
4. **Real-time subscriptions** included
5. **Self-hostable** option available

## Migration Checklist

- [ ] Create Supabase project
- [ ] Run SQL schema in Supabase SQL Editor
- [ ] Update `.env` with Supabase credentials
- [ ] Set `DB_PROVIDER=supabase`
- [ ] Restart server
- [ ] Test all endpoints
- [ ] (Optional) Migrate existing data

## Data Migration Script

To migrate existing Firebase data to Supabase, use:

```bash
# Coming soon - data migration script
node scripts/migrate-firebase-to-supabase.js
```

## Rollback to Firebase

If you need to switch back:

1. Change `.env`:
```env
DB_PROVIDER=firebase
```

2. Restart the server

Your Firebase data and services are still intact in `server/services/legacy/firebase/`.

## Troubleshooting

### "Supabase is not configured"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### "Authentication service not available"
- Ensure the auth provider matches your setup
- For Firebase auth with Supabase DB: `AUTH_PROVIDER=firebase`

### Row Level Security Errors
- Make sure to run the full schema including RLS policies
- Use service role key on server (bypasses RLS)
