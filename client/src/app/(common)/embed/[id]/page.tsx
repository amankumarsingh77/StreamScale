'use client'

import { useParams } from 'next/navigation'
import React from 'react'
import Video from 'next-video'
import { instance } from '@/api/apiInstance'

interface FileData {
  hlsUrl: string
  title: string
}

const useFileData = (id: string) => {
  const [state, setState] = React.useState<{
    loading: boolean
    fileData: FileData | null
    error: string | null
  }>({
    loading: true,
    fileData: null,
    error: null,
  })
  console.log("reached");
  

  React.useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      console.log("Fetching data for id:", id)
      try {
        const resp = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/file/hlsurl?id=${id}`
        )
        setState({ loading: false, fileData: resp.data.data, error: null })
      } catch (error) {
        console.error('Error fetching video data:', error)
        setState({
          loading: false,
          fileData: null,
          error: 'Failed to load video. Please try again later.',
        })
      }
    }
    fetchData()
  }, [id])

  return state
}

export default function EmbedVideo() {
  const { id } = useParams()
  const { loading, fileData, error } = useFileData(id as string)

  if (loading) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !fileData?.hlsUrl) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-black">
        <p className="text-white">{error || 'Video not available'}</p>
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
