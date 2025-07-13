'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNewsItems, useNewsletterSources } from '@/hooks/useNewsletters'
import { Mail as MailIcon, Globe2, RefreshCw, Calendar, Tag, TrendingUp } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { NEWSLETTER_DEFAULTS } from '@/lib/config'

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
    // Load Gmail tokens from localStorage on mount
    const accessToken = localStorage.getItem('gmail_access_token')
    const refreshToken = localStorage.getItem('gmail_refresh_token')
    if (accessToken) setGmailToken(accessToken)
    if (refreshToken) setGmailRefreshToken(refreshToken)
  }, [])

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
      {/* Main Feed */}
      <main className="flex-1 min-w-0">
        <div className="space-y-4">
          {loading && <div className="text-blue-600">Loading news items…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {newsItems.length === 0 && !loading && <div className="text-gray-500">No news items found for this period.</div>}
          {newsItems.map(item => <NewsItemCard key={item.id} item={item} />)}
        </div>
      </main>
    </div>
  )
}

function NewsItemCard({ item }: { item: NewsItem }) {
  const source = item.newsletters
  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow mb-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
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
      <div className="mb-2">
        <p className="text-gray-700">{item.summary}</p>
      </div>
      {item.url && (
        <div className="mt-2">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Read more</a>
        </div>
      )}
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