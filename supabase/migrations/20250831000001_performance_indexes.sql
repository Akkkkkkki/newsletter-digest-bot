-- Performance optimization indexes for Phase 2 critical fixes
-- These indexes address the most critical query timeout issues
-- 
-- IMPORTANT: This project uses REMOTE SUPABASE ONLY
-- Apply this migration to the remote Supabase database using:
-- 1. Supabase Dashboard SQL Editor, OR
-- 2. npx supabase db push --linked (if project is linked)

-- Critical index for news_items queries by user_id + date (used heavily in story clustering)
CREATE INDEX CONCURRENTLY idx_news_items_user_created_at ON news_items(user_id, created_at DESC);

-- Optimize story_mentions queries (trending score and date-based filtering) 
CREATE INDEX CONCURRENTLY idx_story_mentions_user_trending ON story_mentions(user_id, last_mentioned_at DESC, trending_score DESC);

-- Optimize embeddings similarity search performance
CREATE INDEX CONCURRENTLY idx_news_items_embedding_hnsw ON news_items 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Optimize story clustering join queries
CREATE INDEX CONCURRENTLY idx_story_mention_news_items_story_id ON story_mention_news_items(story_mention_id);

-- Optimize newsletter processing queries
CREATE INDEX CONCURRENTLY idx_newsletters_user_status ON newsletters(user_id, status) 
WHERE status IN ('pending', 'processing');

-- Optimize processing logs queries (used for error tracking)
CREATE INDEX CONCURRENTLY idx_processing_logs_user_step_date ON processing_logs(user_id, step, created_at DESC);