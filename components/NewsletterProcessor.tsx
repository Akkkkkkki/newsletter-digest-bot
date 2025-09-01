'use client'

import { useState, useEffect, memo } from 'react'
import { RefreshCw, Calendar } from 'lucide-react'
import { tokenStorage } from '@/lib/tokenStorage'

interface NewsletterProcessorProps {
  userId: string
  onProcessComplete?: () => void
}

export default memo(function NewsletterProcessor({ userId, onProcessComplete }: NewsletterProcessorProps) {
  const [processing, setProcessing] = useState(false)
  const [gmailToken, setGmailToken] = useState<string | null>(null)
  const [gmailRefreshToken, setGmailRefreshToken] = useState<string | null>(null)
  const [periodStart, setPeriodStart] = useState<string>("")
  const [periodEnd, setPeriodEnd] = useState<string>("")
  const [latestEmailDate, setLatestEmailDate] = useState<string>("")
  const [processError, setProcessError] = useState<string | null>(null)

  // Initialize tokens and date range
  useEffect(() => {
    const accessToken = tokenStorage.getToken('gmail_access')
    const refreshToken = tokenStorage.getToken('gmail_refresh')
    if (accessToken) setGmailToken(accessToken)
    if (refreshToken) setGmailRefreshToken(refreshToken)

    // Fetch latest email date and set default date range
    if (userId) {
      fetch(`/api/newsletters?user_id=${userId}&latest_email=true`)
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
        .catch(err => console.error('Error fetching latest email date:', err))
    }
  }, [userId])

  const handleProcessNewsletters = async () => {
    if (!gmailToken || !userId) return

    setProcessing(true)
    setProcessError(null)

    try {
      const response = await fetch('/api/newsletters/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: gmailToken,
          refresh_token: gmailRefreshToken,
          user_id: userId
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process newsletters')
      }

      onProcessComplete?.()
      
    } catch (error) {
      console.error('Processing error:', error)
      setProcessError(error instanceof Error ? error.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const isReadyToProcess = gmailToken && userId && !processing

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Process Newsletters</h2>
      </div>

      {processError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {processError}
        </div>
      )}

      {/* Date Range Controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="period-start" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <div className="relative">
            <input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div>
          <label htmlFor="period-end" className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <div className="relative">
            <input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {latestEmailDate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          Latest email received: {new Date(latestEmailDate).toLocaleDateString()}
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcessNewsletters}
        disabled={!isReadyToProcess}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          isReadyToProcess
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        <RefreshCw className={`w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
        {processing ? 'Processing Newsletters...' : 'Process New Newsletters'}
      </button>

      {!gmailToken && (
        <p className="mt-3 text-sm text-gray-600 text-center">
          Gmail authentication required to process newsletters
        </p>
      )}
    </div>
  )
})