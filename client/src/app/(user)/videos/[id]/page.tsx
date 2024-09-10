'use client'
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { instance } from '@/api/apiInstance'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  FileVideo,
  Image as ImageIcon,
  Play,
  Save,
  Trash,
  RefreshCw
} from 'lucide-react'
import Typography from '@/components/ui/typography'

interface VideoDetails {
  _id: string
  name: string
  description: string
  size: number
  status: 'queued' | 'transcoding' | 'done' | 'failed'
  createdAt: string
  duration: number
  views: number
  isPublic: boolean
  thumbnailUrl: string
  category: string
  tags: string[]
}

const VideoDetailsPage: React.FC = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [video, setVideo] = useState<VideoDetails | null>(
    null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [editedVideo, setEditedVideo] = useState<
    Partial<VideoDetails>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] =
    useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      fetchVideoDetails()
    }
  }, [id])

  const fetchVideoDetails = async () => {
    setIsLoading(true)
    try {
      const response = await instance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfile?fileId=${id}`
      )
      setVideo(response.data.data)
      setEditedVideo(response.data.data)
    } catch (error) {
      console.error('Failed to fetch video details:', error)
      toast({
        title: 'Error',
        description:
          'Failed to load video details. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setEditedVideo((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setEditedVideo((prev) => ({
      ...prev,
      isPublic: checked
    }))
  }

  const handleCategoryChange = (value: string) => {
    setEditedVideo((prev) => ({ ...prev, category: value }))
  }

  const handleTagsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const tags = e.target.value
      .split(',')
      .map((tag) => tag.trim())
    setEditedVideo((prev) => ({ ...prev, tags }))
  }

  const handleSave = async () => {
    try {
      const response = await instance.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/file/${id}`,
        {
          title: editedVideo.name,
          description: editedVideo.description,
          category: editedVideo.category,
          isPublic: editedVideo.isPublic,
          thumbnailUrl: editedVideo.thumbnailUrl
        }
      );

      if (response.data.status === 'success') {
        setVideo((prev) => {
          if (prev === null) {
            return null;
          }
          return { ...prev, ...response.data.data } as VideoDetails;
        });
        setIsEditing(false);
        toast({
          title: 'Success',
          description: 'Video details updated successfully.'
        });
      } else {
        throw new Error('Failed to update video details');
      }
    } catch (error) {
      console.error('Failed to update video details:', error);
      toast({
        title: 'Error',
        description: 'Failed to update video details. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this video?'
      )
    ) {
      try {
        await instance.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/api/file/delete?fileId=${id}`
        )
        toast({
          title: 'Success',
          description: 'Video deleted successfully.'
        })
        router.push('/videos')
      } catch (error) {
        console.error('Failed to delete video:', error)
        toast({
          title: 'Error',
          description:
            'Failed to delete video. Please try again.',
          variant: 'destructive'
        })
      }
    }
  }

  const handleGenerateThumbnail = async () => {
    setIsGeneratingThumbnail(true)
    try {
      const response = await instance.post(
        `/api/file/generate-thumbnail/${id}`
      )
      setVideo((prev) => {
        if (prev) {
          return {
            ...prev,
            thumbnailUrl: response.data.thumbnailUrl
          }
        }
        return null
      })
      setEditedVideo((prev) => ({
        ...prev,
        thumbnailUrl: response.data.thumbnailUrl
      }))
      toast({
        title: 'Success',
        description: 'Thumbnail generated successfully.'
      })
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      toast({
        title: 'Error',
        description:
          'Failed to generate thumbnail. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingThumbnail(false)
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex justify-center items-center h-screen">
        Video not found
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Typography variant="h3">
            Video Details
          </Typography>
          <div className="space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant={'outline'}
                  onClick={handleSave}
                >
                  <Save className="mr-2 h-4 w-4" /> Save
                  Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant={'outline'}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Video Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Title</Label>
                <Input
                  id="name"
                  name="name"
                  value={
                    isEditing
                      ? editedVideo.name
                      : video.name
                  }
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={
                    isEditing
                      ? editedVideo.description
                      : video.description
                  }
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={handleCategoryChange}
                  defaultValue={video.category}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education">
                      Education
                    </SelectItem>
                    <SelectItem value="entertainment">
                      Entertainment
                    </SelectItem>
                    <SelectItem value="news">
                      News
                    </SelectItem>
                    <SelectItem value="sports">
                      Sports
                    </SelectItem>
                    <SelectItem value="technology">
                      Technology
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {/* <Label htmlFor="tags">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  name="tags"
                  value={
                    isEditing
                      ? editedVideo.tags?.join(', ')
                      : video.tags.join(', ')
                  }
                  onChange={handleTagsChange}
                  disabled={!isEditing}
                /> */}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={
                    isEditing
                      ? editedVideo.isPublic
                      : video.isPublic
                  }
                  onCheckedChange={handleSwitchChange}
                  disabled={!isEditing}
                />
                <Label htmlFor="isPublic">Public</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gray-200 relative overflow-hidden rounded-lg">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt="Video thumbnail"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <Button
                onClick={handleGenerateThumbnail}
                disabled={isGeneratingThumbnail}
                variant={'outline'}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isGeneratingThumbnail
                  ? 'Generating...'
                  : 'Generate New Thumbnail'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Status
                </Typography>
                <Badge
                  className={`mt-1 ${
                    video.status === 'done'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  }`}
                >
                  {video.status}
                </Badge>
              </div>
              <div>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  File Size
                </Typography>
                <Typography variant="h4">
                  {formatFileSize(video.size)}
                </Typography>
              </div>
              <div>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Duration
                </Typography>
                <Typography variant="h4">
                  {formatDuration(video.duration)}
                </Typography>
              </div>
              <div>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Views
                </Typography>
                <Typography variant="h4">
                  {video.views.toLocaleString()}
                </Typography>
              </div>
            </div>
            <Separator />
            <div>
              <Typography
                variant="p"
                className="text-muted-foreground"
              >
                Upload Date
              </Typography>
              <Typography variant="h4">
                {new Date(
                  video.createdAt
                ).toLocaleDateString()}
              </Typography>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/player?id=${video._id}`)
            }
          >
            <Play className="mr-2 h-4 w-4" /> Play Video
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete Video
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default VideoDetailsPage
