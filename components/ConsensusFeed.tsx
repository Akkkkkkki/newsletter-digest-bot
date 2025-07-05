"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

export default function ConsensusFeed({ periodStart, periodEnd }: { periodStart: string, periodEnd: string }) {
  const { user } = useAuth()
  const [consensus, setConsensus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetch(`/api/newsletters/consensus?user_id=${user.id}&period_start=${periodStart}&period_end=${periodEnd}`)
      .then(res => res.json())
      .then(data => {
        setConsensus(data.consensus || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [user, periodStart, periodEnd])

  if (!user) return <div className="text-center py-8">Sign in to view trending news.</div>
  if (loading) return <div className="text-blue-600">Loading trending news...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (consensus.length === 0) return <div className="text-gray-600">No trending news found for this period.</div>

  return (
    <div className="space-y-8">
      {consensus.map(group => (
        <div key={group.group_id} className="bg-white border rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-2">{group.summary}</h3>
          <div className="text-gray-500 mb-2">
            Mentioned in <span className="font-semibold">{group.mention_count}</span> newsletters:
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