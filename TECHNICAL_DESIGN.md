# Newsletter Digest Bot - Technical Design Document

## Executive Summary

This technical design focuses on creating a **<3 minute headline scanning experience** with two core features:
1. **Top Referenced News**: Most frequently mentioned stories ranked by cross-source mentions
2. **Voice Monitoring**: Tracking and surfacing content from your most important sources

## Critical Issues to Fix First

Based on the code analysis, these must be resolved immediately:

### 1. Missing Database Function (CRITICAL)
The `match_news_items` RPC function is called but doesn't exist:

```sql
-- Add to Supabase SQL Editor
CREATE OR REPLACE FUNCTION match_news_items(
  query_embedding vector(1536),
  user_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  authority_score numeric,
  importance_score numeric,
  similarity float,
  newsletter_id uuid,
  newsletters jsonb
)
LANGUAGE sql
AS $$
  SELECT 
    ni.id,
    ni.title,
    ni.summary,
    ni.importance_score,
    ni.confidence_score as authority_score,
    (1 - (ni.embedding <=> query_embedding)) as similarity,
    ni.newsletter_id,
    jsonb_build_object(
      'sender_name', n.sender_name,
      'sender_email', n.sender_email,
      'received_date', n.received_date,
      'subject', n.subject
    ) as newsletters
  FROM news_items ni
  JOIN newsletters n ON ni.newsletter_id = n.id
  WHERE ni.user_id = match_news_items.user_id
    AND ni.created_at >= period_start
    AND ni.created_at <= period_end
    AND ni.embedding IS NOT NULL
    AND (1 - (ni.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

### 2. Missing Processing Logs Table
```sql
-- Add to Supabase SQL Editor
CREATE TABLE processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

### 3. Performance Optimization
```sql
-- Add better indexes for fast headline scanning
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_user_created_importance 
ON news_items(user_id, created_at DESC, importance_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_embedding_hnsw 
ON news_items USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

## Core Product Architecture

### <3 Minute Headline Experience

The goal is to surface the most important information in under 3 minutes of scanning:

```
┌─────────────────────────────────────────────────────────┐
│                  Quick Scan Interface                   │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  Top Referenced │  │     Voice Monitoring        │   │
│  │      News       │  │                             │   │
│  │                 │  │  Most Important Sources     │   │
│  │ • Story A (5x)  │  │                             │   │
│  │ • Story B (4x)  │  │ • Karpathy: Latest AI      │   │
│  │ • Story C (3x)  │  │ • a16z: Market Analysis    │   │
│  │                 │  │ • Stripe: Product Update   │   │
│  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow for Quick Scanning

```typescript
interface QuickScanData {
  topReferenced: {
    story: string;
    mentionCount: number;
    sources: string[];
    latestUpdate: Date;
    importance: number;
  }[];
  
  voiceUpdates: {
    source: string;
    authorityScore: number;
    latestHeadline: string;
    publishedAt: Date;
    summary: string;
  }[];
}
```

## Enhanced Schema for Quick Scanning

### Add Frequency Tracking Table
```sql
-- Track story mention frequency across sources
CREATE TABLE story_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Story identification
  story_cluster_id text NOT NULL, -- Generated hash of similar stories
  canonical_title text NOT NULL,
  canonical_summary text,
  
  -- Frequency data
  mention_count integer DEFAULT 1,
  first_mentioned_at timestamptz DEFAULT now(),
  last_mentioned_at timestamptz DEFAULT now(),
  
  -- Source tracking
  mentioning_sources jsonb DEFAULT '[]', -- Array of source info
  news_item_ids uuid[] DEFAULT '{}', -- Reference to actual news items
  
  -- Ranking
  trending_score numeric(5,2) DEFAULT 0.0,
  importance_score numeric(3,2) DEFAULT 0.5,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, story_cluster_id)
);

-- Index for fast frequency queries
CREATE INDEX idx_story_mentions_frequency 
ON story_mentions(user_id, mention_count DESC, last_mentioned_at DESC);

CREATE INDEX idx_story_mentions_trending 
ON story_mentions(user_id, trending_score DESC, last_mentioned_at DESC);
```

### Enhanced Source Authority Tracking
```sql
-- Add voice monitoring fields to newsletter_sources
ALTER TABLE newsletter_sources ADD COLUMN IF NOT EXISTS voice_priority integer DEFAULT 0; -- 0=normal, 1-10=VIP
ALTER TABLE newsletter_sources ADD COLUMN IF NOT EXISTS last_content_at timestamptz;
ALTER TABLE newsletter_sources ADD COLUMN IF NOT EXISTS content_frequency numeric(3,2) DEFAULT 0.0; -- posts per week

-- Index for voice monitoring
CREATE INDEX idx_sources_voice_priority 
ON newsletter_sources(user_id, voice_priority DESC, last_content_at DESC) 
WHERE is_active = true;
```

## API Endpoints for Quick Scanning

### Top Referenced News API
```typescript
// GET /api/headlines/top-referenced
interface TopReferencedRequest {
  user_id: string;
  period_hours?: number; // Default 24 hours
  min_mentions?: number; // Default 2
  limit?: number; // Default 10
}

interface TopReferencedResponse {
  headlines: {
    id: string;
    title: string;
    summary: string;
    mention_count: number;
    trending_score: number;
    sources: {
      name: string;
      email: string;
      authority_score: number;
    }[];
    first_seen: string;
    last_updated: string;
  }[];
  metadata: {
    total_stories: number;
    scan_time_ms: number;
    period_covered: string;
  };
}
```

### Voice Monitoring API
```typescript
// GET /api/headlines/voice-updates
interface VoiceUpdatesRequest {
  user_id: string;
  period_hours?: number; // Default 24 hours
  min_priority?: number; // Filter by voice priority
  limit?: number; // Default 10
}

interface VoiceUpdatesResponse {
  updates: {
    source: {
      name: string;
      email: string;
      voice_priority: number;
      authority_score: number;
    };
    latest_headline: {
      title: string;
      summary: string;
      published_at: string;
      importance_score: number;
    };
    activity_summary: {
      items_this_period: number;
      last_active: string;
    };
  }[];
  metadata: {
    tracked_voices: number;
    active_voices: number;
    scan_time_ms: number;
  };
}
```

## Implementation Plan

### Phase 1: Fix Critical Issues (Week 1)
1. **Add missing database functions** to Supabase
2. **Fix security vulnerabilities** (move tokens to HTTP-only cookies)
3. **Add error handling** with retry logic for OpenAI API
4. **Optimize database indexes** for performance

### Phase 2: Story Frequency Tracking (Week 2)
1. **Implement story clustering** algorithm for duplicate detection
2. **Build frequency tracking** system
3. **Create Top Referenced API** endpoint
4. **Add simple frequency-based UI** tab

### Phase 3: Voice Monitoring (Week 3)
1. **Enhance source authority** scoring
2. **Add voice priority** management
3. **Build Voice Updates API** endpoint
4. **Create voice monitoring UI** tab

### Phase 4: Quick Scan UX (Week 4)
1. **Redesign main interface** for <3min scanning
2. **Add real-time updates** for trending stories
3. **Implement smart notifications** for VIP sources
4. **Optimize mobile experience** for quick consumption

## Story Clustering Algorithm

For detecting when the same story is mentioned across multiple sources:

```typescript
class StoryClusteringEngine {
  async findSimilarStories(newItem: NewsItem, existingStories: NewsItem[]): Promise<string | null> {
    // 1. Quick title similarity check
    const titleSimilar = existingStories.find(story => 
      this.calculateTitleSimilarity(newItem.title, story.title) > 0.8
    );
    
    if (titleSimilar) return this.generateClusterId(titleSimilar);
    
    // 2. Semantic similarity using embeddings
    const semanticMatches = await this.findSemanticMatches(newItem, existingStories);
    
    if (semanticMatches.length > 0) {
      return this.generateClusterId(semanticMatches[0]);
    }
    
    // 3. Entity overlap check
    const entityMatches = this.findEntityOverlap(newItem, existingStories);
    if (entityMatches.length > 0) {
      return this.generateClusterId(entityMatches[0]);
    }
    
    return null; // New unique story
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    // Simple word overlap + edit distance
    const words1 = new Set(title1.toLowerCase().split(' '));
    const words2 = new Set(title2.toLowerCase().split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private generateClusterId(referenceItem: NewsItem): string {
    // Create stable hash from key content elements
    const content = `${referenceItem.title}_${referenceItem.companies_mentioned.join('_')}_${referenceItem.topics.join('_')}`;
    return this.hashString(content);
  }
}
```

## Frontend Components

### Quick Scan Interface
```typescript
// components/QuickScan.tsx
export default function QuickScan() {
  const [activeTab, setActiveTab] = useState<'referenced' | 'voices'>('referenced');
  const { user } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'referenced' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('referenced')}
        >
          Top Referenced ({topReferenced?.length || 0})
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'voices' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('voices')}
        >
          Voice Updates ({voiceUpdates?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'referenced' ? (
        <TopReferencedFeed />
      ) : (
        <VoiceUpdatesFeed />
      )}
    </div>
  );
}

// components/TopReferencedFeed.tsx
function TopReferencedFeed() {
  const { data: headlines, loading } = useTopReferenced();
  
  if (loading) return <div>Loading trending headlines...</div>;
  
  return (
    <div className="space-y-4">
      {headlines?.map(headline => (
        <div key={headline.id} className="border rounded-lg p-4 hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">{headline.title}</h3>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {headline.mention_count}x mentioned
            </span>
          </div>
          <p className="text-gray-600 mb-3">{headline.summary}</p>
          <div className="flex flex-wrap gap-2">
            {headline.sources.map((source, i) => (
              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {source.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Performance Targets

### <3 Minute Scanning Goals
- **Page load**: <2 seconds
- **API response**: <500ms for headlines
- **Content scan**: 20-30 headlines max per view
- **Update frequency**: Real-time for top stories
- **Mobile optimized**: Touch-friendly, readable on phone

### Database Performance
- **Top referenced query**: <200ms
- **Voice updates query**: <150ms
- **Story clustering**: <1 second per new item
- **Concurrent users**: Support 1000+ simultaneous

## Monitoring & Analytics

Track user behavior to optimize the 3-minute experience:

```typescript
interface QuickScanAnalytics {
  session_duration: number; // Target: <180 seconds
  headlines_viewed: number; // Target: 15-25
  click_through_rate: number; // Target: >15%
  return_frequency: number; // Target: >3x per day
  voice_engagement: number; // Which sources get most attention
}
```

## Conclusion

This design prioritizes speed and relevance for busy professionals who need to stay informed quickly. The two-tab approach (Top Referenced + Voice Monitoring) provides both consensus view and personalized source tracking, enabling effective headline scanning in under 3 minutes.

Key success factors:
1. **Fix critical bugs first** - system must work reliably
2. **Optimize for speed** - every query must be fast
3. **Smart ranking** - surface only the most important content
4. **Simple UX** - clear, scannable interface
5. **Mobile-first** - optimized for on-the-go consumption