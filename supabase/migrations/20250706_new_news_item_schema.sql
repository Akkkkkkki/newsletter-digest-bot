-- =============================================
-- NEWS ITEM–CENTRIC SCHEMA MIGRATION (2024-05)
-- =============================================

-- 0. DROP RELEVANT INDEXES FIRST
DROP INDEX IF EXISTS idx_user_analytics_user_action;
DROP INDEX IF EXISTS idx_user_analytics_newsletter;
DROP INDEX IF EXISTS idx_insights_category;
DROP INDEX IF EXISTS idx_insights_sentiment;
DROP INDEX IF EXISTS idx_insights_embedding;
DROP INDEX IF EXISTS idx_newsletters_status;
DROP INDEX IF EXISTS idx_newsletters_sender;
DROP INDEX IF EXISTS idx_topics_user_active;
DROP INDEX IF EXISTS idx_similarity_groups_embedding;

-- 1. DROP REDUNDANT TABLES (if exist)
DROP TABLE IF EXISTS public.user_analytics CASCADE;
DROP TABLE IF EXISTS public.newsletter_topics CASCADE;
DROP TABLE IF EXISTS public.topic_clusters CASCADE;
DROP TABLE IF EXISTS public.newsletter_insights CASCADE;
DROP TABLE IF EXISTS public.newsletter_similarity_groups CASCADE;
DROP TABLE IF EXISTS public.newsletter_group_membership CASCADE;

-- 2. CREATE news_items TABLE
CREATE TABLE IF NOT EXISTS public.news_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES public.newsletters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.newsletter_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    url TEXT,
    position INTEGER,
    embedding vector(1536),
    topics TEXT[] DEFAULT '{}',
    people_mentioned TEXT[] DEFAULT '{}',
    products_mentioned TEXT[] DEFAULT '{}',
    companies_mentioned TEXT[] DEFAULT '{}',
    events_mentioned JSONB DEFAULT '[]'::jsonb,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    extraction_model TEXT DEFAULT 'gpt-3.5-turbo',
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_news_items_user ON public.news_items(user_id);
CREATE INDEX IF NOT EXISTS idx_news_items_newsletter ON public.news_items(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_news_items_embedding ON public.news_items USING ivfflat (embedding vector_cosine_ops);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own news items" ON public.news_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own news items" ON public.news_items
    FOR ALL USING (auth.uid() = user_id);

-- 5. TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION public.handle_news_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_news_items_updated_at
    BEFORE UPDATE ON public.news_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_news_items_updated_at();

-- =============================================
-- END MIGRATION
-- ============================================= 