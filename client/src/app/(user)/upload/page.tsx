'use client'
import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  X,
  FileIcon,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Typography from '@/components/ui/typography'
import ProtectedRoute from '@/components/ProtectedRoute'
import { instance } from '@/api/apiInstance'
import { useToast } from '@/components/ui/use-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert'
import axios from 'axios'
import LeftNavBar from '@/components/common/LeftNavBar'

interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  uploadId?: string
  file: File
}

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'queued' as const,
      file: file
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({
      onDrop,
      accept: {
        'video/*': []
      }
    })

  const uploadFile = async (fileMetadata: FileMetadata) => {
    try {
      // Step 1: Get presigned URL
      const presignedUrlResponse = await instance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload/url`,
        {
          params: { fileName: fileMetadata.name }
        }
      )
      const { url, uploadId, filepath } =
        presignedUrlResponse.data.data

      // Step 2: Upload to S3
      await axios.put(url, fileMetadata.file, {
        headers: { 'Content-Type': fileMetadata.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) /
              (progressEvent.total || 1)
          )
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileMetadata.id
                ? {
                    ...f,
                    progress: percentCompleted,
                    status: 'uploading'
                  }
                : f
            )
          )
        }
      })

      // Step 3: Confirm upload
      await instance.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload/add`,
        {
          fileName: fileMetadata.name,
          size: fileMetadata.size,
          type: fileMetadata.type,
          uploadId: uploadId,
          filePath: filepath
        }
      )

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileMetadata.id
            ? { ...f, status: 'done', uploadId }
            : f
        )
      )
      toast({
        title: 'File uploaded successfully',
        description: `${fileMetadata.name} has been uploaded.`
      })
    } catch (error) {
      console.error('Upload error:', error)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileMetadata.id
            ? { ...f, status: 'error' }
            : f
        )
      )
      toast({
        title: 'Upload failed',
        description: `Failed to upload ${fileMetadata.name}. Please try again.`,
        variant: 'destructive'
      })
    }
  }

  const handleUpload = () => {
    files.forEach((file) => {
      if (file.status === 'queued') {
        uploadFile(file)
      }
    })
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
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

  return (
    <ProtectedRoute>
      <div className="flex flex-col w-full p-6 space-y-6">
        <LeftNavBar />
        <Typography variant="h2">Upload Videos</Typography>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Upload Instructions</AlertTitle>
          <AlertDescription>
            Drag and drop your video files or click to
            select. We support most common video formats.
            Each file should be less than 2GB for optimal
            performance.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Upload Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`p-10 border-2 border-dashed rounded-lg text-center
              cursor-pointer transition-colors duration-300 ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent hover:border-accent'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Typography variant="h4" className="mb-2">
                {isDragActive
                  ? 'Drop the video files here'
                  : 'Drag & drop video files here'}
              </Typography>
              <Typography
                variant="p"
                className="text-muted-foreground"
              >
                or click to select files
              </Typography>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center space-x-4 p-4 bg-background border
                      rounded-md"
                  >
                    <FileIcon className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <Typography
                        variant="p"
                        className="font-medium truncate"
                      >
                        {file.name}
                      </Typography>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>
                          {formatFileSize(file.size)}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{file.status}</span>
                      </div>
                      <Progress
                        indicatorColor="bg-white"
                        value={file.progress}
                        className="mt-2"
                      />
                    </div>
                    {file.status === 'done' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {files.some((f) => f.status === 'queued') && (
          <Button
            variant="outline"
            onClick={handleUpload}
            className="mt-4 w-full sm:w-auto"
          >
            Start Upload
          </Button>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upload Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Typography variant="h4">
                  {files.length}
                </Typography>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Total Files
                </Typography>
              </div>
              <div>
                <Typography variant="h4">
                  {
                    files.filter((f) => f.status === 'done')
                      .length
                  }
                </Typography>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Uploaded
                </Typography>
              </div>
              <div>
                <Typography variant="h4">
                  {
                    files.filter(
                      (f) => f.status === 'queued'
                    ).length
                  }
                </Typography>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Queued
                </Typography>
              </div>
              <div>
                <Typography variant="h4">
                  {formatFileSize(
                    files.reduce(
                      (acc, file) => acc + file.size,
                      0
                    )
                  )}
                </Typography>
                <Typography
                  variant="p"
                  className="text-muted-foreground"
                >
                  Total Size
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

export default UploadPage
