import { useState, useEffect } from 'react'
import { Newsletter } from '@/lib/types'

interface UseNewslettersOptions {
  daysBack?: number
  limit?: number
  category?: string
}

export const useNewsletters = (options: UseNewslettersOptions = {}) => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNewsletters = async (userId: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        user_id: userId,
        days_back: (options.daysBack || 7).toString(),
        limit: (options.limit || 20).toString(),
        ...(options.category && { category: options.category })
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

  const processNewsletters = async (userId: string, accessToken: string) => {
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
          access_token: accessToken
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