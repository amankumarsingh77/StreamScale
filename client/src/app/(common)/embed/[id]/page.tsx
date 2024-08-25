'use client'

import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Video from 'next-video'
import { instance } from '@/api/apiInstance'

interface FileData {
  hlsUrl: string
  title: string
}

export default function EmbedVideo() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [fileData, setFileData] = useState<FileData | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const resp = await instance.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/file/hlsurl?id=${id}`
          )
          setFileData(resp.data.data)
        } catch (error) {
          console.error('Error fetching video data:', error)
          setError(
            'Failed to load video. Please try again later.'
          )
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-black">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2
            border-white"
        ></div>
      </div>
    )
  }

  if (error || !fileData || !fileData.hlsUrl) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-black">
        <p className="text-white">
          {error || 'Video not available'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <Video
        src={fileData.hlsUrl}
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
        title={fileData.title}
      />
    </div>
  )
}
