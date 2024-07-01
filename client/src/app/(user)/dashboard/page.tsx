'use client'

import { instance } from '@/api/apiInstance'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  DataTableDemo,
  FileProps
} from '@/components/dashboard/DemoListing'
import DragAndDropUpload from '@/components/dashboard/DragAndDrop'
import Typography from '@/components/ui/typography'
import React, { useEffect, useState } from 'react'

export default function Page() {
  const [files, setFiles] = useState<FileProps[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const response = await instance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfiles`
      )
      if (response.status === 200) {
        setFiles(response.data.files)
      }
    }
    fetchData()
  }, [setFiles])
  return (
    <div className="flex flex-col w-full ">
      <ProtectedRoute>
        <Typography variant="h3" className="p-4 ">
          Dashboard
        </Typography>
        <div className="py-5">
          <DragAndDropUpload setUserFiles={setFiles} />
          <DataTableDemo
            files={files}
            setFiles={setFiles}
          />
        </div>
      </ProtectedRoute>
    </div>
  )
}
