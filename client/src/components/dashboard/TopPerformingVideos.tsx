import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TrendingUp } from 'lucide-react'

// This would typically come from an API call
const topVideos = [
  {
    title: 'Introduction to StreamScale',
    views: 15234,
    watchTime: 8.5
  },
  {
    title: 'Advanced Streaming Techniques',
    views: 12456,
    watchTime: 10.2
  },
  {
    title: 'Optimizing Video Quality',
    views: 9876,
    watchTime: 7.8
  },
  {
    title: 'Monetization Strategies',
    views: 8765,
    watchTime: 9.1
  },
  {
    title: 'Live Streaming Best Practices',
    views: 7654,
    watchTime: 6.5
  }
]

const TopPerformingVideos = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
          Top Performing Videos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">
                Views
              </TableHead>
              <TableHead className="text-right">
                Avg. Watch Time (min)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topVideos.map((video, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {video.title}
                </TableCell>
                <TableCell className="text-right">
                  {video.views.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {video.watchTime.toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default TopPerformingVideos
