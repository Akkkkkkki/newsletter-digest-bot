'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNewsItems, useNewsletterSources } from '@/hooks/useNewsletters'
import { Mail, RefreshCw, Calendar, Tag, TrendingUp, Link2, Users, Building2, CheckCircle, ChevronDown, ChevronUp, Mail as MailIcon, Globe2 } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { NEWSLETTER_DEFAULTS } from '@/lib/config'

export default function NewsletterDigest() {
  const { user, connectGmail } = useAuth()
  const { newsItems, loading, error, fetchNewsItems, processNewsletters } = useNewsItems() 
  const { sources, loading: sourcesLoading, error: sourcesError, fetchSources, addSource, removeSource } = useNewsletterSources(user?.id)
  const [processing, setProcessing] = useState(false)
  const [gmailToken, setGmailToken] = useState<string | null>(null)
  const [gmailRefreshToken, setGmailRefreshToken] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [newsItemLimit, setNewsItemLimit] = useState<number>(NEWSLETTER_DEFAULTS.limit)
  const [newsItemDaysBack, setNewsItemDaysBack] = useState<number>(NEWSLETTER_DEFAULTS.daysBack)
  const [newsItemStartDate, setNewsItemStartDate] = useState<string>("")
  const [newsItemEndDate, setNewsItemEndDate] = useState<string>("")
  const [processSuccess, setProcessSuccess] = useState(false)
  const [newSource, setNewSource] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  // Unified date range state for both digest and news item list
  const today = new Date()
  const defaultEnd = today.toISOString().slice(0, 10)
  const defaultStart = new Date(today.getTime() - NEWSLETTER_DEFAULTS.daysBack * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [periodStart, setPeriodStart] = useState<string>(defaultStart)
  const [periodEnd, setPeriodEnd] = useState<string>(defaultEnd)

  // Expander state for fetch controls
  const [showFilters, setShowFilters] = useState(false)

  // Reset to default when user logs in/out
  useEffect(() => {
    if (user) {
      fetchNewsItems(user.id, { limit: newsItemLimit, startDate: periodStart, endDate: periodEnd })
    }
    // eslint-disable-next-line
  }, [user, newsItemLimit, periodStart, periodEnd])

  useEffect(() => {
    // Load Gmail tokens from localStorage on mount
    const accessToken = localStorage.getItem('gmail_access_token')
    const refreshToken = localStorage.getItem('gmail_refresh_token')
    if (accessToken) setGmailToken(accessToken)
    if (refreshToken) setGmailRefreshToken(refreshToken)
  }, [])

  useEffect(() => { if (user) fetchSources() }, [user])

  // Add debug logging for user and newsItems
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Fetched newsItems:', newsItems);
  }, [user, newsItems]);

  // Helper: Validate email or domain
  function isValidEmail(email: string) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  }
  function isValidDomain(domain: string) {
    // Simple domain regex (no @, at least one dot, no spaces)
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain) && !domain.includes('@')
  }
  function isDuplicate(value: string) {
    return sources.some((src: any) => src.email_address.toLowerCase() === value.toLowerCase())
  }

  // Enhanced submit handler with validation
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

  const handleGmailAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = 'https://www.googleapis.com/auth/gmail.readonly'
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `access_type=offline&` +
      `prompt=consent`
    window.location.href = authUrl
  }

  const handleProcessNewsletters = async () => {
    setProcessing(true)
    setProcessSuccess(false)
    try {
      if (user && gmailToken) {
        await processNewsletters(user.id, gmailToken)
        setProcessSuccess(true)
      }
    } finally {
      setProcessing(false)
    }
  }

  // Optionally, allow disconnecting Gmail
  const handleDisconnectGmail = () => {
    localStorage.removeItem('gmail_access_token')
    localStorage.removeItem('gmail_refresh_token')
    setGmailToken(null)
    setGmailRefreshToken(null)
  }

  const filteredNewsItems = selectedCategory
    ? newsItems.filter(n => n.topics?.includes(selectedCategory))
    : newsItems

  const categories: string[] = Array.from(
    new Set(newsItems.flatMap(n => n.topics || []))
  )

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your newsletter digest</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Allowed Senders Management */}
      <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Allowed Senders</h2>
        <p className="text-gray-500 mb-2 text-sm">Only newsletters from these email addresses/domains will be processed. Add a full email (e.g. editor@newsletter.com) or a domain (e.g. substack.com).</p>
        <form
          className="flex gap-2 mb-2"
          onSubmit={handleAddSource}
        >
          <input
            type="text"
            value={newSource}
            onChange={e => { setNewSource(e.target.value); setInputError(null) }}
            placeholder="Add email or domain"
            className={`border rounded px-2 py-1 flex-1 ${inputError ? 'border-red-500' : ''}`}
            disabled={sourcesLoading}
            aria-invalid={!!inputError}
            aria-describedby="allowed-sender-error"
          />
          <button
            type="submit"
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={sourcesLoading || !newSource}
          >Add</button>
        </form>
        {inputError && <div id="allowed-sender-error" className="text-red-600 text-sm mb-2">{inputError}</div>}
        {sourcesLoading && <div className="text-gray-500">Loading allowed senders…</div>}
        {sourcesError && <div className="text-red-600">{sourcesError}</div>}
        <ul className="divide-y">
          {sources.map((src: any) => {
            const isEmail = src.email_address.includes('@')
            return (
              <li key={src.email_address} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  {isEmail ? <MailIcon className="w-4 h-4 text-blue-500" /> : <Globe2 className="w-4 h-4 text-green-600" />}
                  <span>{src.email_address}</span>
                  {src.name && <span className="ml-2 text-xs text-gray-500">({src.name})</span>}
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
      {/* Filter Pane */}
      <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={periodStart}
              max={periodEnd}
              onChange={e => setPeriodStart(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={periodEnd}
              min={periodStart}
              max={defaultEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How many news items to display?</label>
            <input
              type="number"
              min={NEWSLETTER_DEFAULTS.minLimit}
              max={NEWSLETTER_DEFAULTS.maxLimit}
              value={newsItemLimit}
              onChange={e => setNewsItemLimit(Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
        </div>
        {/* Action Buttons on a new line */}
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => user && fetchNewsItems(user.id, { limit: newsItemLimit, startDate: periodStart, endDate: periodEnd })}
          >
            <RefreshCw className="w-4 h-4" /> Fetch News Items
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            onClick={handleProcessNewsletters}
            disabled={processing}
          >
            <Mail className="w-4 h-4" /> Process New Newsletters
          </button>
          { (gmailToken || gmailRefreshToken) ? (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              onClick={handleDisconnectGmail}
              type="button"
            >
              Disconnect Gmail
            </button>
          ) : (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              onClick={handleGmailAuth}
              type="button"
            >
              Connect Gmail
            </button>
          )}
        </div>
        {/* Success message after processing */}
        {processSuccess && (
          <div className="text-green-600 text-center">Processing complete! Click "Fetch News Items" to refresh the feed.</div>
        )}
      </div>
      {/* News Feed */}
      <div className="space-y-8">
        {/* Loading state */}
        {loading && <div className="text-center text-gray-500 py-8">Loading news items…</div>}
        {/* Empty state */}
        {!loading && newsItems.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No news items found.<br />
            Try processing new newsletters or adjusting your filters.
          </div>
        )}
        {/* News feed */}
        {newsItems.length > 0 && (
          <div className="grid gap-6">
            {newsItems.map((item) => (
              <NewsItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NewsItemCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false)
  const source = item.newsletters

  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {source ? (
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                <Tag className="w-3 h-3" />
                <span>{source.sender_name || source.sender_email}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-gray-400">
                <Tag className="w-3 h-3" />
                <span>Unknown Source</span>
              </span>
            )}
            {source && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(source.received_date).toLocaleDateString()}
              </span>
            )}
            {item.sentiment && (
              <span className={`flex items-center gap-1 ${getSentimentColor(item.sentiment)}`}> 
                <TrendingUp className="w-3 h-3" />
                <span className="capitalize">{item.sentiment}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-gray-700">{item.summary}</p>
      </div>
      <div className="space-y-3">
        {item.topics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Topics</h4>
            <div className="flex flex-wrap gap-2">
              {item.topics.map((topic, i) => (
                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 text-sm hover:underline"
        >
          {expanded ? 'Show less' : 'Show more details'}
        </button>
        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            {item.companies_mentioned.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                  <Building2 className="w-3 h-3" />
                  Companies Mentioned
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.companies_mentioned.map((company, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-sm rounded">
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.people_mentioned.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                  <Users className="w-3 h-3" />
                  People Mentioned
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.people_mentioned.map((person, i) => (
                    <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.products_mentioned.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                  <Tag className="w-3 h-3" />
                  Products Mentioned
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.products_mentioned.map((product, i) => (
                    <span key={i} className="px-2 py-1 bg-yellow-50 text-yellow-700 text-sm rounded">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.url && (
              <div>
                <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                  <Link2 className="w-3 h-3" />
                  Link
                </h4>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:underline truncate"
                >
                  {item.url}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case 'positive': return 'text-green-600'
    case 'negative': return 'text-red-600'
    default: return 'text-gray-600'
  }
} 