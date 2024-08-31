import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react'

const processingVideos = [
  {
    id: 1,
    title: 'Product Launch Event',
    progress: 75,
    status: 'processing'
  },
  {
    id: 2,
    title: 'Tutorial Series Ep. 5',
    progress: 100,
    status: 'completed'
  },
  {
    id: 3,
    title: 'Customer Testimonial',
    progress: 50,
    status: 'processing'
  },
  {
    id: 4,
    title: 'Behind the Scenes',
    progress: 0,
    status: 'queued'
  },
  {
    id: 5,
    title: 'Live Stream Recording',
    progress: 90,
    status: 'processing'
  }
]

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'processing':
      return (
        <Badge variant="default">
          <Clock className="mr-1 h-3 w-3" /> Processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="success">
          <CheckCircle className="mr-1 h-3 w-3" /> Completed
        </Badge>
      )
    case 'queued':
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" /> Queued
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Failed
        </Badge>
      )
    default:
      return null
  }
}

const VideoProcessingStatus = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
          Video Processing Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processingVideos.map((video) => (
            <div key={video.id} className="space-y-2">
              <p className="text-sm font-medium truncate">
                {video.title}
              </p>
              <div className="flex items-center w-full space-x-2">
                <Progress
                  indicatorColor="bg-gray-300"
                  value={video.progress}
                />
                <StatusBadge status={video.status} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default VideoProcessingStatus
