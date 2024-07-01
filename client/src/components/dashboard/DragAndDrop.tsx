'use client'
import React, {
  useState,
  DragEvent,
  ChangeEvent
} from 'react'
import { Button } from '../ui/button'
import Typography from '../ui/typography'
import { File, Check } from 'lucide-react'
import { Progress } from '../ui/progress'
import axios from 'axios'
import { CrossCircledIcon } from '@radix-ui/react-icons'
import { instance } from '@/api/apiInstance'
import { FileProps } from './DemoListing'

interface DragAndDropUploadProps {
  setUserFiles: React.Dispatch<
    React.SetStateAction<FileProps[]>
  >
}

const DragAndDropUpload: React.FC<
  DragAndDropUploadProps
> = ({ setUserFiles }) => {
  const [dragActive, setDragActive] =
    useState<boolean>(false)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<
    'select' | 'uploading' | 'done'
  >('select')

  const handleDrag = (
    e: DragEvent<HTMLDivElement>
  ): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (
    e: DragEvent<HTMLDivElement>
  ): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)

    if (
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      const newFiles = Array.from(e.dataTransfer.files)
      const videoFiles = newFiles.filter((file) =>
        file.type.startsWith('video/')
      )
      const nonVideoFiles = newFiles.filter(
        (file) => !file.type.startsWith('video/')
      )

      if (nonVideoFiles.length > 0) {
        setError(
          'Only video files are allowed. Some files were not added.'
        )
      } else {
        setError(null)
      }

      setFiles(videoFiles)
      setProgress(videoFiles.map(() => 0))
    }
  }

  const clearFileInput = () => {
    setFiles([])
    setProgress([])
    setUploadStatus('select')
  }

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>
  ): void => {
    setError(null)

    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      const videoFiles = newFiles.filter((file) =>
        file.type.startsWith('video/')
      )
      const nonVideoFiles = newFiles.filter(
        (file) => !file.type.startsWith('video/')
      )

      if (nonVideoFiles.length > 0) {
        setError(
          'Only video files are allowed. Some files were not added.'
        )
      } else {
        setError(null)
      }

      setFiles(videoFiles)
      setProgress(videoFiles.map(() => 0))
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, i) => i !== index)
    )
    setProgress((prevProgress) =>
      prevProgress.filter((_, i) => i !== index)
    )
  }

  const handleUpload = async (): Promise<void> => {
    if (uploadStatus === 'done') {
      clearFileInput()
      return
    }
    setLoading(true)
    setUploadStatus('uploading')
    if (files.length === 0) {
      alert('Please select a file to upload')
      setLoading(false)
      return
    }

    try {
      for (
        let fileIndex = 0;
        fileIndex < files.length;
        fileIndex++
      ) {
        const selectedFile = files[fileIndex]
        try {
          const presignedUrlResponse = await instance.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/upload/url`,
            {
              params: { fileName: selectedFile.name }
            }
          )
          const { url } = presignedUrlResponse.data
          await axios.put(url, selectedFile, {
            headers: {
              'Content-Type': selectedFile.type
            },
            onUploadProgress: (progressEvent) => {
              const fileProgress = Math.round(
                (progressEvent.loaded * 100) /
                  (progressEvent.total || 1)
              )
              setProgress((prevProgress) => {
                const newProgress = [...prevProgress]
                newProgress[fileIndex] = fileProgress
                return newProgress
              })
            }
          })
        } catch (err: any) {
          console.error(err.response)
          if (
            err &&
            err.response &&
            err.response.data &&
            err.response.data.error
          ) {
            setError(err.response.data.error)
          } else {
            setError(err?.message || 'An error occurred')
          }
          return
        }

        setProgress((prevProgress) => {
          const newProgress = [...prevProgress]
          newProgress[fileIndex] = 100
          return newProgress
        })

        await instance.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/upload/add`,
          {
            fileName: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type
          }
        )

        if (fileIndex === files.length - 1) {
          const response = await instance.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfiles`
          )
          if (response.status === 200) {
            setUserFiles(response.data.files)
          }
        }
      }
      setUploadStatus('done')
    } catch (error) {
      setUploadStatus('select')
      setProgress((prevProgress) => {
        const newProgress = [...prevProgress]
        newProgress.forEach((_, index) => {
          newProgress[index] = 0
        })
        return newProgress
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3">
      <div
        className={`relative flex justify-center h-56 items-center border-2
        border-dashed border-gray-500 rounded-lg p-8 ${
          dragActive ? 'bg-gray-100' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          multiple
          accept="video/*"
          onChange={handleFileChange}
        />

        <div className="text-center">
          <p className="text-gray-500">
            Drag & Drop your files here or click to upload
          </p>
        </div>
      </div>
      {error && (
        <p className="text-red-500 mt-2">{error}</p>
      )}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-700">Files:</p>
          <ul className="list-disc list-inside">
            {files.map((file, index) => (
              <div
                key={index}
                className="w-75 flex items-center gap-4 text-black border rounded-md
                  p-2 mb-3"
              >
                <File size={24} color="white" />
                <div className="flex-1 flex items-center gap-4">
                  <div style={{ flex: 1 }}>
                    <Typography className="p-1">
                      {file.name}
                    </Typography>
                    <Progress
                      value={progress[index]}
                      className={`${progress[index]}`}
                    />
                  </div>
                  {uploadStatus === 'select' ? (
                    <button
                      onClick={() =>
                        handleRemoveFile(index)
                      }
                    >
                      <CrossCircledIcon
                        color="white"
                        className="w-5 h-5"
                      />
                    </button>
                  ) : (
                    <Typography
                      className="w-9 h-9 flex items-center justify-center text-sm text-black
                        bg-[#f1efff] rounded-full"
                    >
                      {uploadStatus === 'uploading' ? (
                        `${progress[index]}%`
                      ) : uploadStatus === 'done' ? (
                        <Check size={24} color="black" />
                      ) : null}
                    </Typography>
                  )}
                </div>
              </div>
            ))}
            <div className="w-full flex flex-col items-end">
              <Button
                className="font-medium text-black p-2.5 mt-4 cursor-pointer"
                onClick={handleUpload}
                disabled={loading}
              >
                {uploadStatus === 'select' ||
                uploadStatus === 'uploading'
                  ? 'Upload'
                  : 'Done'}
              </Button>
            </div>
          </ul>
        </div>
      )}
    </div>
  )
}

export default DragAndDropUpload
