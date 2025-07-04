'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNewsletters } from '@/hooks/useNewsletters'
import { Mail, RefreshCw, Calendar, Tag, TrendingUp, Link2, Users, Building2, CheckCircle } from 'lucide-react'
import type { Newsletter } from '@/lib/types'

export default function NewsletterDigest() {
  const { user } = useAuth()
  const { newsletters, loading, error, fetchNewsletters, processNewsletters } = useNewsletters()
  const [processing, setProcessing] = useState(false)
  const [gmailToken, setGmailToken] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchNewsletters(user.id)
    }
  }, [user])

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
    if (!user || !gmailToken) return

    setProcessing(true)
    try {
      await processNewsletters(user.id, gmailToken)
    } catch (err) {
      console.error('Error processing newsletters:', err)
    } finally {
      setProcessing(false)
    }
  }

  const filteredNewsletters = selectedCategory
    ? newsletters.filter(n => n.newsletter_insights?.category === selectedCategory)
    : newsletters

  const categories = Array.from(
    new Set(newsletters.map(n => n.newsletter_insights?.category).filter(Boolean))
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Newsletter Digest</h1>
        <div className="flex gap-3">
          {!gmailToken && (
            <button
              onClick={handleGmailAuth}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
          )}
          {gmailToken && (
            <button
              onClick={handleProcessNewsletters}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
              {processing ? 'Processing...' : 'Fetch New Newsletters'}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm ${
              !selectedCategory 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter List */}
      {!loading && filteredNewsletters.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No newsletters found. Connect Gmail and fetch your newsletters.</p>
        </div>
      )}

      {!loading && filteredNewsletters.length > 0 && (
        <div className="grid gap-4">
          {filteredNewsletters.map((newsletter) => (
            <NewsletterCard key={newsletter.id} newsletter={newsletter} />
          ))}
        </div>
      )}
    </div>
  )
}

function NewsletterCard({ newsletter }: { newsletter: Newsletter }) {
  const [expanded, setExpanded] = useState(false)
  const insights = newsletter.newsletter_insights

  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{newsletter.subject}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{newsletter.sender_name}</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(newsletter.received_date).toLocaleDateString()}
            </span>
            {insights?.category && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span className="capitalize">{insights.category}</span>
              </span>
            )}
            {insights?.sentiment && (
              <span className={`flex items-center gap-1 ${getSentimentColor(insights.sentiment)}`}>
                <TrendingUp className="w-3 h-3" />
                <span className="capitalize">{insights.sentiment}</span>
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          newsletter.status === 'completed' 
            ? 'bg-green-100 text-green-700' 
            : newsletter.status === 'processing'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {newsletter.status}
        </span>
      </div>

      {insights && (
        <>
          <div className="mb-4">
            <p className="text-gray-700">{insights.summary}</p>
          </div>

          <div className="space-y-3">
            {insights.key_topics.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {insights.key_topics.map((topic, i) => (
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
                {insights.companies_mentioned.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                      <Building2 className="w-3 h-3" />
                      Companies Mentioned
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.companies_mentioned.map((company, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-sm rounded">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insights.people_mentioned.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                      <Users className="w-3 h-3" />
                      People Mentioned
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.people_mentioned.map((person, i) => (
                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded">
                          {person}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insights.action_items.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                      <CheckCircle className="w-3 h-3" />
                      Action Items
                    </h4>
                    <ul className="space-y-1">
                      {insights.action_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.links_extracted.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-1">
                      <Link2 className="w-3 h-3" />
                      Links
                    </h4>
                    <div className="space-y-1">
                      {insights.links_extracted.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
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