import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Golf Tracker',
  description: 'Track your rounds at Turner Hill',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Golf Tracker',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50">
        <header className="bg-green-900 text-white shadow-md">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-lg tracking-tight">Golf Tracker</span>
            <nav className="flex gap-5 text-sm font-medium">
              <a href="/dashboard" className="hover:text-green-200 transition-colors">Dashboard</a>
              <a href="/trends" className="hover:text-green-200 transition-colors">Trends</a>
              <a href="/rounds/new" className="hover:text-green-200 transition-colors">New Round</a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
