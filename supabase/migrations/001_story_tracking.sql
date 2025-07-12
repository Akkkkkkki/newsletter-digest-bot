-- Migration: Add story frequency tracking system
-- Run this in Supabase SQL Editor

-- Add story frequency tracking table
CREATE TABLE story_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Story identification (using LLM-generated cluster ID)
  story_cluster_id text NOT NULL,
  canonical_title text NOT NULL,
  canonical_summary text,
  
  -- Frequency data
  mention_count integer DEFAULT 1,
  first_mentioned_at timestamptz DEFAULT now(),
  last_mentioned_at timestamptz DEFAULT now(),
  
  -- Source tracking (jsonb for flexibility)
  mentioning_sources jsonb DEFAULT '[]'::jsonb,
  news_item_ids uuid[] DEFAULT '{}',
  
  -- LLM-generated insights
  trend_analysis text,
  impact_assessment text,
  key_entities jsonb DEFAULT '{}'::jsonb,
  
  -- Ranking scores
  trending_score numeric(5,2) DEFAULT 0.0,
  importance_score numeric(3,2) DEFAULT 0.5,
  velocity_score numeric(3,2) DEFAULT 0.0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, story_cluster_id)
);

-- Indexes for fast frequency queries
CREATE INDEX idx_story_mentions_frequency 
ON story_mentions(user_id, mention_count DESC, last_mentioned_at DESC);

CREATE INDEX idx_story_mentions_trending 
ON story_mentions(user_id, trending_score DESC, last_mentioned_at DESC);

-- Add voice monitoring fields to newsletter_sources
ALTER TABLE newsletter_sources 
ADD COLUMN voice_priority integer DEFAULT 0,
ADD COLUMN last_content_at timestamptz,
ADD COLUMN content_frequency numeric(3,2) DEFAULT 0.0,
ADD COLUMN expertise_keywords text[] DEFAULT '{}';

-- Index for voice monitoring
CREATE INDEX idx_sources_voice_priority 
ON newsletter_sources(user_id, voice_priority DESC, last_content_at DESC) 
WHERE is_active = true;