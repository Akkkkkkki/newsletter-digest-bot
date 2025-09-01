'use client'

import { useState, memo } from 'react'
import { Mail as MailIcon, Globe2, RefreshCw, Trash2, Plus } from 'lucide-react'
import { useNewsletterSources } from '@/hooks/useNewsletters'

interface NewsletterSourcesProps {
  userId: string
  onSourceUpdate?: () => void
}

export default memo(function NewsletterSources({ userId, onSourceUpdate }: NewsletterSourcesProps) {
  const { sources, loading, error, fetchSources, addSource, removeSource } = useNewsletterSources(userId)
  const [newSource, setNewSource] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    setInputError(null)

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newSource)) {
      setInputError('Please enter a valid email address')
      return
    }

    try {
      await addSource(newSource)
      setNewSource('')
      onSourceUpdate?.()
    } catch (err) {
      setInputError(err instanceof Error ? err.message : 'Failed to add source')
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    try {
      await removeSource(sourceId)
      onSourceUpdate?.()
    } catch (err) {
      console.error('Failed to remove source:', err)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Newsletter Sources</h2>
        <button
          onClick={fetchSources}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add new source form */}
      <form onSubmit={handleAddSource} className="mb-6">
        <div className="flex gap-2">
          <input
            type="email"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="newsletter@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newSource.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
        {inputError && (
          <p className="mt-2 text-sm text-red-600">{inputError}</p>
        )}
      </form>

      {/* Sources list */}
      {loading && sources.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>Loading sources...</p>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      )}

      {sources.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <MailIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No newsletter sources configured</p>
          <p className="text-sm">Add email addresses above to start processing newsletters</p>
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-3">
          {sources.map((source: any) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  {source.email_address.includes('@') ? (
                    <MailIcon className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Globe2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {source.name || source.email_address}
                  </p>
                  {source.name && (
                    <p className="text-sm text-gray-600">{source.email_address}</p>
                  )}
                  {source.description && (
                    <p className="text-xs text-gray-500">{source.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {source.voice_priority > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Priority {source.voice_priority}
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  source.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleRemoveSource(source.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})