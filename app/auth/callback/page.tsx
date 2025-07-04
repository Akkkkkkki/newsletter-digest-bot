'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setError('Authentication failed: ' + error)
        setProcessing(false)
        return
      }

      if (!code) {
        setError('No authorization code received')
        setProcessing(false)
        return
      }

      try {
        // Exchange code for access token
        const response = await fetch('/api/auth/gmail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          throw new Error('Failed to exchange authorization code')
        }

        const data = await response.json()

        // Store the access token in localStorage
        localStorage.setItem('gmail_access_token', data.access_token)
        
        // Redirect back to main page
        router.push('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          {processing ? (
            <>
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processing authentication...</h2>
              <p className="text-gray-600">Please wait while we complete the Gmail connection.</p>
            </>
          ) : error ? (
            <>
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Home
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
} 