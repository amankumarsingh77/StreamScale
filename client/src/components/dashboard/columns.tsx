'use client'
import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import {
  CaretSortIcon,
  DotsHorizontalIcon
} from '@radix-ui/react-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { instance } from '@/api/apiInstance'

type File = {
  _id: string
  name: string
  size: number
  status: 'queued' | 'transcoding' | 'done' | 'failed'
}

const handleDelete = async (
  fileId: string,
  toast: any,
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
) => {
  const response = await instance.delete(
    `${process.env.NEXT_PUBLIC_API_URL}/api/file/delete?fileId=${fileId}`
  )
  if (response.status === 200) {
    toast({
      title: 'File deleted',
      description: 'The file has been deleted successfully'
    })
    const updatedFilesResponse = await instance.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/file/getfiles`
    )
    if (updatedFilesResponse.status === 200) {
      setFiles(updatedFilesResponse.data.files)
    }
  }
}

export const columns = (
  toast: any,
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
): ColumnDef<File>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() &&
            'indeterminate')
        }
        onCheckedChange={(value) =>
          table.toggleAllPageRowsSelected(!!value)
        }
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) =>
          row.toggleSelected(!!value)
        }
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="outline"
          onClick={() =>
            column.toggleSorting(
              column.getIsSorted() === 'asc'
            )
          }
        >
          Name
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="capitalize">
        {row.getValue('name')}
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className="lowercase">
        {row.getValue('status')}
      </div>
    )
  },
  {
    accessorKey: 'size',
    header: () => <div className="text-right">Size</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium">{`${row.getValue('size')}M`}</div>
      )
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const file = row.original
      const isTranscoded = file.status === 'done'

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(file._id)
              }
            >
              Copy File ID
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isTranscoded}
              onClick={() =>
                window.open(
                  `/player?id=${file._id}`,
                  '_blank'
                )
              }
            >
              Play Video
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleDelete(file._id, toast, setFiles)
              }
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]
