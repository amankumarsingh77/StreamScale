'use client'

import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import Video from 'next-video'
import { instance } from '@/api/apiInstance'
import { motion } from 'framer-motion'
import { Download, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface FileData {
  _id: string
  hlsUrl: string
  title: string
  description: string
  duration: number
  uploadDate: string
  downloadUrl: string
}

const VideoPlayer: React.FC = () => {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [fileData, setFileData] = useState<FileData | null>(
    null
  )
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  console.log(fileData)

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const resp = await instance.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfile?fileId=${id}`
          )
          setFileData(resp.data.data)
        } catch (error) {
          console.error('Error fetching video data:', error)
          toast({
            title: 'Error',
            description:
              'Failed to load video data. Please try again.',
            variant: 'destructive'
          })
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [id, toast])

  const handleDownload = () => {
    if (fileData?.downloadUrl) {
      window.open(fileData.downloadUrl, '_blank')
    }
  }

  const embedScript = `<iframe src="${process.env.NEXT_PUBLIC_URL}/embed/${id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`

  const copyEmbedScript = () => {
    navigator.clipboard.writeText(embedScript)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Embed script copied to clipboard.'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="w-16 h-16 border-t-4 border-blue-500 border-solid
            rounded-full"
        />
      </div>
    )
  }

  if (!fileData || !fileData.hlsUrl) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold">
          No video available.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* <motion.div */}
      {/* initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      > */}
      <div className="aspect-video mb-6">
        <Video
          src={fileData.hlsUrl}
          className="w-full h-full rounded-lg shadow-lg"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{fileData.title}</CardTitle>
          <CardDescription>
            Uploaded on{' '}
            {new Date(
              fileData.uploadDate
            ).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{fileData.description}</p>
          <div className="flex justify-between items-center">
            <p>
              Duration: {Math.floor(fileData.duration / 60)}
              :
              {(fileData.duration % 60)
                .toString()
                .padStart(2, '0')}
            </p>
            <Button
              className="text-black"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4 " />{' '}
              Download
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start">
          <Label htmlFor="embed-script" className="mb-2">
            Embed Script
          </Label>
          <div className="flex w-full">
            <Input
              id="embed-script"
              value={embedScript}
              readOnly
              className="flex-grow"
            />
            <Button
              onClick={copyEmbedScript}
              variant="outline"
              className="ml-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      {/* </motion.div> */}
    </div>
  )
}

export default VideoPlayer
