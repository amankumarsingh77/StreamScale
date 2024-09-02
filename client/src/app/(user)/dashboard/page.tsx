'use client'
import React, { useEffect, useState } from 'react'
import { instance } from '@/api/apiInstance'
import ProtectedRoute from '@/components/ProtectedRoute'
import Typography from '@/components/ui/typography'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  BarChart,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import TopPerformingVideos from '@/components/dashboard/TopPerformingVideos'
import VideoProcessingStatus from '@/components/dashboard/VideoProcessingStatus'
import LeftNavBar from '@/components/common/LeftNavBar'

const bandwidthData = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 2000 },
  { name: 'Thu', value: 2780 },
  { name: 'Fri', value: 1890 },
  { name: 'Sat', value: 2390 },
  { name: 'Sun', value: 3490 }
]

export type FileProps = {
  _id: string
  name: string
  size: number
  status: 'queued' | 'transcoding' | 'done' | 'failed'
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileProps[]>([])
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageLimit, setStorageLimit] = useState(100)
  const [totalViews, setTotalViews] = useState(0)
  const [averageWatchTime, setAverageWatchTime] =
    useState(0)
  const [systemAlerts, setSystemAlerts] = useState<
    string[]
  >([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfiles`
        )
        if (response.status === 200) {
          setFiles(response.data.data.files)
          const totalSize = response.data.data.files.reduce(
            (acc: number, file: FileProps) =>
              acc + file.size,
            0
          )
          setStorageUsed(totalSize / (1024 * 1024 * 1024)) // Convert to GB
        }

        // Fetch total views and average watch time (placeholder API calls)
        const viewsResponse = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/views`
        )
        setTotalViews(viewsResponse.data.totalViews)

        const watchTimeResponse = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/watchtime`
        )
        setAverageWatchTime(
          watchTimeResponse.data.averageWatchTime
        )

        // Fetch system alerts (placeholder API call)
        const alertsResponse = await instance.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/system/alerts`
        )
        setSystemAlerts(alertsResponse.data.alerts)
      } catch (e) {
        console.log(e)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="flex flex-col w-full">
      <ProtectedRoute>
        <Typography variant="h3" className="p-4">
          Dashboard
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Videos
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {files.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Uploaded videos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Storage Used
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {storageUsed.toFixed(2)} GB
              </div>
              <Progress
                indicatorColor="bg-blue-500"
                value={(storageUsed / storageLimit) * 1024}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {(
                  (storageUsed / storageLimit) *
                  100
                ).toFixed(2)}
                % of {storageLimit} GB used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Views
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all videos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Watch Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageWatchTime.toFixed(2)} min
              </div>
              <p className="text-xs text-muted-foreground">
                Per video
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                Bandwidth Usage (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart data={bandwidthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {systemAlerts.length > 0 ? (
                <ul className="space-y-2">
                  {systemAlerts.map((alert, index) => (
                    <li
                      key={index}
                      className="flex items-center"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No active alerts. All systems operational.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="p-4">
          <VideoProcessingStatus />
        </div>

        <div className="p-4">
          <TopPerformingVideos />
        </div>
      </ProtectedRoute>
    </div>
  )
}
