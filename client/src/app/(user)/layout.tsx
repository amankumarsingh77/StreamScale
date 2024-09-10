import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/providers/theme-provider'
import { Header } from '@/components/common/header'
import { Footer } from '@/components/common/footer'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import LeftNavBar from '@/components/common/LeftNavBar'
import NavBar from '@/components/common/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:
    'StreamScale - Affordable and scalable video transcoding and streaming service',
  description:
    'Is video transcoding and streaming too expensive? StreamScale is a video transcoding and streaming service that is affordable and scalable.',
  openGraph: {
    images: '/opengraph-image.png'
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'StreamScale - Affordable and scalable video transcoding and streaming service',
    description:
      'Is video transcoding and streaming too expensive? StreamScale is a video transcoding and streaming service that is affordable and scalable.',
    images: ['']
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="antialiased"
    >
      <Analytics />
      <AuthProvider>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex flex-1">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  {children}
                </div>
              </main>
              <Footer />
            </div>
            <Toaster />
          </ThemeProvider>
        </body>
      </AuthProvider>
    </html>
  )
}
