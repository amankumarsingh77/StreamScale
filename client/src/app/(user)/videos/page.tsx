'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import Typography from '@/components/ui/typography'
import { useToast } from '@/components/ui/use-toast'
import { instance } from '@/api/apiInstance'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  FileVideo,
  MoreHorizontal,
  Trash,
  Play,
  Film,
  Clock,
  Calendar,
  Upload,
  FileText
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import LeftNavBar from '@/components/common/LeftNavBar'

interface Video {
  _id: string
  name: string
  size: number
  status: 'queued' | 'transcoding' | 'done' | 'failed'
  createdAt: string
  duration?: number
  thumbnailUrl?: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideos, setSelectedVideos] = useState<
    string[]
  >([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const itemsPerPage = 12

  useEffect(() => {
    fetchVideos()
  }, [currentPage, searchTerm])

  const fetchVideos = async () => {
    setIsLoading(true)
    try {
      const response = await instance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfiles`,
        {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm
          }
        }
      )
      setVideos(response.data.data.files)
      setTotalPages(
        Math.ceil(
          response.data.data.totalPages / itemsPerPage
        )
      )
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to fetch videos. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideos((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    )
  }

  const deleteVideos = async (videoIds: string[]) => {
    const deletedIds: string[] = []

    try {
      await Promise.all(
        videoIds.map(async (id) => {
          const deleteUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/file/delete?fileId=${id}`
          const response = await instance.delete(deleteUrl)
          deletedIds.push(id)
        })
      )
      setVideos((prevVideos) =>
        prevVideos.filter(
          (video) => !deletedIds.includes(video._id)
        )
      )
      setSelectedVideos((prevSelected) =>
        prevSelected.filter(
          (id) => !deletedIds.includes(id)
        )
      )

      toast({
        title: 'Success',
        description: `${deletedIds.length} video(s) have been deleted successfully.`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to delete some or all videos. Please try again.',
        variant: 'destructive'
      })
    }

    return deletedIds
  }

  const handleDeleteSelected = async () => {
    await deleteVideos(selectedVideos)
  }

  const handleDeleteVideo = async (videoId: string) => {
    await deleteVideos([videoId])
  }

  const handlePlayVideo = (videoId: string) => {
    router.push(`/player?id=${videoId}`)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
      ' ' +
      sizes[i]
    )
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return [hours, minutes, remainingSeconds]
      .map((v) => v.toString().padStart(2, '0'))
      .join(':')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-500'
      case 'transcoding':
        return 'bg-yellow-500'
      case 'queued':
        return 'bg-blue-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const EmptyState = () => (
    <div className="text-center py-12">
      <Film className="mx-auto h-12 w-12 text-gray-400" />
      <Typography variant="h4" className="mt-2">
        No videos uploaded yet
      </Typography>
      <Typography
        variant="p"
        className="text-muted-foreground mt-1"
      >
        Get started by uploading your first video
      </Typography>
      <Button variant={'outline'} className="mt-4" asChild>
        <Link href="/upload">
          <Upload className="mr-2 h-4 w-4" /> Upload Video
        </Link>
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col w-full">
      <ProtectedRoute>
        <LeftNavBar />
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Typography variant="h3">My Videos</Typography>
            {videos.length > 0 && (
              <Button
                onClick={handleDeleteSelected}
                disabled={selectedVideos.length === 0}
                variant="destructive"
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
                Selected ({selectedVideos.length})
              </Button>
            )}
          </div>

          {videos.length > 0 && (
            <Input
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="max-w-sm"
            />
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <Typography variant="p">
                Loading videos...
              </Typography>
            </div>
          ) : videos.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
                  xl:grid-cols-4 gap-6"
              >
                {videos.map((video) => (
                  <Card
                    key={video._id}
                    className="overflow-hidden"
                  >
                    <CardHeader className="relative p-0">
                      <div className="aspect-video bg-gray-200 flex items-center justify-center">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Film className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          className="border border-black"
                          checked={selectedVideos.includes(
                            video._id
                          )}
                          onCheckedChange={() =>
                            handleSelectVideo(video._id)
                          }
                        />
                      </div>
                      <Badge
                        className={`absolute top-2 right-2 ${getStatusColor(video.status)}`}
                      >
                        {video.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg truncate">
                        {video.name}
                      </CardTitle>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          {video.duration
                            ? formatDuration(video.duration)
                            : 'N/A'}
                        </div>
                        <div className="flex items-center">
                          <FileVideo className="mr-2 h-4 w-4" />
                          {formatFileSize(video.size)}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {new Date(
                            video.createdAt
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <Button
                        variant="outline"
                        disabled={video.status === 'done'}
                        onClick={() =>
                          handlePlayVideo(video._id)
                        }
                      >
                        <Play className="mr-2 h-4 w-4" />{' '}
                        Play
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">
                              Open menu
                            </span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteVideo(video._id)
                            }
                          >
                            <Trash className="mr-2 h-4 w-4" />{' '}
                            Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/videos/${video._id}`}
                            >
                              <FileText className="mr-2 h-4 w-4" />{' '}
                              Details
                            </Link>
                          </DropdownMenuItem>
                          {/* Add more actions here if needed */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6">
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Showing {videos.length} of{' '}
                  {totalPages * itemsPerPage} videos
                </Typography>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.max(prev - 1, 1)
                      )
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ProtectedRoute>
    </div>
  )
}
