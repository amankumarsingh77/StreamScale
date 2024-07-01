import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Typography from '@/components/ui/typography'
import { Pencil1Icon } from '@radix-ui/react-icons'
import React from 'react'

export default function page() {
  return (
    <div className="px-8 py-6 w-full">
      <div>
        <Typography variant={'h3'}>Profile</Typography>
        <Typography>Manage your profile</Typography>
      </div>
      <div className="my-4 border-b"></div>
      <div className="flex flex-col items-center">
        <div className="flex items-end">
          <Avatar className="w-16 h-16">
            <AvatarImage src="/avatar.png" alt="user" />
          </Avatar>
          <Pencil1Icon className="w-4 h-4 ml-1 mb-1 cursor-pointer" />
        </div>
        <div className="w-1/2 mt-2 flex flex-col gap-2 ">
          <div className="">
            <Label>fullname</Label>
            <Input type="text"></Input>
          </div>
          <div className="">
            <Label>username</Label>
            <Input type="text"></Input>
          </div>
          <div className="">
            <Label>email</Label>
            <Input
              type="text"
              disabled
              placeholder="aman@gmail.com"
            ></Input>
          </div>
          <Button className="text-black gap-4">Save</Button>
        </div>
      </div>
    </div>
  )
}
