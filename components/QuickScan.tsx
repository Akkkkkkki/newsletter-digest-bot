'use client'

import { useState, useEffect, memo } from 'react'
import { TrendingUp, Users, Activity, Star, Clock, ExternalLink } from 'lucide-react'

interface QuickScanProps {
  userId: string
}

const TopReferencedFeed = memo(({ stories }: { stories: any[] }) => {
  if (stories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No trending stories in the last 24 hours</p>
        <p className="text-sm">Stories will appear here when mentioned across multiple sources</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stories.map((story: any) => (
        <div key={story.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex-1 mr-4">{story.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {story.mention_count}
              </span>
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                {Math.round(story.trending_score)}
              </span>
            </div>
          </div>
          
          <p className="text-gray-700 text-sm mb-4">{story.summary}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(story.last_updated).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Velocity: {story.velocity_score}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {story.sources && story.sources.map((source: any, idx: number) => (
              <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {source.name || source.email}
              </span>
            ))}
          </div>
          
          {story.news_items && story.news_items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Related Articles</h4>
              {story.news_items.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600 truncate flex-1">{item.title}</span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

const VoiceUpdatesFeed = memo(({ updates, onUpdatePriority }: { updates: any[]; onUpdatePriority: (sourceId: string, priority: number) => void; }) => {
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
      {updates.map((update: any) => (
        <div key={update.source.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {update.source.voice_priority > 0 && (
                  <Star className="w-4 h-4 text-yellow-500" />
                )}
                <h3 className="font-semibold text-gray-900">{update.source.name}</h3>
                <span className="text-xs text-gray-500">Priority: {update.source.voice_priority}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((priority) => (
                <button
                  key={priority}
                  onClick={() => onUpdatePriority(update.source.id, priority)}
                  className={`w-6 h-6 rounded text-xs ${update.source.voice_priority === priority ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  title={`Set priority to ${priority}`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-1">{update.latest_headline.title}</h4>
            <p className="text-gray-700 text-sm mb-2">{update.latest_headline.summary}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(update.latest_headline.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default function QuickScan({ userId }: QuickScanProps) {
  const [activeTab, setActiveTab] = useState<'referenced' | 'voices'>('referenced');
  const [topReferenced, setTopReferenced] = useState([]);
  const [voiceUpdates, setVoiceUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopReferenced = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/headlines/top-referenced?user_id=${userId}&period_hours=24&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch top referenced stories');
      const data = await response.json();
      setTopReferenced(data.headlines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top referenced stories');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/headlines/voice-updates?user_id=${userId}&period_hours=24&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch voice updates');
      const data = await response.json();
      setVoiceUpdates(data.updates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voice updates');
    } finally {
      setLoading(false);
    }
  };

  const updateSourcePriority = async (sourceId: string, priority: number) => {
    try {
      const response = await fetch(`/api/newsletters/sources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          source_id: sourceId,
          voice_priority: priority
        })
      });
      if (!response.ok) throw new Error('Failed to update source priority');
      
      // Refresh voice updates to reflect the change
      if (activeTab === 'voices') {
        fetchVoiceUpdates();
      }
    } catch (err) {
      console.error('Error updating source priority:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'referenced') {
      fetchTopReferenced();
    } else {
      fetchVoiceUpdates();
    }
  }, [activeTab, userId]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">QuickScan</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('referenced')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'referenced'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Top Referenced
          </button>
          <button
            onClick={() => setActiveTab('voices')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'voices'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Voice Updates
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'referenced' && <TopReferencedFeed stories={topReferenced} />}
          {activeTab === 'voices' && <VoiceUpdatesFeed updates={voiceUpdates} onUpdatePriority={updateSourcePriority} />}
        </>
      )}
    </div>
  );
}