'use client'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Video from 'next-video'
import { useApi } from '@/lib/hooks/useApi'
import VideoDetailsCard from './VideoDetailsCard'
import { instance } from '@/api/apiInstance'

interface FileData {
  file: {
    hlsurl: string
  }
}

const VideoPlayer: React.FC = () => {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [fileData, setFileData] = useState<FileData>()
  // const { data, error, loading, makeRequest } = useApi()

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const resp = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfile?fileId=${id}`
        )
        setFileData(resp.data)
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  return (
    <div className="w-full py-5 flex flex-col items-center">
      {!loading ? (
        fileData && fileData.file.hlsurl ? (
          <div className="w-full flex flex-col items-center">
            <Video
              src={fileData.file.hlsurl}
              className="mt-20 h-full max-w-screen-md max-h-screen rounded-md"
            />
            <div
              className="border border-gray-200 mt-20 w-full max-w-screen-md
                rounded-md"
            >
              <VideoDetailsCard />
            </div>
          </div>
        ) : (
          <p>No video available.</p>
        )
      ) : (
        <p>Loading...</p>
      )}
      {/* {error && <p>Error: {error}</p>} */}
    </div>
  )
}

export default VideoPlayer
