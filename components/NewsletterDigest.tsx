'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNewsItems, useNewsletterSources } from '@/hooks/useNewsletters'
import { Mail as MailIcon, Globe2, RefreshCw, Calendar, Tag, TrendingUp, Users, Activity, Star, Clock, ExternalLink } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { NEWSLETTER_DEFAULTS } from '@/lib/config'
import { tokenStorage, migrateLegacyTokens } from '@/lib/tokenStorage'

export default function NewsletterDigest() {
  const { user, connectGmail } = useAuth()
  const { newsItems, loading, error, fetchNewsItems, processNewsletters } = useNewsItems()
  const { sources, loading: sourcesLoading, error: sourcesError, fetchSources, addSource, removeSource } = useNewsletterSources(user?.id)
  const [processing, setProcessing] = useState(false)
  const [gmailToken, setGmailToken] = useState<string | null>(null)
  const [gmailRefreshToken, setGmailRefreshToken] = useState<string | null>(null)
  const [newSource, setNewSource] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [periodStart, setPeriodStart] = useState<string>("")
  const [periodEnd, setPeriodEnd] = useState<string>("")
  const [latestEmailDate, setLatestEmailDate] = useState<string>("")
  const [fetchError, setFetchError] = useState<string | null>(null)

  // QuickScan state
  const [activeTab, setActiveTab] = useState<'referenced' | 'voices'>('referenced');
  const [topReferenced, setTopReferenced] = useState([]);
  const [voiceUpdates, setVoiceUpdates] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  // Fetch latest email date and set default date range
  useEffect(() => {
    if (!user) return
    fetch(`/api/newsletters?user_id=${user.id}&latest_email=true`)
      .then(res => res.json())
      .then(data => {
        if (data.latest_received_date) {
          setLatestEmailDate(data.latest_received_date.slice(0, 10))
          setPeriodStart(data.latest_received_date.slice(0, 10))
        } else {
          const today = new Date().toISOString().slice(0, 10)
          setPeriodStart(today)
        }
        setPeriodEnd(new Date().toISOString().slice(0, 10))
      })
  }, [user])

  useEffect(() => { if (user) fetchSources() }, [user])
  useEffect(() => {
    // Migrate any legacy tokens and load Gmail tokens from secure storage
    migrateLegacyTokens()
    
    const accessToken = tokenStorage.getToken('gmail_access')
    const refreshToken = tokenStorage.getToken('gmail_refresh')
    if (accessToken) setGmailToken(accessToken)
    if (refreshToken) setGmailRefreshToken(refreshToken)
  }, [])

  // Fetch existing news items when user and date range are set
  useEffect(() => {
    if (user && periodStart && periodEnd) {
      fetchNewsItems(user.id, { startDate: periodStart, endDate: periodEnd })
    }
  }, [user, periodStart, periodEnd])

  // Fetch QuickScan data on tab change
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'referenced') {
      fetchTopReferenced();
    } else {
      fetchVoiceUpdates();
    }
    // eslint-disable-next-line
  }, [user, activeTab]);

  const fetchTopReferenced = async () => {
    if (!user) return;
    setTabLoading(true);
    setTabError(null);
    try {
      const response = await fetch(`/api/headlines/top-referenced?user_id=${user.id}&period_hours=24&min_mentions=2&limit=15`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch top referenced stories');
      setTopReferenced(data.headlines || []);
    } catch (err: any) {
      setTabError(err.message);
      setTopReferenced([]);
    } finally {
      setTabLoading(false);
    }
  };

  const fetchVoiceUpdates = async () => {
    if (!user) return;
    setTabLoading(true);
    setTabError(null);
    try {
      const response = await fetch(`/api/headlines/voice-updates?user_id=${user.id}&period_hours=24&min_priority=1&limit=15`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch voice updates');
      setVoiceUpdates(data.updates || []);
    } catch (err: any) {
      setTabError(err.message);
      setVoiceUpdates([]);
    } finally {
      setTabLoading(false);
    }
  };

  const updateVoicePriority = async (sourceId: string, priority: number) => {
    try {
      const response = await fetch('/api/headlines/voice-priority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, source_id: sourceId, voice_priority: priority })
      });
      if (response.ok) fetchVoiceUpdates();
    } catch (error) {
      // silent fail
    }
  };

  // Helper: Validate email or domain
  function isValidEmail(email: string) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  }
  function isValidDomain(domain: string) {
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain) && !domain.includes('@')
  }
  function isDuplicate(value: string) {
    return sources.some((src: any) => src.email_address.toLowerCase() === value.toLowerCase())
  }

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault()
    const value = newSource.trim().toLowerCase()
    if (!value) {
      setInputError('Please enter an email address or domain.')
      return
    }
    if (!isValidEmail(value) && !isValidDomain(value)) {
      setInputError('Please enter a valid email address (e.g. editor@newsletter.com) or domain (e.g. substack.com).')
      return
    }
    if (isDuplicate(value)) {
      setInputError('This sender is already allowed.')
      return
    }
    setInputError(null)
    addSource(value)
    setNewSource('')
  }

  // Add disconnect handler
  const handleDisconnectGmail = () => {
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_refresh_token');
    setGmailToken(null);
    setGmailRefreshToken(null);
    setFetchError('Gmail disconnected. Please reconnect to fetch emails.');
  };

  const handleFetchAndProcess = async () => {
    setFetchError(null)
    setProcessing(true)
    try {
      if (!gmailToken) {
        setFetchError('Please connect your Gmail account first.')
        return
      }
      if (user && gmailToken) {
        try {
          await processNewsletters(user.id, gmailToken, gmailRefreshToken || undefined)
          await fetchNewsItems(user.id, { startDate: periodStart, endDate: periodEnd })
        } catch (err: any) {
          // Detect invalid credentials error
          if (err.message && err.message.toLowerCase().includes('invalid credentials')) {
            localStorage.removeItem('gmail_access_token');
            localStorage.removeItem('gmail_refresh_token');
            setGmailToken(null);
            setGmailRefreshToken(null);
            setFetchError('Gmail credentials expired or invalid. Please reconnect your Gmail account.');
            return;
          } else {
            setFetchError(err.message || 'Failed to fetch emails.');
            return;
          }
        }
      }
    } finally {
      setProcessing(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to use the newsletter digest</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 flex gap-8">
      {/* Side Panel */}
      <aside className="w-80 flex-shrink-0 space-y-8">
        {/* Allow List */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2">Allow List</h2>
          <form className="flex gap-2 mb-2" onSubmit={handleAddSource}>
            <input
              type="text"
              value={newSource}
              onChange={e => { setNewSource(e.target.value); setInputError(null) }}
              placeholder="Add email or domain"
              className={`border rounded px-2 py-1 flex-1 min-w-0 ${inputError ? 'border-red-500' : ''}`}
              disabled={sourcesLoading}
              aria-invalid={!!inputError}
              aria-describedby="allowed-sender-error"
            />
            <button
              type="submit"
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
              disabled={sourcesLoading || !newSource}
            >Add</button>
          </form>
          {inputError && <div id="allowed-sender-error" className="text-red-600 text-sm mb-2">{inputError}</div>}
          <ul className="divide-y">
            {sources.map((src: any) => {
              const isEmail = src.email_address.includes('@')
              return (
                <li key={src.email_address} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2">
                    {isEmail ? <MailIcon className="w-4 h-4 text-blue-500" /> : <Globe2 className="w-4 h-4 text-green-600" />}
                    <span>{src.email_address}</span>
                  </span>
                  <button
                    className="text-red-600 hover:underline text-sm"
                    onClick={() => removeSource(src.email_address)}
                    disabled={sourcesLoading}
                  >Remove</button>
                </li>
              )
            })}
            {sources.length === 0 && !sourcesLoading && <li className="text-gray-400 py-2">No allowed senders yet.</li>}
          </ul>
        </div>
        {/* Fetch Controls */}
        <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {!gmailToken ? (
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                onClick={connectGmail}
                disabled={processing}
              >
                <MailIcon className="w-4 h-4" /> Connect Gmail
              </button>
            ) : (
              <button
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={handleDisconnectGmail}
                disabled={processing}
              >
                <MailIcon className="w-4 h-4" /> Disconnect Gmail
              </button>
            )}
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={handleFetchAndProcess}
              disabled={processing || !gmailToken}
            >
              <RefreshCw className="w-4 h-4" /> Fetch Emails
            </button>
            <span className="text-xs text-gray-500">Latest: {latestEmailDate || 'N/A'}</span>
          </div>
          {fetchError && <div className="text-red-600 text-sm mb-2">{fetchError}</div>}
          <div className="flex flex-col gap-2">
            <label className="text-sm">Start Date</label>
            <input
              type="date"
              value={periodStart}
              max={periodEnd}
              onChange={e => setPeriodStart(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <label className="text-sm">End Date</label>
            <input
              type="date"
              value={periodEnd}
              min={periodStart}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setPeriodEnd(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
      </aside>
      {/* Main Feed with Tabs */}
      <main className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('referenced')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'referenced' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Top Referenced</span>
                {topReferenced.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">{topReferenced.length}</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('voices')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'voices' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Voice Updates</span>
                {voiceUpdates.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">{voiceUpdates.length}</span>
                )}
              </div>
            </button>
          </nav>
        </div>
        {/* Loading/Error State */}
        {tabLoading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <Activity className="w-4 h-4 animate-spin" />
              <span>Loading {activeTab === 'referenced' ? 'trending stories' : 'voice updates'}...</span>
            </div>
          </div>
        )}
        {tabError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{tabError}</p>
            <button 
              onClick={activeTab === 'referenced' ? fetchTopReferenced : fetchVoiceUpdates}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >Retry</button>
          </div>
        )}
        {/* Tab Content */}
        {!tabLoading && !tabError && (
          <>
            {activeTab === 'referenced' && <TopReferencedFeed stories={topReferenced} />}
            {activeTab === 'voices' && <VoiceUpdatesFeed updates={voiceUpdates} onUpdatePriority={updateVoicePriority} />}
          </>
        )}
      </main>
    </div>
  )
}

// --- QuickScan tab components ---
function TopReferencedFeed({ stories }: { stories: any[] }) {
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
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">{index + 1}</span>
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">{story.mention_count}x mentioned</span>
                <span className="text-xs text-gray-500">Score: {story.trending_score?.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">{new Date(story.last_updated).toLocaleTimeString()}</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{story.title}</h3>
          <p className="text-gray-700 mb-4">{story.summary}</p>
          {story.trend_analysis && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">{story.trend_analysis}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {story.sources.slice(0, 5).map((source: any, i: number) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded" title={source.email}>{source.name}</span>
            ))}
            {story.sources.length > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">+{story.sources.length - 5} more</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VoiceUpdatesFeed({ updates, onUpdatePriority }: { updates: any[]; onUpdatePriority: (sourceId: string, priority: number) => void; }) {
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
                {new Date(update.latest_headline.published_at).toLocaleTimeString()}
              </span>
              <span>Importance: {(update.latest_headline.importance_score * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{update.activity_summary.items_this_period} items today</span>
              {update.source.expertise_keywords.length > 0 && (
                <div className="flex gap-1">
                  {update.source.expertise_keywords.slice(0, 3).map((keyword: string, i: number) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-1 rounded">{keyword}</span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">Authority: {(update.source.authority_score * 100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
} 