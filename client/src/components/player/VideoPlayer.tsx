'use client'
import { useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'
import Video from 'next-video'
import { useApi } from '@/lib/hooks/useApi'

const VideoPlayer: React.FC = () => {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { data, error, loading, makeRequest } = useApi<{
    hlsurl: string
  }>()

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        await makeRequest({
          url: '/api/file/hlsurl',
          method: 'GET',
          params: { id }
        })
      }
    }
    fetchData()
  }, [id])

  return (
    <div className="w-full h-full flex py-5">
      {!loading ? (
        data && data.hlsurl ? (
          <Video
            src={data.hlsurl}
            className="w-full h-full max-w-screen-md max-h-screen rounded-md"
          />
        ) : (
          <p>No video available.</p>
        )
      ) : (
        <p>Loading...</p>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  )
}

export default VideoPlayer
