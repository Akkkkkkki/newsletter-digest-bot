'use client'

import { useAuth } from '@/hooks/useAuth'
import { LogIn, LogOut, Mail } from 'lucide-react'

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-md"></div>
    )
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Sign in with Google
      </button>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-700">{user.email}</span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  )
} 