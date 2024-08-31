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
            <main
              className={`flex min-h-screen flex-col ${inter.className}`}
            >
              <LeftNavBar />
              <Header />
              <Toaster />
              <div className="flex flex-1 justify-center w-full">
                <div className="flex w-full max-w-[1280px] h-full">
                  {children}
                </div>
              </div>
              <Footer />
            </main>
          </ThemeProvider>
        </body>
      </AuthProvider>
    </html>
  )
}
