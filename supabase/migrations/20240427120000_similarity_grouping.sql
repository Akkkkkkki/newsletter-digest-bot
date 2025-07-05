-- =============================================
-- SIMILARITY GROUPING & VECTOR SEARCH MIGRATION
-- =============================================

-- Enable pgvector extension for vector search
CREATE EXTENSION IF NOT EXISTS "vector";

-- Add embedding column to newsletter_insights (1536-dim vector for OpenAI/Cohere)
ALTER TABLE public.newsletter_insights
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Table for LLM-driven similarity groups
CREATE TABLE IF NOT EXISTS public.newsletter_similarity_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    group_embedding vector(1536) NOT NULL,
    representative_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table mapping newsletter insights to similarity groups
CREATE TABLE IF NOT EXISTS public.newsletter_group_membership (
    group_id UUID REFERENCES public.newsletter_similarity_groups(id) ON DELETE CASCADE,
    newsletter_insight_id UUID REFERENCES public.newsletter_insights(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (group_id, newsletter_insight_id)
);

-- Index for fast vector search on group embedding
CREATE INDEX IF NOT EXISTS idx_similarity_groups_embedding ON public.newsletter_similarity_groups USING ivfflat (group_embedding vector_cosine_ops);
-- Index for fast vector search on insight embedding
CREATE INDEX IF NOT EXISTS idx_insights_embedding ON public.newsletter_insights USING ivfflat (embedding vector_cosine_ops);

-- RLS: Enable row level security
ALTER TABLE public.newsletter_similarity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_group_membership ENABLE ROW LEVEL SECURITY;

-- RLS: Only allow users to access their own groups
CREATE POLICY "Users can view own similarity groups" ON public.newsletter_similarity_groups
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own similarity groups" ON public.newsletter_similarity_groups
    FOR ALL USING (auth.uid() = user_id);

-- RLS: Only allow users to access group memberships for their own groups
CREATE POLICY "Users can view own group memberships" ON public.newsletter_group_membership
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_similarity_groups g
            WHERE g.id = newsletter_group_membership.group_id
            AND g.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can manage own group memberships" ON public.newsletter_group_membership
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.newsletter_similarity_groups g
            WHERE g.id = newsletter_group_membership.group_id
            AND g.user_id = auth.uid()
        )
    ); 