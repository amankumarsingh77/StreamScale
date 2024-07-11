import { withNextVideo } from 'next-video/process'
/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'build',
  reactStrictMode: false,
  experimental: {
    missingSuspenseWithCSRBailout: false
  },
  images: {
    domains: [
      'scontent.fyzd1-3.fna.fbcdn.net',
      'instagram.fyto1-2.fna.fbcdn.net',
      'assets.vogue.com',
      'm.media-amazon.com',
      'upload.wikimedia.org',
      'avatars.githubusercontent.com',
      'avatar.vercel.sh'
    ]
  }
}

export default withNextVideo(nextConfig)
