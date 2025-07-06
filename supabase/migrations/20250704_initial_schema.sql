-- =============================================
-- NEWSLETTER DIGEST BOT DATABASE SCHEMA
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS TABLE
-- =============================================
-- Extended profiles for authenticated users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    gmail_refresh_token TEXT,
    gmail_connected BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{"digest_frequency": "daily", "categories": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================
-- NEWSLETTER SOURCES TABLE
-- =============================================
-- Track and manage newsletter senders
CREATE TABLE IF NOT EXISTS public.newsletter_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    name TEXT,
    credibility_score DECIMAL(3,2) DEFAULT 0.5 CHECK (credibility_score >= 0 AND credibility_score <= 1),
    category TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, email_address)
);

-- =============================================
-- NEWSLETTERS TABLE
-- =============================================
-- Store individual newsletter emails
CREATE TABLE IF NOT EXISTS public.newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.newsletter_sources(id) ON DELETE SET NULL,
    gmail_message_id TEXT UNIQUE NOT NULL,
    thread_id TEXT,
    subject TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_content TEXT,
    cleaned_content TEXT,
    html_content TEXT,
    labels TEXT[],
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================
-- NEWSLETTER INSIGHTS TABLE
-- =============================================
-- AI-extracted insights from newsletters
CREATE TABLE IF NOT EXISTS public.newsletter_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID UNIQUE REFERENCES public.newsletters(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    key_topics TEXT[] DEFAULT '{}',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    category TEXT,
    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    companies_mentioned TEXT[] DEFAULT '{}',
    people_mentioned TEXT[] DEFAULT '{}',
    products_mentioned TEXT[] DEFAULT '{}',
    events_mentioned JSONB DEFAULT '[]'::jsonb,
    action_items TEXT[] DEFAULT '{}',
    links_extracted JSONB DEFAULT '[]'::jsonb,
    financial_data JSONB,
    technical_terms TEXT[] DEFAULT '{}',
    extraction_model TEXT DEFAULT 'gpt-3.5-turbo',
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================
-- TOPIC CLUSTERS TABLE
-- =============================================
-- Group related topics for better organization
CREATE TABLE IF NOT EXISTS public.topic_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#3B82F6',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, name)
);

-- =============================================
-- NEWSLETTER TOPICS TABLE
-- =============================================
-- Many-to-many relationship between newsletters and topic clusters
CREATE TABLE IF NOT EXISTS public.newsletter_topics (
    newsletter_id UUID REFERENCES public.newsletters(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (newsletter_id, cluster_id)
);

-- =============================================
-- USER ANALYTICS TABLE
-- =============================================
-- Track user engagement and reading patterns
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    newsletter_id UUID REFERENCES public.newsletters(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('viewed', 'clicked_link', 'marked_important', 'archived', 'shared')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_user_analytics_user_action ON public.user_analytics(user_id, action);
CREATE INDEX idx_user_analytics_newsletter ON public.user_analytics(newsletter_id);

-- =============================================
-- DIGEST SUMMARIES TABLE
-- =============================================
-- Store generated digest summaries
CREATE TABLE IF NOT EXISTS public.digest_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    newsletter_count INTEGER DEFAULT 0,
    top_topics TEXT[] DEFAULT '{}',
    key_insights TEXT[] DEFAULT '{}',
    summary_content TEXT,
    sentiment_analysis JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    viewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, period_start, period_end)
);

-- =============================================
-- PROCESSING LOGS TABLE
-- =============================================
-- Track processing history and errors
CREATE TABLE IF NOT EXISTS public.processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    newsletter_id UUID REFERENCES public.newsletters(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_newsletters_user_date ON public.newsletters(user_id, received_date DESC);
CREATE INDEX idx_newsletters_status ON public.newsletters(status) WHERE status = 'pending';
CREATE INDEX idx_newsletters_sender ON public.newsletters(sender_email);
CREATE INDEX idx_insights_category ON public.newsletter_insights(category);
CREATE INDEX idx_insights_sentiment ON public.newsletter_insights(sentiment);
CREATE INDEX idx_sources_user_active ON public.newsletter_sources(user_id, is_active);
CREATE INDEX idx_topics_user_active ON public.topic_clusters(user_id, is_active);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digest_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Newsletter sources policies
CREATE POLICY "Users can view own sources" ON public.newsletter_sources
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sources" ON public.newsletter_sources
    FOR ALL USING (auth.uid() = user_id);

-- Newsletters policies
CREATE POLICY "Users can view own newsletters" ON public.newsletters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own newsletters" ON public.newsletters
    FOR ALL USING (auth.uid() = user_id);

-- Newsletter insights policies
CREATE POLICY "Users can view insights for own newsletters" ON public.newsletter_insights
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.newsletters 
            WHERE newsletters.id = newsletter_insights.newsletter_id 
            AND newsletters.user_id = auth.uid()
        )
    );

-- Topic clusters policies
CREATE POLICY "Users can view own topic clusters" ON public.topic_clusters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own topic clusters" ON public.topic_clusters
    FOR ALL USING (auth.uid() = user_id);

-- Newsletter topics policies
CREATE POLICY "Users can view own newsletter topics" ON public.newsletter_topics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.newsletters 
            WHERE newsletters.id = newsletter_topics.newsletter_id 
            AND newsletters.user_id = auth.uid()
        )
    );

-- User analytics policies
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Digest summaries policies
CREATE POLICY "Users can view own digests" ON public.digest_summaries
    FOR SELECT USING (auth.uid() = user_id);

-- Processing logs policies
CREATE POLICY "Users can view own processing logs" ON public.processing_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_newsletter_sources_updated_at
    BEFORE UPDATE ON public.newsletter_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_topic_clusters_updated_at
    BEFORE UPDATE ON public.topic_clusters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate newsletter statistics
CREATE OR REPLACE FUNCTION public.get_newsletter_stats(user_uuid UUID)
RETURNS TABLE (
    total_newsletters BIGINT,
    total_sources BIGINT,
    newsletters_today BIGINT,
    newsletters_this_week BIGINT,
    top_categories TEXT[],
    average_sentiment DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT n.id) AS total_newsletters,
        COUNT(DISTINCT ns.id) AS total_sources,
        COUNT(DISTINCT n.id) FILTER (WHERE n.received_date >= CURRENT_DATE) AS newsletters_today,
        COUNT(DISTINCT n.id) FILTER (WHERE n.received_date >= CURRENT_DATE - INTERVAL '7 days') AS newsletters_this_week,
        ARRAY_AGG(DISTINCT ni.category ORDER BY ni.category) FILTER (WHERE ni.category IS NOT NULL) AS top_categories,
        AVG(CASE 
            WHEN ni.sentiment = 'positive' THEN 1.0
            WHEN ni.sentiment = 'neutral' THEN 0.0
            WHEN ni.sentiment = 'negative' THEN -1.0
        END) AS average_sentiment
    FROM public.newsletters n
    LEFT JOIN public.newsletter_sources ns ON n.source_id = ns.id
    LEFT JOIN public.newsletter_insights ni ON n.id = ni.newsletter_id
    WHERE n.user_id = user_uuid
    AND n.status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search newsletters by content
CREATE OR REPLACE FUNCTION public.search_newsletters(
    user_uuid UUID,
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    newsletter_id UUID,
    subject TEXT,
    sender_name TEXT,
    received_date TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id AS newsletter_id,
        n.subject,
        n.sender_name,
        n.received_date,
        ni.summary,
        ts_rank(
            to_tsvector('english', COALESCE(n.subject, '') || ' ' || 
                                   COALESCE(n.cleaned_content, '') || ' ' || 
                                   COALESCE(ni.summary, '')),
            plainto_tsquery('english', search_query)
        ) AS relevance_score
    FROM public.newsletters n
    LEFT JOIN public.newsletter_insights ni ON n.id = ni.newsletter_id
    WHERE n.user_id = user_uuid
    AND n.status = 'completed'
    AND (category_filter IS NULL OR ni.category = category_filter)
    AND (date_from IS NULL OR n.received_date >= date_from)
    AND (date_to IS NULL OR n.received_date <= date_to)
    AND (
        n.subject ILIKE '%' || search_query || '%' OR
        n.cleaned_content ILIKE '%' || search_query || '%' OR
        ni.summary ILIKE '%' || search_query || '%'
    )
    ORDER BY relevance_score DESC, n.received_date DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 