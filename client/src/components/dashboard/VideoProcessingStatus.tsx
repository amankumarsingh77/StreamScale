import React, { useEffect, useState } from 'react'
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
import { instance } from '@/api/apiInstance'

interface Task {
  id: string
  name: string
  status: 'DONE' | 'TRANSCODING' | 'FAILED' | 'QUEUED'
  progress: number
  createdAt: string
}

const StatusBadge: React.FC<{ status: Task['status'] }> = ({
  status
}) => {
  const statusConfig = {
    TRANSCODING: {
      icon: Clock,
      text: 'Processing',
      variant: 'default'
    },
    DONE: {
      icon: CheckCircle,
      text: 'Completed',
      variant: 'success'
    },
    QUEUED: {
      icon: Clock,
      text: 'Queued',
      variant: 'secondary'
    },
    FAILED: {
      icon: XCircle,
      text: 'Failed',
      variant: 'destructive'
    }
  }

  const config = statusConfig[status]
  if (!config) return null

  const Icon = config.icon

  return (
    <Badge variant={config.variant as any}>
      <Icon className="mr-1 h-3 w-3" /> {config.text}
    </Badge>
  )
}

const VideoProcessingStatus: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const response = await instance.get<{
          status: string
          data: { tasks: Task[] }
        }>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/latest-transcoding-tasks`
        )
        if (
          response.data.status === 'success' &&
          Array.isArray(response.data.data.tasks)
        ) {
          setTasks(response.data.data.tasks)
        } else {
          console.error(
            'Received unexpected data:',
            response.data
          )
          setError(
            'Received unexpected data format from the server.'
          )
        }
      } catch (err) {
        console.error(
          'Error fetching transcoding tasks:',
          err
        )
        setError(
          'Failed to fetch processing tasks. Please try again later.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
          Video Processing Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p>No processing tasks at the moment.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <p className="text-sm font-medium truncate">
                  {task.name}
                </p>
                <div className="flex items-center w-full space-x-2">
                  <Progress
                    indicatorColor="bg-white"
                    value={task.progress}
                    className="flex-grow"
                  />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default VideoProcessingStatus
