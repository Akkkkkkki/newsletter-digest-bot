"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { CONSENSUS_DEFAULTS } from '@/lib/config'

export default function ConsensusFeed({ periodStart, periodEnd }: { periodStart: string, periodEnd: string }) {
  const { user } = useAuth()
  const [consensus, setConsensus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [similarity, setSimilarity] = useState(CONSENSUS_DEFAULTS.similarityThreshold)
  const [maxPerQuery, setMaxPerQuery] = useState(CONSENSUS_DEFAULTS.maxPerQuery)
  const [manualTrigger, setManualTrigger] = useState(0)

  const fetchConsensus = async (sim: number, maxQ: number) => {
    if (!user || !user.id) return
    // Validate periodStart and periodEnd as ISO date strings
    if (!periodStart || !periodEnd || isNaN(Date.parse(periodStart)) || isNaN(Date.parse(periodEnd))) {
      setError('Please select a valid date range.');
      setConsensus([]);
      return;
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/newsletters/consensus?user_id=${encodeURIComponent(user.id.trim())}&period_start=${encodeURIComponent(periodStart)}&period_end=${encodeURIComponent(periodEnd)}&similarity_threshold=${sim}&max_per_query=${maxQ}`)
      let data
      try {
        data = await res.json()
      } catch (jsonErr) {
        // If not JSON, show a user-friendly error
        setError('Server error: Could not parse response. Please try again or contact support.')
        setConsensus([])
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(data?.error || 'Server error. Please try again or contact support.')
        setConsensus([])
        setLoading(false)
        return
      }
      setConsensus(data.consensus || [])
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.')
      setConsensus([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchConsensus(similarity, maxPerQuery)
    // eslint-disable-next-line
  }, [user, periodStart, periodEnd, manualTrigger])

  const handleManualGroup = () => {
    setManualTrigger(t => t + 1)
  }

  if (!user) return <div className="text-center py-8">Sign in to view trending news.</div>
  if (loading) return <div className="text-blue-600">Loading trending news...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (consensus.length === 0) return <div className="text-gray-600">No trending news found for this period.</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleManualGroup}
          disabled={loading}
        >
          Group Similar News
        </button>
        <label className="flex items-center gap-2 text-sm">
          Similarity Threshold:
          <input
            type="number"
            min={0.7}
            max={0.99}
            step={0.01}
            value={similarity}
            onChange={e => setSimilarity(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
            disabled={loading}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Max Per Query:
          <input
            type="number"
            min={5}
            max={50}
            step={1}
            value={maxPerQuery}
            onChange={e => setMaxPerQuery(Number(e.target.value))}
            className="border rounded px-2 py-1 w-16"
            disabled={loading}
          />
        </label>
        <span className="text-xs text-gray-400">(Higher similarity = stricter grouping)</span>
      </div>
      {consensus.map(group => (
        <div key={group.group_id} className="bg-white border rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-2">{group.summary}</h3>
          <div className="text-gray-500 mb-2">
            Mentioned in <span className="font-semibold">{group.mention_count}</span> newsletters:
            <span className="ml-4 text-xs text-green-700">Relevance: {group.relevance_score?.toFixed(2)}</span>
          </div>
          <ul className="divide-y">
            {group.mentions.map((mention: any, i: number) => (
              <li key={i} className="py-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{mention.subject}</span>
                  <span className="text-xs text-gray-400">by {mention.sender_name} ({mention.sender_email})</span>
                  <span className="text-xs text-gray-400">{new Date(mention.received_date).toLocaleDateString()}</span>
                </div>
                <div className="text-gray-700 mt-1">{mention.summary}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
} 