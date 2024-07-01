import React, { Suspense } from 'react'
import VideoPlayer from '@/components/player/VideoPlayer'

const Page: React.FC = () => {
  return (
    <Suspense fallback={<>Loading...</>}>
      <VideoPlayer />
    </Suspense>
  )
}

export default Page
