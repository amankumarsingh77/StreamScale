'use client'

import React, { useEffect, useState } from 'react'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Typography from '@/components/ui/typography'
import { Pencil1Icon } from '@radix-ui/react-icons'
import { Tooltip } from '@nextui-org/tooltip'
import { VerifiedIcon } from 'lucide-react'
import { fetchUser } from '@/services/authService'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Textarea } from '@/components/ui/textarea'
import { instance } from '@/api/apiInstance'
import { toast } from '@/components/ui/use-toast'

interface UserProps {
  _id: string
  username: string
  email: string
  picture: string
  isAllowed: string
  fullname: string
  message: string
}

export default function Page() {
  const [userData, setUserData] =
    useState<UserProps | null>(null)

  const [formValues, setFormValues] = useState<
    Partial<UserProps>
  >({
    username: '',
    picture: '',
    fullname: '',
    message: ''
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const data = await fetchUser()
        setUserData(data.user)
        setFormValues({
          username: data.user.username,
          picture: data.user.picture,
          fullname: data.user.fullname,
          message: data.user.message
        })
      } catch (error) {
        setUserData(null)
      }
    }
    fetchUserProfile()
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormValues((prevState) => ({
      ...prevState,
      [name]: value
    }))
  }

  const updateHandler = async () => {
    setError(null)
    try {
      await instance.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/update`,
        formValues
      )
      setUserData((prevData) => {
        if (!prevData) return prevData
        return {
          ...prevData,
          ...formValues
        }
      })
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
    } catch (error: any) {
      setError(error.response.data.message)
    }
  }

  return (
    <ProtectedRoute>
      <div className="w-full px-8 py-6">
        <div>
          <Typography variant="h3">Settings</Typography>
          <Typography>
            Manage your profile and subscriptions
          </Typography>
        </div>
        <div className="my-4 border-b"></div>
        <div className="flex flex-col items-center w-full">
          <div className="text-center">
            <Typography variant="h4">
              User Profile
            </Typography>
            <Typography>
              Edit or view your profile
            </Typography>
          </div>
          <div className="flex items-end mt-10 relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src="/avatar.png" alt="User" />
            </Avatar>
            {userData?.isAllowed && (
              <Tooltip
                showArrow={true}
                key="success"
                color="success"
                content="Verified User"
              >
                <VerifiedIcon className="absolute top-0 right-0"></VerifiedIcon>
              </Tooltip>
            )}

            <Pencil1Icon className="w-4 h-4 ml-1 mb-1 cursor-pointer" />
          </div>
          <div className="flex flex-col sm:w-1/2 w-full mt-4 gap-2">
            <div>
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                name="fullname"
                type="text"
                defaultValue={userData?.fullname}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                defaultValue={userData?.username}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="text"
                disabled
                placeholder="aman@gmail.com"
              />
            </div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              name="message"
              defaultValue={userData?.message}
              onChange={handleInputChange}
            ></Textarea>
            {!userData?.isAllowed && (
              <Typography>
                Your account is not verified. You will not
                be able to upload videos.
              </Typography>
            )}
            {error && (
              <Typography className="text-red-500">
                {error}
              </Typography>
            )}
            <Button
              onClick={updateHandler}
              className="mt-4 text-black gap-4"
            >
              Update
            </Button>
          </div>
        </div>
        <div className="my-4 border-b"></div>
        <div>
          <Typography variant="h4">Subscription</Typography>
          <Typography>Manage your subscription</Typography>
          <div className="flex flex-col items-center w-full">
            <Typography className="mt-10" variant={'h3'}>
              Comming soon....
            </Typography>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
