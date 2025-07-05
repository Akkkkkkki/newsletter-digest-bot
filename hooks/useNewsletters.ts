import { useState, useEffect } from 'react'
import { Newsletter } from '@/lib/types'
import type { DigestSummary } from '@/lib/types'

interface UseNewslettersOptions {
  daysBack?: number
  limit?: number
  category?: string
  startDate?: string
  endDate?: string
}

export const useNewsletters = (defaultOptions: UseNewslettersOptions = {}) => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNewsletters = async (userId: string, optionsOverride: UseNewslettersOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      const mergedOptions = { ...defaultOptions, ...optionsOverride }
      const params = new URLSearchParams({
        user_id: userId,
        days_back: (mergedOptions.daysBack || 7).toString(),
        limit: (mergedOptions.limit || 20).toString(),
        ...(mergedOptions.category && { category: mergedOptions.category }),
        ...(mergedOptions.startDate && { start_date: mergedOptions.startDate }),
        ...(mergedOptions.endDate && { end_date: mergedOptions.endDate })
      })

      const response = await fetch(`/api/newsletters?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setNewsletters(data.newsletters || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch newsletters')
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Refresh newsletters after processing
      await fetchNewsletters(userId)
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process newsletters')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    newsletters,
    loading,
    error,
    fetchNewsletters,
    processNewsletters
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