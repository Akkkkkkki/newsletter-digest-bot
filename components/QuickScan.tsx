"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { TrendingUp, Users, Clock, Star, Activity, ExternalLink } from "lucide-react"

interface TopReferencedStory {
  id: string;
  title: string;
  summary: string;
  mention_count: number;
  trending_score: number;
  sources: Array<{
    name: string;
    email: string;
    credibility_score: number;
  }>;
  first_seen: string;
  last_updated: string;
  trend_analysis?: string;
  impact_assessment?: string;
}

interface VoiceUpdate {
  source: {
    id: string;
    name: string;
    email: string;
    voice_priority: number;
    authority_score: number;
    expertise_keywords: string[];
  };
  latest_headline: {
    id: string;
    title: string;
    summary: string;
    published_at: string;
    importance_score: number;
  };
  activity_summary: {
    items_this_period: number;
    last_active: string;
  };
}

export default function QuickScan() {
  const [activeTab, setActiveTab] = useState<'referenced' | 'voices'>('referenced');
  const [topReferenced, setTopReferenced] = useState<TopReferencedStory[]>([]);
  const [voiceUpdates, setVoiceUpdates] = useState<VoiceUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch data on mount and tab change
  useEffect(() => {
    if (user) {
      if (activeTab === 'referenced') {
        fetchTopReferenced();
      } else {
        fetchVoiceUpdates();
      }
    }
  }, [user, activeTab]);

  const fetchTopReferenced = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/headlines/top-referenced?user_id=${user.id}&period_hours=24&min_mentions=2&limit=15`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch top referenced stories');
      }
      
      setTopReferenced(data.headlines || []);
    } catch (err: any) {
      setError(err.message);
      setTopReferenced([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceUpdates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/headlines/voice-updates?user_id=${user.id}&period_hours=24&min_priority=1&limit=15`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch voice updates');
      }
      
      setVoiceUpdates(data.updates || []);
    } catch (err: any) {
      setError(err.message);
      setVoiceUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const updateVoicePriority = async (sourceId: string, priority: number) => {
    try {
      const response = await fetch('/api/headlines/voice-priority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          source_id: sourceId,
          voice_priority: priority
        })
      });
      
      if (response.ok) {
        // Refresh voice updates
        fetchVoiceUpdates();
      }
    } catch (error) {
      console.error('Error updating voice priority:', error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Sign in to view your quick scan</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quick Scan</h1>
        <p className="text-gray-600">Get up to speed in under 3 minutes</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('referenced')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'referenced'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Top Referenced</span>
              {topReferenced.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                  {topReferenced.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('voices')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'voices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Voice Updates</span>
              {voiceUpdates.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                  {voiceUpdates.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <Activity className="w-4 h-4 animate-spin" />
            <span>Loading {activeTab === 'referenced' ? 'trending stories' : 'voice updates'}...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={activeTab === 'referenced' ? fetchTopReferenced : fetchVoiceUpdates}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {activeTab === 'referenced' && <TopReferencedFeed stories={topReferenced} />}
          {activeTab === 'voices' && <VoiceUpdatesFeed updates={voiceUpdates} onUpdatePriority={updateVoicePriority} />}
        </>
      )}
    </div>
  );
}

function TopReferencedFeed({ stories }: { stories: TopReferencedStory[] }) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No trending stories found in the last 24 hours</p>
        <p className="text-sm">Stories need 2+ mentions to appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stories.map((story, index) => (
        <div key={story.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          {/* Story Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">
                  {story.mention_count}x mentioned
                </span>
                <span className="text-xs text-gray-500">
                  Score: {story.trending_score?.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(story.last_updated).toLocaleTimeString()}
            </div>
          </div>

          {/* Story Content */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{story.title}</h3>
          <p className="text-gray-700 mb-4">{story.summary}</p>

          {/* Analysis */}
          {story.trend_analysis && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">{story.trend_analysis}</p>
            </div>
          )}

          {/* Sources */}
          <div className="flex flex-wrap gap-2">
            {story.sources.slice(0, 5).map((source, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                title={source.email}
              >
                {source.name}
              </span>
            ))}
            {story.sources.length > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{story.sources.length - 5} more
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VoiceUpdatesFeed({ 
  updates, 
  onUpdatePriority 
}: { 
  updates: VoiceUpdate[];
  onUpdatePriority: (sourceId: string, priority: number) => void;
}) {
  if (updates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No voice updates in the last 24 hours</p>
        <p className="text-sm">Set voice priorities in your sources to see updates here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <div key={update.source.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          {/* Source Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {update.source.voice_priority > 0 && (
                  <Star className="w-4 h-4 text-yellow-500" />
                )}
                <h3 className="font-semibold text-gray-900">{update.source.name}</h3>
                <span className="text-xs text-gray-500">
                  Priority: {update.source.voice_priority}
                </span>
              </div>
            </div>
            
            {/* Priority Controls */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((priority) => (
                <button
                  key={priority}
                  onClick={() => onUpdatePriority(update.source.id, priority)}
                  className={`w-6 h-6 rounded text-xs ${
                    update.source.voice_priority === priority
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={`Set priority to ${priority}`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Latest Headline */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-1">{update.latest_headline.title}</h4>
            <p className="text-gray-700 text-sm mb-2">{update.latest_headline.summary}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(update.latest_headline.published_at).toLocaleTimeString()}
              </span>
              <span>
                Importance: {(update.latest_headline.importance_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{update.activity_summary.items_this_period} items today</span>
              {update.source.expertise_keywords.length > 0 && (
                <div className="flex gap-1">
                  {update.source.expertise_keywords.slice(0, 3).map((keyword, i) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-1 rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">
              Authority: {(update.source.authority_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}