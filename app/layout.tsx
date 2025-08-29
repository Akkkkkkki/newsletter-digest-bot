import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Newsletter Digest Bot',
  description: 'AI-powered newsletter digest assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </body>
    </html>
  )
} 