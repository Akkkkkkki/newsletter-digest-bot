import AuthButton from '@/components/AuthButton'
import QuickScan from '@/components/QuickScan'

export default function Home() {
  return (
    <div>
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Digest Bot</h1>
          <AuthButton />
        </div>
      </header>
      
      <main className="py-8">
        <QuickScan />
      </main>
    </div>
  )
} 