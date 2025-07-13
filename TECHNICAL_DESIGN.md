# Newsletter Digest Bot - Technical Design Document

## Recent Updates (June 2024)

- **Database schema is now complete**: All referenced tables (including `story_mentions`, `story_mention_news_items`, `processing_logs`) exist in Supabase, with `updated_at` columns and triggers for auditability.
- **All required triggers and functions** (e.g., `handle_updated_at()`) are implemented and attached to relevant tables.
- **OpenAI integration is now real**: The backend uses OpenAI API for extracting news items from newsletters and generating embeddings, replacing all mock logic.
- **Story clustering logic implemented**: Clustering now uses title similarity, entity overlap, and semantic similarity (via OpenAI embeddings) to group related news items.

---

## Executive Summary

This technical design focuses on creating a <3 minute headline scanning experience with two core features:
1. Top Referenced News: Most frequently mentioned stories ranked by cross-source mentions
2. Voice Monitoring: Tracking and surfacing content from your most important sources

## Architecture Overview

The system is composed of:
- **Frontend**: Next.js/React, mobile-first, minimal UI
- **Backend**: Vercel serverless functions (Node.js API)
- **Database**: Supabase (PostgreSQL + vector extension)
- **AI/LLM**: OpenAI GPT for extraction, summarization, and semantic grouping
- **Authentication**: Supabase Auth with Gmail OAuth

## Data Flow

1. User authenticates via Gmail OAuth (Supabase Auth)
2. Newsletters are fetched from Gmail
3. Content is processed by OpenAI (extraction, summarization, embedding)
4. News items are stored in Supabase, with metadata and vector embeddings
5. Story clustering and consensus/trending logic operate at the news item level
6. UI displays grouped, ranked news items for rapid scanning

## Database Model (High-Level)

The authoritative schema is managed in `supabase/schema.sql` and migration files. Below is a summary of the main tables and their relationships:

### Main Tables

- **users**
  - `id` (uuid, PK, references `auth.users.id`)
  - `email` (unique)
  - `full_name`, `gmail_refresh_token`, `gmail_connected`, `preferences`, `created_at`, `updated_at`

- **newsletter_sources**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → users.id)
  - `email_address` (unique per user), `name`, `credibility_score`, `category`, `description`, `is_active`, `metadata`, `voice_priority`, `last_content_at`, `content_frequency`, `expertise_keywords`, `created_at`, `updated_at`

- **newsletters**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → users.id)
  - `source_id` (uuid, FK → newsletter_sources.id)
  - `gmail_message_id` (unique), `thread_id`, `subject`, `sender_email`, `sender_name`, `received_date`, `raw_content`, `cleaned_content`, `html_content`, `labels`, `attachments`, `status`, `processed_at`, `created_at`

- **news_items**
  - `id` (uuid, PK)
  - `newsletter_id` (uuid, FK → newsletters.id)
  - `user_id` (uuid, FK → users.id)
  - `source_id` (uuid, FK → newsletter_sources.id)
  - `title`, `summary`, `content`, `url`, `position`, `embedding` (vector), `topics`, `people_mentioned`, `products_mentioned`, `companies_mentioned`, `events_mentioned`, `sentiment`, `importance_score`, `extraction_model`, `confidence_score`, `created_at`, `updated_at`

- **story_mentions**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → users.id)
  - `story_cluster_id` (text, LLM-generated), `canonical_title`, `canonical_summary`, `mention_count`, `first_mentioned_at`, `last_mentioned_at`, `mentioning_sources`, `news_item_ids`, `trend_analysis`, `impact_assessment`, `key_entities`, `trending_score`, `importance_score`, `velocity_score`, `created_at`, `updated_at`

- **story_mention_news_items**
  - `story_mention_id` (uuid, PK, FK → story_mentions.id)
  - `news_item_id` (uuid, PK, FK → news_items.id)
  - `updated_at` (timestamp)
  - Join table for many-to-many relationship between story_mentions and news_items

- **processing_logs**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → users.id)
  - `newsletter_id` (uuid, FK → newsletters.id)
  - `step` (text), `status` (text: started/completed/failed), `error_message`, `metadata`, `created_at`, `updated_at`
  - Used for tracking processing pipeline steps and errors

- **news_item_groups**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → users.id)
  - `period_start`, `period_end`, `summary`, `relevance_score`, `created_at`, `updated_at`
  - Used for consensus/trend grouping of news items

- **news_item_group_members**
  - `group_id` (uuid, PK, FK → news_item_groups.id)
  - `news_item_id` (uuid, PK, FK → news_items.id)
  - `updated_at` (timestamp)
  - Many-to-many relationship between groups and news items

### Indexes
- `idx_newsletters_user_date` on newsletters (user_id, received_date desc)
- `idx_news_items_user` on news_items (user_id)
- `idx_news_items_newsletter` on news_items (newsletter_id)
- `idx_news_items_embedding` on news_items (embedding, vector_cosine_ops)
- `idx_sources_user_active` on newsletter_sources (user_id, is_active)

### Triggers
- `handle_users_updated_at` on users (updates updated_at)
- `handle_news_items_updated_at` on news_items (updates updated_at)
- `handle_newsletter_sources_updated_at` on newsletter_sources (updates updated_at)
- `handle_story_mentions_updated_at` on story_mentions (updates updated_at)
- `handle_story_mention_news_items_updated_at` on story_mention_news_items (updates updated_at)
- `handle_processing_logs_updated_at` on processing_logs (updates updated_at)
- `handle_news_item_group_members_updated_at` on news_item_group_members (updates updated_at)
- `handle_news_item_groups_updated_at` on news_item_groups (updates updated_at)

> All join and tracking tables now have `updated_at` columns and triggers for auditability and consistency.

### Functions
- `handle_updated_at()` — generic trigger function for updating `updated_at` timestamp
- `handle_news_items_updated_at()` — specific trigger for news_items table

### Relationships
- users → newsletters, newsletter_sources, news_items, news_item_groups
- newsletter_sources → newsletters, news_items
- newsletters → news_items
- news_item_groups ↔ news_items (via news_item_group_members)

> **Note:** For the most up-to-date schema, always check the Supabase remote directly.

## API Endpoints (Overview)

- `/api/headlines/top-referenced`: Returns top referenced stories for a user and period
- `/api/headlines/voice-updates`: Returns latest updates from prioritized sources
- `/api/newsletters/sources`: Manage allowed newsletter senders
- `/api/newsletters/process`: Triggers newsletter processing pipeline

## Integration Points

- **Supabase**: Used for all persistent storage, authentication, and vector search
- **OpenAI**: Used for content extraction, summarization, and semantic similarity
- **Gmail API**: Used for fetching newsletter emails

## How to Inspect and Update the Database Schema

- **Supabase Dashboard**: View and manage tables, functions, policies, and extensions directly in the web UI
- **Migration Files**: All schema changes are tracked in `supabase/migrations/`—apply these to update the database
- **Live Schema**: To see the current schema, use the Supabase dashboard or run SQL queries directly
- **Policies & Functions**: Review and manage Row Level Security (RLS) policies and custom functions in the dashboard or migration files

> **Best Practice:** Always check the Supabase dashboard or migration files for the latest schema, policies, and functions. Do not rely on static documentation for implementation details.

## Implementation Plan (Summary)

- Fix critical issues (missing functions, error handling, performance)
- Implement story clustering and frequency tracking
- Build consensus and voice monitoring APIs
- Optimize for speed and mobile-first UX

## Code Quality & Testing
- Comprehensive error handling and retry logic
- Async processing and database optimization
- Input validation and sanitization
- Structured logging and monitoring

## Setup Instructions (Technical)

1. Clone the repository and install dependencies (`npm install`)
2. Set up Supabase and run the migrations in `supabase/migrations/`
3. Enable the `pgvector` extension and required functions in Supabase
4. Set up OpenAI and Gmail API credentials in your environment variables
5. Start the development server (`npm run dev`)
6. Deploy to Vercel as needed

## Conclusion

This design prioritizes speed and relevance for busy professionals who need to stay informed quickly. The two-tab approach (Top Referenced + Voice Monitoring) provides both consensus view and personalized source tracking, enabling effective headline scanning in under 3 minutes.

For all schema, policy, and function details, always refer to the Supabase dashboard or the migration files in `supabase/migrations/`.