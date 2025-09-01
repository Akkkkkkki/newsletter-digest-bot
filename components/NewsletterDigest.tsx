'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNewsItems } from '@/hooks/useNewsletters'
import { Tag } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { migrateLegacyTokens } from '@/lib/tokenStorage'
import QuickScan from './QuickScan'
import NewsletterSources from './NewsletterSources'
import NewsletterProcessor from './NewsletterProcessor'

export default function NewsletterDigest() {
  const { user, connectGmail } = useAuth()
  const { newsItems, loading, error, fetchNewsItems } = useNewsItems()

  useEffect(() => {
    // Migrate any legacy tokens on component mount
    migrateLegacyTokens()
  }, [])

  // Refresh news items when processing completes
  const handleProcessComplete = () => {
    if (user) {
      const today = new Date().toISOString().slice(0, 10)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      fetchNewsItems(user.id, { startDate: weekAgo, endDate: today })
    }
  }

  const handleSourceUpdate = () => {
    // Sources updated, can trigger refresh if needed
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Newsletter Digest</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your newsletter digest</p>
          <button
            onClick={connectGmail}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Gmail
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Newsletter Digest</h1>
          <p className="text-gray-600">
            Welcome back, {user.email}. Process and discover insights from your newsletters.
          </p>
        </div>

        {/* QuickScan Section */}
        <div className="mb-8">
          <QuickScan userId={user.id} />
        </div>

        {/* Management Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <NewsletterSources userId={user.id} onSourceUpdate={handleSourceUpdate} />
          <NewsletterProcessor userId={user.id} onProcessComplete={handleProcessComplete} />
        </div>

        {/* News Items Display */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent News Items</h2>
          
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading news items...</p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm mb-4">{error}</div>
          )}

          {!loading && !error && newsItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No news items found</p>
              <p className="text-sm">Process some newsletters to see items here</p>
            </div>
          )}

          {!loading && newsItems.length > 0 && (
            <div className="space-y-4">
              {newsItems.slice(0, 20).map((item: NewsItem) => (
                <div
                  key={item.id}
                  className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-700 text-sm mb-2">{item.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Source: {item.newsletters?.sender_name || 'Unknown'}</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    {item.sentiment && (
                      <span className={`px-2 py-1 rounded-full ${
                        item.sentiment === 'positive' 
                          ? 'bg-green-100 text-green-800'
                          : item.sentiment === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.sentiment}
                      </span>
                    )}
                  </div>
                  {item.topics && item.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.topics.slice(0, 5).map((topic: string) => (
                        <span
                          key={topic}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {newsItems.length > 20 && (
                <div className="text-center text-gray-500 text-sm">
                  Showing 20 of {newsItems.length} items
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}