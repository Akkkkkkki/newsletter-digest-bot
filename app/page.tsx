import AuthButton from '@/components/AuthButton'
import NewsletterDigest from '@/components/NewsletterDigest'

export default function Home() {
  return (
    <div>
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Digest Bot</h1>
          <AuthButton />
        </div>
      </header>
      
      <main>
        <NewsletterDigest />
      </main>
    </div>
  )
} 