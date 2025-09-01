# Database Setup - REMOTE SUPABASE ONLY

⚠️ **CRITICAL**: This project uses **REMOTE SUPABASE DATABASE ONLY**

## Important Notes for Developers

- **NO LOCAL DATABASE**: We do not maintain a local Supabase instance or Docker setup
- **REMOTE CONNECTIONS**: All database operations connect directly to the remote Supabase server
- **ENVIRONMENT REQUIRED**: Proper environment variables must be configured to connect to remote instance

## Required Environment Variables

All developers must have these environment variables configured:

```bash
# Remote Supabase Connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Client-side (NEXT_PUBLIC_ prefix required for Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema Management

### Current Schema
- The production schema is maintained in the remote Supabase instance
- All tables, indexes, RLS policies, and functions are configured remotely

### Migrations
- Migration files in `supabase/migrations/` are for reference and deployment
- To apply migrations to the remote database:
  1. **Supabase Dashboard**: Copy SQL from migration files and run in SQL Editor
  2. **CLI (if linked)**: `npx supabase db push --linked`

### Development Workflow

1. **Never** assume local database exists
2. **Always** test changes against the remote database
3. **Coordinate** schema changes with team to avoid conflicts
4. **Document** any schema changes in migration files for reference

## Testing Database Operations

To test database operations during development:

```bash
# Start development server (connects to remote DB)
npm run dev

# Build application (validates remote connections)
npm run build
```

## Common Issues

### "Cannot connect to database"
- Verify environment variables are set correctly
- Check Supabase project is active and accessible
- Confirm network connectivity

### "Missing environment variables"
- Ensure all `NEXT_PUBLIC_` variables are set for client-side operations
- Verify server-side variables for API routes

### "Schema mismatch"
- Check if remote database schema matches expected structure
- Apply any pending migrations via Supabase dashboard

## Architecture

```
Next.js Application
├── Client Components (lib/supabase.ts) → Remote Supabase DB
├── API Routes (lib/supabase.node.js) → Remote Supabase DB
└── No Local Database ❌
```

This approach ensures:
- ✅ Consistent data across all developers
- ✅ No local setup complexity
- ✅ Production-like environment for development
- ✅ Automatic scaling and backups via Supabase