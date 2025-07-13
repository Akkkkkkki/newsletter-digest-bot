import { useState, useEffect, useRef } from 'react'
import type { NewsItem, DigestSummary } from '@/lib/types'
import { NEWSLETTER_DEFAULTS } from '@/lib/config'

interface UseNewsItemsOptions {
  daysBack?: number
  limit?: number
  category?: string
  startDate?: string
  endDate?: string
}

export const useNewsItems = (defaultOptions: UseNewsItemsOptions = NEWSLETTER_DEFAULTS) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [digest, setDigest] = useState<DigestSummary | null>(null)
  const currentUserId = useRef<string | null>(null)

  const fetchNewsItems = async (userId: string | undefined, optionsOverride: UseNewsItemsOptions = {}) => {
    if (!userId) return
    setLoading(true)
    setError(null)
    currentUserId.current = userId
    try {
      const params = new URLSearchParams({
        user_id: userId,
        ...defaultOptions,
        ...optionsOverride,
      } as any)
      const res = await fetch(`/api/newsletters?${params.toString()}`)
      const data = await res.json()
      // Only update if userId hasn't changed during fetch
      if (currentUserId.current === userId) {
        setNewsItems(data.news_items || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news items')
    } finally {
      setLoading(false)
    }
  }

  const processNewsletters = async (userId: string, accessToken: string, refreshToken?: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/newsletters/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: accessToken,
          ...(refreshToken ? { refresh_token: refreshToken } : {})
        })
      })

      let data
      try {
        data = await response.json()
      } catch (err) {
        throw new Error('Server error: Could not parse response. Please try again or contact support.')
      }

      if (!response.ok) {
        let msg = data?.error || `HTTP error! status: ${response.status}`
        if (data?.type) msg += ` [${data.type}]`
        if (data?.details) msg += `\nDetails: ${data.details}`
        throw new Error(msg)
      }

      // Refresh news items after processing
      await fetchNewsItems(userId)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process newsletters')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    newsItems,
    loading,
    error,
    fetchNewsItems,
    processNewsletters,
    digest,
    setDigest
  }
}

export const useDigestSummary = () => {
  const [digest, setDigest] = useState<DigestSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDigestSummary = async (userId: string, periodStart?: Date, periodEnd?: Date) => {
    setLoading(true)
    setError(null)
    try {
      const body: any = { user_id: userId }
      if (periodStart) body.period_start = periodStart.toISOString()
      if (periodEnd) body.period_end = periodEnd.toISOString()
      const response = await fetch('/api/newsletters/generateDigest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setDigest(data.digest || null)
      return data.digest
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch digest summary')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { digest, loading, error, fetchDigestSummary }
}

export const useNewsletterSources = (userId?: string) => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/newsletters/sources?user_id=${userId}`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  };

  const addSource = async (email_address: string, name?: string, category?: string, description?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletters/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email_address, name, category, description })
      });
      if (!res.ok) throw new Error('Failed to add source');
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setLoading(false);
    }
  };

  const removeSource = async (email_address: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletters/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email_address })
      });
      if (!res.ok) throw new Error('Failed to remove source');
      await fetchSources();
    } catch (err: any) {
      setError(err.message || 'Failed to remove source');
    } finally {
      setLoading(false);
    }
  };

  return { sources, loading, error, fetchSources, addSource, removeSource };
}; 